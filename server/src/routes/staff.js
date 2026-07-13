import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { initials } from '../lib/helpers.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

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

export default router;
