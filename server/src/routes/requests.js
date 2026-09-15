import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { inclusiveDays, initials } from '../lib/helpers.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notifyRequestSubmitted, notifyForwardedToHr, notifyAutoApproved, notifyDeclined, notifyFinalised } from '../lib/notifications.js';

const router = Router();

const BASE_SELECT = `
  SELECT r.id, r.org_id, r.start_date, r.end_date, r.days, r.reason, r.status, r.created_at,
         lt.id AS lt_id, lt.key AS type_key, lt.name AS type_name, lt.emoji AS type_emoji,
         lt.tint AS type_tint, lt.color AS type_color, lt.approval_chain, lt.entitlement_days,
         u.id AS staff_id, u.name AS staff_name, u.email AS staff_email,
         d.id AS dept_id, d.name AS dept_name, hod.name AS hod_name, hod.email AS hod_email,
         b.entitlement AS bal_entitlement, b.used AS bal_used
  FROM leave_requests r
  JOIN leave_types lt ON lt.id = r.leave_type_id
  JOIN users u ON u.id = r.user_id
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN users hod ON hod.id = d.hod_user_id
  LEFT JOIN balances b ON b.user_id = r.user_id AND b.leave_type_id = r.leave_type_id
    AND b.year = extract(year FROM r.start_date)::int
`;

function serializeRow(r) {
  const remaining = r.bal_entitlement != null ? r.bal_entitlement - r.bal_used : null;
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    days: r.days,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    submittedAt: r.created_at,
    staff: { id: r.staff_id, name: r.staff_name, initials: initials(r.staff_name) },
    department: r.dept_id ? { id: r.dept_id, name: r.dept_name, hodName: r.hod_name } : null,
    leaveType: {
      id: r.lt_id,
      key: r.type_key,
      name: r.type_name,
      emoji: r.type_emoji,
      tint: r.type_tint,
      color: r.type_color,
      approvalChain: r.approval_chain,
      entitlementDays: r.entitlement_days
    },
    balanceRemaining: remaining,
    balanceAfterDecision: remaining != null ? remaining - r.days : null
  };
}

function getLeaveYear(startDate) {
  const d = startDate instanceof Date ? startDate : new Date(startDate + 'T00:00:00Z');
  return d.getUTCFullYear();
}

