import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { initials, generateTempPassword, serializeUser } from '../lib/helpers.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notifyStaffWelcome } from '../lib/notifications.js';

const router = Router();

const ROLES = ['staff', 'hod', 'hr', 'principal'];

async function createStaffMember(client, { orgId, name, email, role, title, departmentId, balanceOverrides }) {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const { rows: userRows } = await client.query(
    `INSERT INTO users (org_id, department_id, name, email, password_hash, role, title)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *, (SELECT name FROM departments WHERE id = department_id) AS department_name`,
    [orgId, departmentId ?? null, name, email, passwordHash, role, title || '']
  );
  const user = userRows[0];

  const { rows: leaveTypes } = await client.query(
    `SELECT id, key, entitlement_days FROM leave_types WHERE org_id = $1 AND active = true`,
    [orgId]
  );
  const overrideByKey = {};
  for (const o of balanceOverrides || []) {
    if (o && o.leaveTypeKey) overrideByKey[o.leaveTypeKey] = o.entitlement;
  }
  const year = new Date().getFullYear();
  for (const t of leaveTypes) {
    const entitlement = overrideByKey[t.key] ?? t.entitlement_days ?? 0;
    await client.query(
      `INSERT INTO balances (org_id, user_id, leave_type_id, year, entitlement, used) VALUES ($1, $2, $3, $4, $5, 0)`,
      [orgId, user.id, t.id, year, entitlement]
    );
  }

  return { user, tempPassword };
}

