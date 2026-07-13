import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const DEMO_PASSWORD = 'password123';
const YEAR = 2026;

const LEAVE_TYPES = [
  { key: 'annual', name: 'Annual', emoji: '🌴', tint: '#E2F0E9', color: '#1F5C4D', entitlement: 30, chain: 'hod_then_hr', active: true },
  { key: 'sick', name: 'Sick', emoji: '🩺', tint: '#FAE5E1', color: '#B0563F', entitlement: 15, chain: 'hod_only', active: true },
  { key: 'casual', name: 'Casual', emoji: '☕', tint: '#FFF3D6', color: '#C9A227', entitlement: 7, chain: 'hod_only', active: true },
  { key: 'study', name: 'Study', emoji: '📚', tint: '#E3EEFA', color: '#2B5C8A', entitlement: 20, chain: 'hod_then_hr', active: true },
  { key: 'maternity', name: 'Maternity', emoji: '👶', tint: '#F3E5F5', color: '#8E44AD', entitlement: 90, chain: 'hod_then_hr', active: true },
  { key: 'paternity', name: 'Paternity', emoji: '👨‍👧', tint: '#E3EEFA', color: '#2B5C8A', entitlement: 10, chain: 'hod_then_hr', active: true },
  { key: 'compassionate', name: 'Compassionate', emoji: '🕊️', tint: '#EFEDE6', color: '#4A554F', entitlement: 5, chain: 'hod_then_hr', active: true },
  { key: 'unpaid', name: 'Unpaid', emoji: '⏸️', tint: '#EFEDE6', color: '#4A554F', entitlement: null, chain: 'hod_then_hr', active: false }
];

const DEPARTMENTS = ['Clinical Nursing', 'Midwifery', 'Public Health', 'Administration'];

// role: staff | hod | hr | principal
const USERS = [
  { name: 'Afia Owusu', email: 'afia.owusu@dnmc.edu.gh', role: 'staff', dept: 'Clinical Nursing', title: 'Nurse Tutor, Clinical Nursing' },
  { name: 'Dr. Salifu Adam', email: 'salifu.adam@dnmc.edu.gh', role: 'hod', dept: 'Clinical Nursing', title: 'Head, Clinical Nursing' },
  { name: 'Dr. Comfort Yeboah', email: 'comfort.yeboah@dnmc.edu.gh', role: 'hod', dept: 'Midwifery', title: 'Head, Midwifery' },
  { name: 'Dr. Musah Iddrisu', email: 'musah.iddrisu@dnmc.edu.gh', role: 'hod', dept: 'Public Health', title: 'Head, Public Health' },
  { name: 'Yussif Alhassan', email: 'yussif.alhassan@dnmc.edu.gh', role: 'hod', dept: 'Administration', title: 'Head, Administration' },
  { name: 'Mary Kipo', email: 'mary.kipo@dnmc.edu.gh', role: 'hr', dept: 'Administration', title: 'HR & Admin Officer' },
  { name: 'Dr. J. K. Nabila', email: 'jk.nabila@dnmc.edu.gh', role: 'principal', dept: null, title: 'College Principal' },
  { name: 'Kwabena Mensah', email: 'kwabena.mensah@dnmc.edu.gh', role: 'staff', dept: 'Midwifery', title: 'Tutor, Midwifery' },
  { name: 'Zeinab Alhassan', email: 'zeinab.alhassan@dnmc.edu.gh', role: 'staff', dept: 'Clinical Nursing', title: 'Tutor, Clinical Nursing' },
  { name: 'Yaw Darko', email: 'yaw.darko@dnmc.edu.gh', role: 'staff', dept: 'Public Health', title: 'Tutor, Public Health' },
  { name: 'Efua Asante', email: 'efua.asante@dnmc.edu.gh', role: 'staff', dept: 'Midwifery', title: 'Tutor, Midwifery' },
  { name: 'Ibrahim Seidu', email: 'ibrahim.seidu@dnmc.edu.gh', role: 'staff', dept: 'Administration', title: 'Admin Assistant' },
  { name: 'Akosua Boateng', email: 'akosua.boateng@dnmc.edu.gh', role: 'staff', dept: 'Public Health', title: 'Tutor, Public Health' }
];

