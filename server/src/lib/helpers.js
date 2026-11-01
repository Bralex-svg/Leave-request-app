import { randomInt } from 'crypto';

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 10) {
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return pw;
}

export function initials(name) {
  return name
    .split(' ')
    .filter((w) => w && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase())
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();
}

export function inclusiveDays(start, end) {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  const diff = Math.round((e - s) / 86400000) + 1;
  return diff;
}

export const STATUS_CHIP = {
  pending_hod: { label: 'Awaiting HoD', bg: '#FFF3D6', ink: '#8A6116' },
  pending_hr: { label: 'Awaiting HR', bg: '#E3EEFA', ink: '#2B5C8A' },
  approved: { label: 'Approved', bg: '#E2F0E9', ink: '#1F5C4D' },
  declined: { label: 'Declined', bg: '#FAE5E1', ink: '#9C3A2B' }
};

export function serializeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title,
    initials: initials(u.name),
    department: u.department_name ? { id: u.department_id, name: u.department_name } : null
  };
}
