import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { serializeUser } from '../lib/helpers.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 1000 * 60 * 60 * 24 * 7
};

const ROLE_LABELS = {
  staff: 'Staff member',
  hod: 'Head of Dept.',
  hr: 'HR / Admin',
  principal: 'Principal'
};

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with email and password
 *     description: >
 *       The `role` field is only a UX affordance from the login screen's role card —
 *       the server always derives the account's real role from the database and
 *       rejects the request with 401 if it doesn't match the selected card.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: afia.owusu@dnmc.edu.gh }
 *               password: { type: string, format: password, example: password123 }
 *               role: { type: string, enum: [staff, hod, hr, principal], description: Selected role card (optional, UX only) }
 *     responses:
 *       200:
 *         description: Signed in. Sets an httpOnly `token` cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Missing or malformed email/password, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: No account, wrong password, or account is registered under a different role, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body || {};
    if (!email || !password || !email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email and password.' });
    }

    const { rows } = await pool.query(
      `SELECT u.*, d.name AS department_name FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE lower(u.email) = lower($1)`,
      [email.trim()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'No account found for that email.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // The role card on the login screen is a UX affordance only — the server
    // always derives the real role from the account and rejects a mismatch.
    if (role && role !== user.role) {
      const actualLabel = ROLE_LABELS[user.role] || user.role;
      return res.status(401).json({
        error: `This account is registered as "${actualLabel}". Select that role above and sign in again.`,
        actualRole: user.role
      });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: serializeUser(user) });
  })
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out and clear the session cookie
 *     responses:
 *       200:
 *         description: Signed out.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { ok: { type: boolean } } }
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true' });
  res.json({ ok: true });
});

export default router;
