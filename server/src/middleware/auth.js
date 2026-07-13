import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Not signed in.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT u.id, u.org_id, u.department_id, u.name, u.email, u.role, u.title, d.name AS department_name
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: 'Not signed in.' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired, please sign in again.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}
