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
 *     summary: Update a leave type's policy
 *     description: >
 *       HR only. Used by the leave policy panel on the Settings & branding screen to toggle a
 *       type active/inactive and/or change its yearly entitlement. Changing `entitlementDays`
 *       also updates the entitlement on every staff member's balance for the current leave year
 *       (balances for future years pick up the new default automatically when first created).
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
 *             properties:
 *               active: { type: boolean }
 *               entitlementDays: { type: integer, nullable: true, description: "Days per year, or null for case-by-case." }
 *     responses:
 *       200:
 *         description: Updated leave type.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { leaveType: { $ref: '#/components/schemas/LeaveType' } } }
 *       400: { description: Neither field was provided, or a field was invalid, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { active, entitlementDays } = req.body || {};
    if (active === undefined && entitlementDays === undefined) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }
    if (active !== undefined && typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be true or false.' });
    }
    if (entitlementDays !== undefined && entitlementDays !== null && (!Number.isInteger(entitlementDays) || entitlementDays < 0)) {
      return res.status(400).json({ error: 'entitlementDays must be a non-negative whole number, or null for case-by-case.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query(
        `SELECT * FROM leave_types WHERE id = $1 AND org_id = $2 FOR UPDATE`,
        [req.params.id, req.user.org_id]
      );
      if (!existing.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Leave type not found.' });
      }
      const current = existing[0];
      const nextActive = active !== undefined ? active : current.active;
      const nextEntitlement = entitlementDays !== undefined ? entitlementDays : current.entitlement_days;

      const { rows } = await client.query(
        `UPDATE leave_types SET active = $1, entitlement_days = $2 WHERE id = $3 RETURNING *`,
        [nextActive, nextEntitlement, current.id]
      );

      if (entitlementDays !== undefined && entitlementDays !== current.entitlement_days) {
        await client.query(
          `UPDATE balances SET entitlement = $1 WHERE leave_type_id = $2 AND year = extract(year FROM now())::int`,
          [nextEntitlement ?? 0, current.id]
        );
      }

      await client.query('COMMIT');
      res.json({ leaveType: serialize(rows[0]) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

export default router;
