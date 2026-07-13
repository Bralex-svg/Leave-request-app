import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

function serialize(t) {
  return {
    id: t.id,
    key: t.key,
    name: t.name,
    entitlementDays: t.entitlement_days,
    approvalChain: t.approval_chain,
    active: t.active,
    emoji: t.emoji,
    color: t.color,
    tint: t.tint
  };
}

/**
 * @openapi
 * /leave-types:
 *   get:
 *     tags: [Leave types]
 *     summary: List leave types
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Pass `false` to include inactive types too (used by the HR settings screen). Defaults to active-only.
 *     responses:
 *       200:
 *         description: Leave types for the caller's organisation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leaveTypes: { type: array, items: { $ref: '#/components/schemas/LeaveType' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active !== 'false';
    const { rows } = await pool.query(
      `SELECT * FROM leave_types WHERE org_id = $1 ${activeOnly ? 'AND active = true' : ''} ORDER BY sort_order`,
      [req.user.org_id]
    );
    res.json({ leaveTypes: rows.map(serialize) });
  })
);

/**
 * @openapi
 * /leave-types/{id}:
 *   patch:
 *     tags: [Leave types]
 *     summary: Activate or deactivate a leave type
 *     description: HR only. Used by the leave policy toggle on the Settings & branding screen.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated leave type.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { leaveType: { $ref: '#/components/schemas/LeaveType' } } }
 *       400: { description: "`active` was not a boolean", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { active } = req.body || {};
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be true or false.' });
    const { rows } = await pool.query(
      `UPDATE leave_types SET active = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [active, req.params.id, req.user.org_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Leave type not found.' });
    res.json({ leaveType: serialize(rows[0]) });
  })
);

export default router;