/**
 * @openapi
 * /staff/balances:
 *   get:
 *     tags: [Staff]
 *     summary: Get every staff member's annual/sick/casual/study balances
 *     description: HR only.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Leave year. Defaults to the current calendar year.
 *     responses:
 *       200:
 *         description: One row per staff member.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 staff: { type: array, items: { $ref: '#/components/schemas/StaffBalanceRow' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  '/balances',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { rows: users } = await pool.query(
      `SELECT u.id, u.name, d.name AS dept_name FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.org_id = $1 AND u.role = 'staff' ORDER BY u.name`,
      [req.user.org_id]
    );
    const { rows: bals } = await pool.query(
      `SELECT b.user_id, lt.key, b.entitlement, b.used FROM balances b
     JOIN leave_types lt ON lt.id = b.leave_type_id
     WHERE b.year = $1 AND lt.key IN ('annual', 'sick', 'casual', 'study')
       AND b.user_id IN (SELECT id FROM users WHERE org_id = $2 AND role = 'staff')`,
      [year, req.user.org_id]
    );
    const byUser = {};
    for (const b of bals) {
      byUser[b.user_id] = byUser[b.user_id] || {};
      byUser[b.user_id][b.key] = `${b.entitlement - b.used} / ${b.entitlement}`;
    }
    res.json({
      staff: users.map((u) => ({
        id: u.id,
        name: u.name,
        initials: initials(u.name),
        department: u.dept_name,
        annual: byUser[u.id]?.annual ?? '—',
        sick: byUser[u.id]?.sick ?? '—',
        casual: byUser[u.id]?.casual ?? '—',
        study: byUser[u.id]?.study ?? '—'
      }))
    });
  })
);

/**
 * @openapi
 * /staff/away:
 *   get:
 *     tags: [Staff]
 *     summary: Colleagues currently away or away within the next 7 days
 *     description: >
 *       Backs the "Who's away this week" card, and excludes the caller's own leave.
 *       Scoped to the caller's own department for `staff` and `hod` (their day-to-day
 *       colleagues); organisation-wide for `hr` and `principal`, who have institution-wide
 *       oversight — for those two roles each entry also includes the person's department.
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Soonest-starting first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 away:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       initials: { type: string }
 *                       department: { type: string, nullable: true, description: Only populated for org-wide (HR/Principal) views. }
 *                       startingSoon: { type: boolean, description: True if their leave hasn't started yet (starts within the next 7 days). }
 *                       detail: { type: string, example: "Sick · back 14 Jul", description: "For upcoming leave this reads \"from {date} · back {date}\" instead, so it's never mistaken for someone already away." }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/away',
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = [req.user.org_id, req.user.id];
    let where = `u.org_id = $1 AND u.id != $2 AND r.status = 'approved'
       AND r.start_date <= (CURRENT_DATE + INTERVAL '7 days') AND r.end_date >= CURRENT_DATE`;

    const deptScoped = req.user.role === 'staff' || req.user.role === 'hod';
    if (deptScoped) {
      params.push(req.user.department_id);
      where += ` AND u.department_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT u.name, d.name AS dept_name, lt.name AS type_name, r.start_date, r.end_date,
              (r.start_date > CURRENT_DATE) AS starting_soon
     FROM leave_requests r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN departments d ON d.id = u.department_id
     JOIN leave_types lt ON lt.id = r.leave_type_id
     WHERE ${where}
     ORDER BY r.start_date ASC LIMIT ${deptScoped ? 6 : 10}`,
      params
    );
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    res.json({
      away: rows.map((r) => ({
        name: r.name,
        initials: initials(r.name),
        department: deptScoped ? null : r.dept_name,
        startingSoon: r.starting_soon,
        detail: r.starting_soon
          ? `${r.type_name} · from ${fmt(r.start_date)}, back ${fmt(r.end_date)}`
          : `${r.type_name} · back ${fmt(r.end_date)}`
      }))
    });
  })
);

/**
 * @openapi
 * /staff:
 *   post:
 *     tags: [Staff]
 *     summary: Add a staff member
 *     description: >
 *       HR only. Generates a temporary password, creates a balance row for every active
 *       leave type (current calendar year), and emails the new staff member their credentials
 *       (the temp password is also returned in the response, since email delivery may not be
 *       configured — see server/src/lib/mailer.js).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [staff, hod, hr, principal], default: staff }
 *               title: { type: string }
 *               departmentId: { type: integer, nullable: true }
 *               balanceOverrides:
 *                 type: array
 *                 items: { type: object, properties: { leaveTypeKey: { type: string }, entitlement: { type: integer } } }
 *     responses:
 *       201:
 *         description: Created.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { user: { $ref: '#/components/schemas/User' }, tempPassword: { type: string } } }
 *       400: { description: Missing/invalid field, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: An account already exists for that email, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { name, email, role = 'staff', title, departmentId, balanceOverrides } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a name.' });
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });

    if (departmentId != null) {
      const { rows } = await pool.query(`SELECT 1 FROM departments WHERE id = $1 AND org_id = $2`, [departmentId, req.user.org_id]);
      if (!rows.length) return res.status(400).json({ error: 'That department does not belong to your organisation.' });
    }

    const { rows: existing } = await pool.query(`SELECT 1 FROM users WHERE lower(email) = lower($1)`, [email.trim()]);
    if (existing.length) {
      return res.status(409).json({
        error: 'That email already has a LeaveFlow account — each email can only be registered once, across every organisation on the platform. Use a different email, or check whether this person already has access.'
      });
    }

    const client = await pool.connect();
    let user, tempPassword;
    try {
      await client.query('BEGIN');
      ({ user, tempPassword } = await createStaffMember(client, {
        orgId: req.user.org_id,
        name: name.trim(),
        email: email.trim(),
        role,
        title,
        departmentId: departmentId ?? null,
        balanceOverrides
      }));
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'That email already has a LeaveFlow account — each email can only be registered once, across every organisation on the platform. Use a different email, or check whether this person already has access.'
        });
      }
      throw err;
    } finally {
      client.release();
    }

    const { rows: orgRows } = await pool.query(`SELECT name FROM organisations WHERE id = $1`, [req.user.org_id]);
    notifyStaffWelcome({ email: user.email, name: user.name, orgName: orgRows[0]?.name ?? 'LeaveFlow', tempPassword });

    res.status(201).json({ user: serializeUser(user), tempPassword });
  })
);

/**
 * @openapi
 * /staff/bulk:
 *   post:
 *     tags: [Staff]
 *     summary: Add many staff members at once (CSV import)
 *     description: >
 *       HR only. Each row is validated and created independently — a bad row doesn't block
 *       the others. `department` is matched by name against the organisation's existing
 *       departments (create the department first via POST /departments).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rows]
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, email]
 *                   properties:
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, enum: [staff, hod, hr, principal] }
 *                     title: { type: string }
 *                     department: { type: string }
 *     responses:
 *       200:
 *         description: Every row's outcome — check `errors` for anything that needs fixing and re-submitting.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties: { row: { type: integer }, id: { type: integer }, name: { type: string }, email: { type: string }, role: { type: string }, tempPassword: { type: string } }
 *                 errors:
 *                   type: array
 *                   items: { type: object, properties: { row: { type: integer }, email: { type: string }, message: { type: string } } }
 *       400: { description: rows is missing or empty, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  '/bulk',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'No rows to import.' });
    }

    const { rows: depts } = await pool.query(`SELECT id, name FROM departments WHERE org_id = $1`, [req.user.org_id]);
    const deptIdByName = {};
    for (const d of depts) deptIdByName[d.name.toLowerCase()] = d.id;

    const { rows: orgRows } = await pool.query(`SELECT name FROM organisations WHERE id = $1`, [req.user.org_id]);
    const orgName = orgRows[0]?.name ?? 'LeaveFlow';

    const created = [];
    const errors = [];
    const seenEmails = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const r = rows[i] || {};
      const name = (r.name || '').trim();
      const email = (r.email || '').trim();
      const role = (r.role || 'staff').trim() || 'staff';
      const deptName = (r.department || '').trim();

      if (!name || !email) {
        errors.push({ row: rowNum, email, message: 'name and email are required.' });
        continue;
      }
      if (!email.includes('@')) {
        errors.push({ row: rowNum, email, message: 'not a valid email address.' });
        continue;
      }
      if (seenEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, email, message: 'duplicate email within this file.' });
        continue;
      }
      if (!ROLES.includes(role)) {
        errors.push({ row: rowNum, email, message: `unrecognised role "${role}".` });
        continue;
      }
      let departmentId = null;
      if (deptName) {
        departmentId = deptIdByName[deptName.toLowerCase()];
        if (!departmentId) {
          errors.push({ row: rowNum, email, message: `unknown department "${deptName}" — create it first in the Departments step.` });
          continue;
        }
      }
      const { rows: existing } = await pool.query(`SELECT 1 FROM users WHERE lower(email) = lower($1)`, [email]);
      if (existing.length) {
        errors.push({ row: rowNum, email, message: 'already has a LeaveFlow account (emails can only be registered once, platform-wide).' });
        continue;
      }

      seenEmails.add(email.toLowerCase());

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { user, tempPassword } = await createStaffMember(client, {
          orgId: req.user.org_id,
          name,
          email,
          role,
          title: r.title,
          departmentId,
          balanceOverrides: null
        });
        await client.query('COMMIT');
        created.push({ row: rowNum, id: user.id, name: user.name, email: user.email, role: user.role, tempPassword });
        notifyStaffWelcome({ email: user.email, name: user.name, orgName, tempPassword });
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
          errors.push({ row: rowNum, email, message: 'already has a LeaveFlow account (emails can only be registered once, platform-wide).' });
        } else {
          errors.push({ row: rowNum, email, message: 'unexpected error creating this row.' });
        }
      } finally {
        client.release();
      }
    }

    res.json({ created, errors });
  })
);

export default router;
