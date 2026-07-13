import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * @openapi
 * /insights:
 *   get:
 *     tags: [Insights]
 *     summary: Institution-wide leave analytics
 *     description: Principal and HR only. Powers the Insights dashboard (stat cards, monthly bar chart, department breakdown, coverage alert).
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Leave year. Defaults to the current calendar year.
 *     responses:
 *       200:
 *         description: Aggregated analytics.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Insights' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  '/',
  requireAuth,
  requireRole('principal', 'hr'),
  asyncHandler(async (req, res) => {
  const orgId = req.user.org_id;
  const year = Number(req.query.year) || new Date().getFullYear();

  const [{ rows: totalStaffRows }, { rows: onLeaveRows }, { rows: pendingRows }, { rows: yearDaysRows }, { rows: avgRows }, { rows: monthRows }, { rows: deptRows }] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM users WHERE org_id = $1 AND role = 'staff'`, [orgId]),
    pool.query(
      `SELECT count(*)::int AS n FROM leave_requests WHERE org_id = $1 AND status = 'approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`,
      [orgId]
    ),
    pool.query(
      `SELECT count(*)::int AS n, min(created_at) AS oldest FROM leave_requests WHERE org_id = $1 AND status IN ('pending_hod', 'pending_hr')`,
      [orgId]
    ),
    pool.query(
      `SELECT COALESCE(sum(days), 0)::int AS n FROM leave_requests WHERE org_id = $1 AND status = 'approved' AND extract(year FROM start_date) = $2`,
      [orgId, year]
    ),
    pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (a.decided_at - r.created_at)) / 86400) AS days
       FROM leave_requests r
       JOIN approvals a ON a.request_id = r.id
       WHERE r.org_id = $1 AND r.status IN ('approved', 'declined')
         AND a.decided_at = (SELECT max(a2.decided_at) FROM approvals a2 WHERE a2.request_id = r.id)`,
      [orgId]
    ),
    pool.query(
      `SELECT extract(month FROM start_date)::int AS month, COALESCE(sum(days), 0)::int AS total
       FROM leave_requests WHERE org_id = $1 AND status = 'approved' AND extract(year FROM start_date) = $2
       GROUP BY month`,
      [orgId, year]
    ),
    pool.query(
      `SELECT d.name, COALESCE(sum(r.days), 0)::int AS total
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id
       LEFT JOIN leave_requests r ON r.user_id = u.id AND r.status = 'approved' AND extract(year FROM r.start_date) = $2
       WHERE d.org_id = $1
       GROUP BY d.name ORDER BY total DESC`,
      [orgId, year]
    )
  ]);

  const totalStaff = totalStaffRows[0].n;
  const onLeaveToday = onLeaveRows[0].n;
  const pendingCount = pendingRows[0].n;
  const oldestDays = pendingRows[0].oldest ? Math.max(0, Math.round((Date.now() - new Date(pendingRows[0].oldest)) / 86400000)) : 0;
  const yearDays = yearDaysRows[0].n;
  const avgApprovalDays = avgRows[0].days ? Number(avgRows[0].days).toFixed(1) : '0';

  const byMonth = {};
  for (const r of monthRows) byMonth[r.month] = r.total;
  const maxMonth = Math.max(1, ...Object.values(byMonth));
  const currentMonth = new Date().getMonth() + 1;
  const monthBars = MONTHS.map((label, i) => {
    const value = byMonth[i + 1] || 0;
    return { label, value, pct: value ? Math.round((value / maxMonth) * 82) + 8 : 4, current: i + 1 === currentMonth };
  });

  const maxDept = Math.max(1, ...deptRows.map((d) => d.total));
  const deptBars = deptRows.map((d) => ({ name: d.name, value: d.total, pct: Math.round((d.total / maxDept) * 100) }));

  const { rows: overlapRows } = await pool.query(
    `SELECT d.name AS dept_name, count(DISTINCT r.user_id)::int AS n, min(r.start_date) AS from_date
     FROM leave_requests r
     JOIN users u ON u.id = r.user_id
     JOIN departments d ON d.id = u.department_id
     WHERE r.org_id = $1 AND r.status = 'approved' AND r.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
     GROUP BY d.name HAVING count(DISTINCT r.user_id) >= 2
     ORDER BY n DESC LIMIT 1`,
    [orgId]
  );
  const alert = overlapRows[0]
    ? `${overlapRows[0].n} staff in ${overlapRows[0].dept_name} will be on leave during the week of ${new Date(overlapRows[0].from_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Consider staggering approvals.`
    : 'No overlapping leave risks detected in the next 45 days.';

  res.json({
    statCards: [
      { label: 'Staff on leave today', value: String(onLeaveToday), delta: `of ${totalStaff} staff · ${totalStaff ? Math.round((onLeaveToday / totalStaff) * 1000) / 10 : 0}%` },
      { label: 'Pending approvals', value: String(pendingCount), delta: pendingCount ? `oldest waiting ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : 'all caught up' },
      { label: 'Days taken this year', value: String(yearDays), delta: `leave year ${year}` },
      { label: 'Avg. approval time', value: `${avgApprovalDays}d`, delta: 'submission to final decision' }
    ],
    monthBars,
    deptBars,
    coverageAlert: alert
  });
  })
);

export default router;
