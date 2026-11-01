import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import profile from './profiles/hospital.js';
import { DEFAULT_LEAVE_TYPES } from './defaultLeaveTypes.js';

const DEMO_PASSWORD = 'password123';
const YEAR = 2026;

async function seed() {
  const { orgName, departments: DEPARTMENTS, users: USERS, staffBalances: STAFF_BALANCES, requests: REQUESTS, deptHod, demoLogins } = profile;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgRes = await client.query(
      `INSERT INTO organisations (name, leave_year_start_month) VALUES ($1, $2) RETURNING id`,
      [orgName, 1]
    );
    const orgId = orgRes.rows[0].id;

    const deptIds = {};
    for (const name of DEPARTMENTS) {
      const r = await client.query(
        `INSERT INTO departments (org_id, name) VALUES ($1, $2) RETURNING id`,
        [orgId, name]
      );
      deptIds[name] = r.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userIds = {};
    for (const u of USERS) {
      const r = await client.query(
        `INSERT INTO users (org_id, department_id, name, email, password_hash, role, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [orgId, u.dept ? deptIds[u.dept] : null, u.name, u.email, passwordHash, u.role, u.title]
      );
      userIds[u.name] = r.rows[0].id;
    }

    for (const [dept, hodName] of Object.entries(deptHod)) {
      await client.query(`UPDATE departments SET hod_user_id = $1 WHERE id = $2`, [userIds[hodName], deptIds[dept]]);
    }

    const typeIds = {};
    let sortOrder = 0;
    for (const t of DEFAULT_LEAVE_TYPES) {
      const r = await client.query(
        `INSERT INTO leave_types (org_id, key, name, entitlement_days, approval_chain, active, emoji, color, tint, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [orgId, t.key, t.name, t.entitlement, t.chain, t.active, t.emoji, t.color, t.tint, sortOrder++]
      );
      typeIds[t.key] = r.rows[0].id;
    }

    // Balances: seed all leave types for all staff/hod/hr/principal users so every screen has data.
    for (const u of USERS) {
      const uid = userIds[u.name];
      for (const t of DEFAULT_LEAVE_TYPES) {
        const entitlement = t.entitlement ?? 0;
        let used = 0;
        const known = STAFF_BALANCES[u.name];
        if (known && known[t.key] !== undefined) {
          used = entitlement - known[t.key];
        }
        if (u.name === 'Efua Asante' && t.key === 'maternity') used = 60;
        await client.query(
          `INSERT INTO balances (org_id, user_id, leave_type_id, year, entitlement, used) VALUES ($1, $2, $3, $4, $5, $6)`,
          [orgId, uid, typeIds[t.key], YEAR, entitlement, used]
        );
      }
    }

    for (const req of REQUESTS) {
      const staffUser = USERS.find((u) => u.name === req.staff);
      const uid = userIds[req.staff];
      const typeId = typeIds[req.type];
      const typeDef = DEFAULT_LEAVE_TYPES.find((t) => t.key === req.type);
      const hodUserId = userIds[deptHod[staffUser.dept]];

      const reqRes = await client.query(
        `INSERT INTO leave_requests (org_id, user_id, leave_type_id, start_date, end_date, days, reason, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [orgId, uid, typeId, req.start, req.end, req.days, req.reason, req.status, `${req.submitted}T09:00:00Z`]
      );
      const reqId = reqRes.rows[0].id;

      if (req.status === 'declined') {
        await client.query(
          `INSERT INTO approvals (request_id, approver_id, step, decision, note) VALUES ($1, $2, 'hod', 'declined', $3)`,
          [reqId, hodUserId, 'Overlaps with exam invigilation schedule.']
        );
      } else if (req.status === 'pending_hr') {
        await client.query(
          `INSERT INTO approvals (request_id, approver_id, step, decision) VALUES ($1, $2, 'hod', 'approved')`,
          [reqId, hodUserId]
        );
      } else if (req.status === 'approved') {
        await client.query(
          `INSERT INTO approvals (request_id, approver_id, step, decision) VALUES ($1, $2, 'hod', 'approved')`,
          [reqId, hodUserId]
        );
        if (typeDef.chain === 'hod_only') {
          await client.query(
            `INSERT INTO approvals (request_id, approver_id, step, decision, note) VALUES ($1, $2, 'hr', 'approved', $3)`,
            [reqId, hodUserId, 'Auto-confirmed — HoD-only leave type']
          );
        } else {
          await client.query(
            `INSERT INTO approvals (request_id, approver_id, step, decision) VALUES ($1, $2, 'hr', 'approved')`,
            [reqId, userIds['Mary Kipo']]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Seed complete — ${orgName}.`);
    console.log(`Demo password for all seeded users: ${DEMO_PASSWORD}`);
    console.log('Demo logins:');
    for (const [role, email] of demoLogins) {
      console.log(`  ${role.padEnd(24)} ${email}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
