import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

function serialize(d) {
  return { id: d.id, name: d.name, hodUserId: d.hod_user_id, hodName: d.hod_name ?? null };
}

/**
 * @openapi
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: List the caller's organisation's departments
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Departments for the caller's organisation.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { departments: { type: array, items: { $ref: '#/components/schemas/Department' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT d.*, u.name AS hod_name FROM departments d
       LEFT JOIN users u ON u.id = d.hod_user_id
       WHERE d.org_id = $1 ORDER BY d.name`,
      [req.user.org_id]
    );
    res.json({ departments: rows.map(serialize) });
  })
);

/**
 * @openapi
 * /departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create a department
 *     description: HR only.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name], properties: { name: { type: string } } }
 *     responses:
 *       201:
 *         description: Created.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { department: { $ref: '#/components/schemas/Department' } } }
 *       400: { description: Missing name, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: A department with that name already exists, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Enter a department name.' });
    }

    const { rows: existing } = await pool.query(
      `SELECT 1 FROM departments WHERE org_id = $1 AND lower(name) = lower($2)`,
      [req.user.org_id, name.trim()]
    );
    if (existing.length) {
      return res.status(409).json({ error: `A department named "${name.trim()}" already exists.` });
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO departments (org_id, name) VALUES ($1, $2) RETURNING *`,
        [req.user.org_id, name.trim()]
      );
      res.status(201).json({ department: serialize(rows[0]) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `A department named "${name.trim()}" already exists.` });
      }
      throw err;
    }
  })
);

/**
 * @openapi
 * /departments/{id}:
 *   patch:
 *     tags: [Departments]
 *     summary: Rename a department and/or set its head of department
 *     description: HR only.
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
 *               name: { type: string }
 *               hodUserId: { type: integer, nullable: true, description: Must be a user with the hod role in the same organisation, or null to clear. }
 *     responses:
 *       200:
 *         description: Updated.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { department: { $ref: '#/components/schemas/Department' } } }
 *       400: { description: Nothing to update, or hodUserId isn't a valid HoD in this org, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: A department with that name already exists, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { name, hodUserId } = req.body || {};
    if (name === undefined && hodUserId === undefined) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query(
        `SELECT * FROM departments WHERE id = $1 AND org_id = $2 FOR UPDATE`,
        [req.params.id, req.user.org_id]
      );
      if (!existing.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Department not found.' });
      }
      const current = existing[0];

      let nextName = current.name;
      if (name !== undefined) {
        if (!name.trim()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Department name cannot be empty.' });
        }
        nextName = name.trim();
      }

      let nextHodUserId = current.hod_user_id;
      if (hodUserId !== undefined) {
        if (hodUserId === null) {
          nextHodUserId = null;
        } else {
          const { rows: hodRows } = await client.query(
            `SELECT 1 FROM users WHERE id = $1 AND org_id = $2 AND role = 'hod'`,
            [hodUserId, req.user.org_id]
          );
          if (!hodRows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Head of department must be a user with the HoD role in this organisation.' });
          }
          nextHodUserId = hodUserId;
        }
      }

      const { rows } = await client.query(
        `UPDATE departments SET name = $1, hod_user_id = $2 WHERE id = $3 RETURNING *`,
        [nextName, nextHodUserId, current.id]
      );
      await client.query('COMMIT');

      const { rows: withHod } = await pool.query(
        `SELECT d.*, u.name AS hod_name FROM departments d LEFT JOIN users u ON u.id = d.hod_user_id WHERE d.id = $1`,
        [rows[0].id]
      );
      res.json({ department: serialize(withHod[0]) });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: `A department named "${name?.trim()}" already exists.` });
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

export default router;
