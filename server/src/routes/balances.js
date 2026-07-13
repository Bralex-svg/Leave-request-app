import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /balances:
 *   get:
 *     tags: [Balances]
 *     summary: Get the signed-in user's own leave balances
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Leave year. Defaults to the current calendar year.
 *     responses:
 *       200:
 *         description: Balances for each active leave type.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balances: { type: array, items: { $ref: '#/components/schemas/Balance' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { rows } = await pool.query(
      `SELECT b.entitlement, b.used, lt.key, lt.name, lt.emoji, lt.color, lt.tint
     FROM balances b JOIN leave_types lt ON lt.id = b.leave_type_id
     WHERE b.user_id = $1 AND b.year = $2 AND lt.active = true
     ORDER BY lt.sort_order`,
      [req.user.id, year]
    );
    res.json({
      balances: rows.map((r) => ({
        key: r.key,
        name: r.name,
        emoji: r.emoji,
        color: r.color,
        tint: r.tint,
        entitlement: r.entitlement,
        used: r.used,
        remaining: r.entitlement - r.used
      }))
    });
  })
);

export default router;