/**
 * @openapi
 * /requests:
 *   get:
 *     tags: [Requests]
 *     summary: List leave requests
 *     description: >
 *       Scoped automatically by the caller's role: staff see only their own requests,
 *       HoDs see only their department's requests, and HR/principal see the whole organisation.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, pending, pending_hod, pending_hr, approved, declined] }
 *         description: "`pending` matches both `pending_hod` and `pending_hr`."
 *     responses:
 *       200:
 *         description: Matching requests, most recent first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests: { type: array, items: { $ref: '#/components/schemas/LeaveRequest' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req;
    const params = [user.org_id];
    let where = 'r.org_id = $1';

    if (user.role === 'staff') {
      params.push(user.id);
      where += ` AND r.user_id = $${params.length}`;
    } else if (user.role === 'hod') {
      params.push(user.department_id);
      where += ` AND d.id = $${params.length}`;
    }
    // hr and principal see the whole organisation

    const status = req.query.status;
    if (status === 'pending') {
      where += ` AND r.status IN ('pending_hod', 'pending_hr')`;
    } else if (status && status !== 'all') {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }

    const { rows } = await pool.query(`${BASE_SELECT} WHERE ${where} ORDER BY r.created_at DESC`, params);
    res.json({ requests: rows.map(serializeRow) });
  })
);

/**
 * @openapi
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Submit a new leave request
 *     description: Staff only. Creates the request with status `pending_hod` and validates it against the caller's remaining balance for that leave type.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaveTypeId, startDate, endDate, reason]
 *             properties:
 *               leaveTypeId: { type: integer, example: 1 }
 *               startDate: { type: string, format: date, example: '2026-08-24' }
 *               endDate: { type: string, format: date, example: '2026-08-28' }
 *               reason: { type: string, example: "Family travel to Tamale." }
 *     responses:
 *       201:
 *         description: Request created.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { request: { $ref: '#/components/schemas/LeaveRequest' } } }
 *       400: { description: Validation error (missing fields, invalid dates, or insufficient balance), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  '/',
  requireAuth,
  requireRole('staff'),
  asyncHandler(async (req, res) => {
    const { leaveTypeId, startDate, endDate, reason } = req.body || {};
    if (!leaveTypeId || !startDate || !endDate || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please choose your leave type, both dates, and add a reason.' });
    }

    const days = inclusiveDays(startDate, endDate);
    if (days <= 0) {
      return res.status(400).json({ error: 'Last day must be on or after the first day.' });
    }

    const { rows: typeRows } = await pool.query(
      `SELECT * FROM leave_types WHERE id = $1 AND org_id = $2 AND active = true`,
      [leaveTypeId, req.user.org_id]
    );
    const leaveType = typeRows[0];
    if (!leaveType) return res.status(400).json({ error: 'That leave type is not available.' });

    const { rows: overlapRows } = await pool.query(
      `SELECT r.start_date, r.end_date, lt.name AS type_name
       FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id
       WHERE r.user_id = $1 AND r.status IN ('pending_hod', 'pending_hr', 'approved')
         AND r.start_date <= $2 AND r.end_date >= $3`,
      [req.user.id, endDate, startDate]
    );
    if (overlapRows.length) {
      const o = overlapRows[0];
      const fmt = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
      return res.status(400).json({
        error: `You already have ${o.type_name.toLowerCase()} leave from ${fmt(o.start_date)} to ${fmt(o.end_date)} that overlaps with these dates.`
      });
    }

    const year = getLeaveYear(startDate);
    if (leaveType.entitlement_days !== null) {
      const { rows: balRows } = await pool.query(
        `SELECT entitlement, used FROM balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3`,
        [req.user.id, leaveType.id, year]
      );
      const bal = balRows[0];
      const remaining = bal ? bal.entitlement - bal.used : leaveType.entitlement_days;
      if (days > remaining) {
        return res.status(400).json({ error: `You only have ${remaining} day${remaining === 1 ? '' : 's'} of ${leaveType.name} leave remaining.` });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO leave_requests (org_id, user_id, leave_type_id, start_date, end_date, days, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_hod') RETURNING id`,
      [req.user.org_id, req.user.id, leaveType.id, startDate, endDate, days, reason.trim()]
    );

    const { rows: full } = await pool.query(`${BASE_SELECT} WHERE r.id = $1`, [rows[0].id]);
    notifyRequestSubmitted(full[0]);
    res.status(201).json({ request: serializeRow(full[0]) });
  })
);

async function loadRequestForUser(req, res) {
  const { rows } = await pool.query(`${BASE_SELECT} WHERE r.id = $1 AND r.org_id = $2`, [req.params.id, req.user.org_id]);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'Request not found.' });
    return null;
  }
  const { user } = req;
  const allowed =
    user.role === 'hr' ||
    user.role === 'principal' ||
    (user.role === 'staff' && row.staff_id === user.id) ||
    (user.role === 'hod' && row.dept_id === user.department_id);
  if (!allowed) {
    res.status(403).json({ error: 'You do not have permission to view this request.' });
    return null;
  }
  return row;
}

/**
 * @openapi
 * /requests/{id}:
 *   get:
 *     tags: [Requests]
 *     summary: Get a single request with its approval trail
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       200:
 *         description: The request and its approval history.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request: { $ref: '#/components/schemas/LeaveRequest' }
 *                 approvals: { type: array, items: { $ref: '#/components/schemas/Approval' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await loadRequestForUser(req, res);
    if (!row) return;

    const { rows: approvals } = await pool.query(
      `SELECT a.step, a.decision, a.note, a.decided_at, u.name AS approver_name
     FROM approvals a JOIN users u ON u.id = a.approver_id
     WHERE a.request_id = $1 ORDER BY a.decided_at ASC`,
      [row.id]
    );

    res.json({
      request: serializeRow(row),
      approvals: approvals.map((a) => ({
        step: a.step,
        decision: a.decision,
        note: a.note,
        decidedAt: a.decided_at,
        approverName: a.approver_name
      }))
    });
  })
);

/**
 * @openapi
 * /requests/{id}/approve:
 *   post:
 *     tags: [Requests]
 *     summary: Approve a request (HoD step)
 *     description: >
 *       HoD only, and only for a request in their own department with status `pending_hod`.
 *       For `hod_only` leave types (sick, casual) this immediately finalises the request as
 *       `approved` and deducts the balance; otherwise it moves to `pending_hr`.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       200:
 *         description: Decision recorded.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DecisionResult' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: The request has already been decided, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/:id/approve',
  requireAuth,
  requireRole('hod'),
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`${BASE_SELECT} WHERE r.id = $1 AND r.org_id = $2 FOR UPDATE OF r`, [req.params.id, req.user.org_id]);
      const row = rows[0];
      if (!row) throw { status: 404, message: 'Request not found.' };
      if (row.dept_id !== req.user.department_id) throw { status: 403, message: 'This request is outside your department.' };
      if (row.status !== 'pending_hod') throw { status: 409, message: 'This request has already been decided.' };

      await client.query(
        `INSERT INTO approvals (request_id, approver_id, step, decision) VALUES ($1, $2, 'hod', 'approved')`,
        [row.id, req.user.id]
      );

      let finalStatus = 'pending_hr';
      if (row.approval_chain === 'hod_only') {
        await client.query(
          `INSERT INTO approvals (request_id, approver_id, step, decision, note) VALUES ($1, $2, 'hr', 'approved', $3)`,
          [row.id, req.user.id, 'Auto-confirmed — HoD-only leave type']
        );
        await bumpBalance(client, row);
        finalStatus = 'approved';
      }

      await client.query(`UPDATE leave_requests SET status = $1 WHERE id = $2`, [finalStatus, row.id]);
      await client.query('COMMIT');
      if (finalStatus === 'approved') notifyAutoApproved(row);
      else notifyForwardedToHr(row);
      res.json({ status: finalStatus, staffFirstName: row.staff_name.split(' ')[0], typeName: row.type_name });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    } finally {
      client.release();
    }
  })
);

/**
 * @openapi
 * /requests/{id}/decline:
 *   post:
 *     tags: [Requests]
 *     summary: Decline a request (HoD step)
 *     description: HoD only, and only for a request in their own department with status `pending_hod`.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: { type: string, description: Optional reason shared internally. }
 *     responses:
 *       200:
 *         description: Decision recorded.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DecisionResult' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: The request has already been decided, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/:id/decline',
  requireAuth,
  requireRole('hod'),
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`${BASE_SELECT} WHERE r.id = $1 AND r.org_id = $2 FOR UPDATE OF r`, [req.params.id, req.user.org_id]);
      const row = rows[0];
      if (!row) throw { status: 404, message: 'Request not found.' };
      if (row.dept_id !== req.user.department_id) throw { status: 403, message: 'This request is outside your department.' };
      if (row.status !== 'pending_hod') throw { status: 409, message: 'This request has already been decided.' };

      await client.query(
        `INSERT INTO approvals (request_id, approver_id, step, decision, note) VALUES ($1, $2, 'hod', 'declined', $3)`,
        [row.id, req.user.id, (req.body && req.body.note) || '']
      );
      await client.query(`UPDATE leave_requests SET status = 'declined' WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      notifyDeclined(row, (req.body && req.body.note) || '');
      res.json({ status: 'declined', staffFirstName: row.staff_name.split(' ')[0], typeName: row.type_name });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    } finally {
      client.release();
    }
  })
);

/**
 * @openapi
 * /requests/{id}/finalise:
 *   post:
 *     tags: [Requests]
 *     summary: Finalise a request (HR step)
 *     description: HR only, and only for a request with status `pending_hr`. Marks it `approved` and deducts the staff member's balance.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       200:
 *         description: Request approved.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DecisionResult' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: The request is not awaiting HR confirmation, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/:id/finalise',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`${BASE_SELECT} WHERE r.id = $1 AND r.org_id = $2 FOR UPDATE OF r`, [req.params.id, req.user.org_id]);
      const row = rows[0];
      if (!row) throw { status: 404, message: 'Request not found.' };
      if (row.status !== 'pending_hr') throw { status: 409, message: 'This request is not awaiting HR confirmation.' };

      await client.query(
        `INSERT INTO approvals (request_id, approver_id, step, decision) VALUES ($1, $2, 'hr', 'approved')`,
        [row.id, req.user.id]
      );
      await bumpBalance(client, row);
      await client.query(`UPDATE leave_requests SET status = 'approved' WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      notifyFinalised(row);
      res.json({ status: 'approved', staffFirstName: row.staff_name.split(' ')[0], typeName: row.type_name });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    } finally {
      client.release();
    }
  })
);

async function bumpBalance(client, row) {
  const year = getLeaveYear(row.start_date);
  const { rowCount } = await client.query(
    `UPDATE balances SET used = used + $1 WHERE user_id = $2 AND leave_type_id = $3 AND year = $4`,
    [row.days, row.staff_id, row.lt_id, year]
  );
  if (!rowCount) {
    await client.query(
      `INSERT INTO balances (org_id, user_id, leave_type_id, year, entitlement, used)
       SELECT r.org_id, $2, $3, $4, COALESCE(lt.entitlement_days, 0), $1
       FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id WHERE r.id = $5`,
      [row.days, row.staff_id, row.lt_id, year, row.id]
    );
  }
}

export default router;
