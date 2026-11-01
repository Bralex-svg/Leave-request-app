import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { pool } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { serializeUser } from './lib/helpers.js';
import { asyncHandler } from './lib/asyncHandler.js';
import swaggerSpec from './swagger.js';

import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import balanceRoutes from './routes/balances.js';
import staffRoutes from './routes/staff.js';
import leaveTypeRoutes from './routes/leaveTypes.js';
import departmentRoutes from './routes/departments.js';
import organisationRoutes from './routes/organisation.js';
import insightsRoutes from './routes/insights.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'LeaveFlow API docs' }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);

/**
 * @openapi
 * /me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the signed-in user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: The current user.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
app.get(
  '/api/me',
  requireAuth,
  asyncHandler(async (req, res) => res.json({ user: serializeUser(req.user) }))
);

app.use('/api/requests', requestRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/organisation', organisationRoutes);
app.use('/api/insights', insightsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

const port = process.env.PORT || 4000;

pool
  .query('SELECT 1')
  .then(() => {
    app.listen(port, () => console.log(`LeaveFlow API listening on :${port}  (docs at /api/docs)`));
  })
  .catch((err) => {
    console.error('Could not connect to the database. Did you run `npm run setup`?', err.message);
    process.exit(1);
  });
