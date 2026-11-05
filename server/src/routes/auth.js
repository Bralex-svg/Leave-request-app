import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { pool } from '../db/pool.js';
import { serializeUser } from '../lib/helpers.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { DEFAULT_LEAVE_TYPES } from '../db/defaultLeaveTypes.js';
import { serialize as serializeOrganisation } from './organisation.js';
import { notifyPasswordReset } from '../lib/notifications.js';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const GENERIC_FORGOT_MESSAGE = "If an account exists for that email, we've sent a reset link.";

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

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
 *               email: { type: string, format: email, example: afia.owusu@stannes.health }
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
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new organisation and its first HR admin account
 *     description: >
 *       Public — anyone can create a new organisation this way. Seeds the organisation
 *       with the default leave-type catalog and signs the new HR admin in immediately
 *       (sets the same session cookie as /auth/login).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orgName, adminName, adminEmail, adminPassword]
 *             properties:
 *               orgName: { type: string, example: Saint Anne's Hospital }
 *               adminName: { type: string, example: Mary Kipo }
 *               adminEmail: { type: string, format: email }
 *               adminPassword: { type: string, format: password, description: Minimum 8 characters. }
 *     responses:
 *       201:
 *         description: Organisation and admin account created. Sets an httpOnly `token` cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 organisation: { $ref: '#/components/schemas/Organisation' }
 *       400: { description: Missing/invalid field, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: An account already exists for that email, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { orgName, adminName, adminEmail, adminPassword } = req.body || {};
    if (!orgName || !orgName.trim()) {
      return res.status(400).json({ error: 'Enter your organisation name.' });
    }
    if (!adminName || !adminName.trim()) {
      return res.status(400).json({ error: 'Enter your name.' });
    }
    if (!adminEmail || !adminEmail.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!adminPassword || adminPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const { rows: existing } = await pool.query(`SELECT 1 FROM users WHERE lower(email) = lower($1)`, [adminEmail.trim()]);
    if (existing.length) {
      return res.status(409).json({ error: 'That email already has a LeaveFlow account — each email can only be registered once, across every organisation on the platform. Sign in instead, or use a different email to create a new organisation.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orgRes = await client.query(
        `INSERT INTO organisations (name, leave_year_start_month) VALUES ($1, $2) RETURNING *`,
        [orgName.trim(), 1]
      );
      const org = orgRes.rows[0];

      let sortOrder = 0;
      for (const t of DEFAULT_LEAVE_TYPES) {
        await client.query(
          `INSERT INTO leave_types (org_id, key, name, entitlement_days, approval_chain, active, emoji, color, tint, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [org.id, t.key, t.name, t.entitlement, t.chain, t.active, t.emoji, t.color, t.tint, sortOrder++]
        );
      }

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userRes = await client.query(
        `INSERT INTO users (org_id, name, email, password_hash, role, title)
         VALUES ($1, $2, $3, $4, 'hr', $5) RETURNING *`,
        [org.id, adminName.trim(), adminEmail.trim(), passwordHash, 'HR & Admin']
      );
      const user = userRes.rows[0];

      await client.query('COMMIT');

      const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, COOKIE_OPTS);
      res.status(201).json({ user: serializeUser(user), organisation: serializeOrganisation(org) });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'That email already has a LeaveFlow account — each email can only be registered once, across every organisation on the platform. Sign in instead, or use a different email to create a new organisation.' });
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     description: >
 *       Always responds the same way whether or not the email matches an account,
 *       so the response can't be used to probe which emails are registered.
 *       If it does match, emails a reset link valid for 1 hour (also logged to the
 *       console if RESEND_API_KEY isn't configured — see server/src/lib/mailer.js).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [email], properties: { email: { type: string, format: email } } }
 *     responses:
 *       200:
 *         description: Always returned, regardless of whether the email matched an account.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { ok: { type: boolean }, message: { type: string } } }
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (email && email.includes('@')) {
      const { rows } = await pool.query(`SELECT id, name, email FROM users WHERE lower(email) = lower($1)`, [email.trim()]);
      const user = rows[0];
      if (user) {
        await pool.query(`DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL`, [user.id]);
        const token = randomBytes(32).toString('hex');
        await pool.query(
          `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
          [user.id, hashToken(token)]
        );
        notifyPasswordReset({ email: user.email, name: user.name, resetUrl: `${APP_URL}/reset-password?token=${token}` });
      }
    }
    res.json({ ok: true, message: GENERIC_FORGOT_MESSAGE });
  })
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, description: The token from the reset link. }
 *               password: { type: string, format: password, description: Minimum 8 characters. }
 *     responses:
 *       200:
 *         description: Password updated.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { ok: { type: boolean } } }
 *       400: { description: Missing/invalid password, or the token is invalid/expired/already used, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing reset token.' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const { rows } = await pool.query(
      `SELECT * FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)]
    );
    const reset = rows[0];
    if (!reset) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, reset.user_id]);
      await client.query(`UPDATE password_resets SET used_at = now() WHERE id = $1`, [reset.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
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
