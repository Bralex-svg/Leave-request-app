import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function serialize(o) {
  return { id: o.id, name: o.name, leaveYearStartMonth: MONTHS[o.leave_year_start_month - 1] };
}

/**
 * @openapi
 * /organisation:
 *   get:
 *     tags: [Organisation]
 *     summary: Get the signed-in user's organisation
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Organisation details.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { organisation: { $ref: '#/components/schemas/Organisation' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM organisations WHERE id = $1`, [req.user.org_id]);
    res.json({ organisation: serialize(rows[0]) });
  })
);

/**
 * @openapi
 * /organisation:
 *   patch:
 *     tags: [Organisation]
 *     summary: Update organisation name and/or leave year start month
 *     description: HR only. Powers the white-label "Organisation identity" card on Settings & branding.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               leaveYearStartMonth: { type: string, enum: [January, February, March, April, May, June, July, August, September, October, November, December] }
 *     responses:
 *       200:
 *         description: Updated organisation.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { organisation: { $ref: '#/components/schemas/Organisation' } } }
 *       400: { description: Nothing valid to update, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.patch(
  '/',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { name, leaveYearStartMonth } = req.body || {};
    const fields = [];
    const values = [];
    if (typeof name === 'string' && name.trim()) {
      values.push(name.trim());
      fields.push(`name = $${values.length}`);
    }
    if (typeof leaveYearStartMonth === 'string') {
      const idx = MONTHS.indexOf(leaveYearStartMonth);
      if (idx === -1) return res.status(400).json({ error: 'Unrecognised month.' });
      values.push(idx + 1);
      fields.push(`leave_year_start_month = $${values.length}`);
    }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
    values.push(req.user.org_id);
    const { rows } = await pool.query(`UPDATE organisations SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    res.json({ organisation: serialize(rows[0]) });
  })
);

export default router;