// remaining/entitlement per staff for annual/sick/casual/study, from prototype staffDir
const STAFF_BALANCES = {
  'Afia Owusu': { annual: 22, sick: 13, casual: 4, study: 15 },
  'Kwabena Mensah': { annual: 18, sick: 15, casual: 6, study: 20 },
  'Zeinab Alhassan': { annual: 25, sick: 11, casual: 7, study: 20 },
  'Yaw Darko': { annual: 12, sick: 15, casual: 5, study: 18 },
  'Efua Asante': { annual: 30, sick: 14, casual: 7, study: 20 },
  'Ibrahim Seidu': { annual: 20, sick: 9, casual: 3, study: 20 },
  'Akosua Boateng': { annual: 27, sick: 15, casual: 6, study: 20 }
};

const REQUESTS = [
  { staff: 'Afia Owusu', type: 'annual', start: '2026-08-24', end: '2026-08-28', days: 5, status: 'pending_hod', submitted: '2026-07-09', reason: 'Family travel to Tamale for my sister’s wedding.' },
  { staff: 'Afia Owusu', type: 'study', start: '2026-09-14', end: '2026-09-18', days: 5, status: 'approved', submitted: '2026-06-28', reason: 'MSc Nursing residential week, University of Ghana.' },
  { staff: 'Afia Owusu', type: 'sick', start: '2026-06-02', end: '2026-06-03', days: 2, status: 'approved', submitted: '2026-06-02', reason: 'Malaria treatment.' },
  { staff: 'Kwabena Mensah', type: 'casual', start: '2026-07-15', end: '2026-07-15', days: 1, status: 'pending_hod', submitted: '2026-07-10', reason: 'Attending a naming ceremony.' },
  { staff: 'Zeinab Alhassan', type: 'compassionate', start: '2026-07-13', end: '2026-07-17', days: 5, status: 'pending_hod', submitted: '2026-07-11', reason: 'Bereavement — funeral arrangements in Wa.' },
  { staff: 'Yaw Darko', type: 'annual', start: '2026-08-03', end: '2026-08-14', days: 10, status: 'pending_hr', submitted: '2026-07-05', reason: 'Annual family holiday.' },
  { staff: 'Efua Asante', type: 'maternity', start: '2026-09-01', end: '2026-11-24', days: 60, status: 'approved', submitted: '2026-06-15', reason: 'Maternity leave — expected delivery early September.' },
  { staff: 'Ibrahim Seidu', type: 'sick', start: '2026-07-08', end: '2026-07-10', days: 3, status: 'approved', submitted: '2026-07-08', reason: 'Medical review at Damongo hospital.' },
  { staff: 'Akosua Boateng', type: 'study', start: '2026-07-20', end: '2026-07-24', days: 5, status: 'declined', submitted: '2026-06-30', reason: 'Short course overlapping with exam invigilation.' }
];

const deptHod = { 'Clinical Nursing': 'Dr. Salifu Adam', 'Midwifery': 'Dr. Comfort Yeboah', 'Public Health': 'Dr. Musah Iddrisu', 'Administration': 'Yussif Alhassan' };

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgRes = await client.query(
      `INSERT INTO organisations (name, leave_year_start_month) VALUES ($1, $2) RETURNING id`,
      ['Saint Annes Hospital, Damongo', 1]
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
    for (const t of LEAVE_TYPES) {
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
      for (const t of LEAVE_TYPES) {
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
      const typeDef = LEAVE_TYPES.find((t) => t.key === req.type);
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
    console.log('Seed complete.');
    console.log(`Demo password for all seeded users: ${DEMO_PASSWORD}`);
    console.log('Demo logins:');
    console.log('  staff     afia.owusu@dnmc.edu.gh');
    console.log('  hod       salifu.adam@dnmc.edu.gh');
    console.log('  hr        mary.kipo@dnmc.edu.gh');
    console.log('  principal jk.nabila@dnmc.edu.gh');
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
