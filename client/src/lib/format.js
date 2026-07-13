export function formatDay(iso) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatRange(start, end) {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

export function formatSubmitted(iso) {
  return formatDay(iso);
}

export function daysLabel(n) {
  return `${n} day${n === 1 ? '' : 's'}`;
}

export const STATUS_CHIP = {
  pending_hod: { label: 'Awaiting HoD', bg: '#FFF3D6', ink: '#8A6116' },
  pending_hr: { label: 'Awaiting HR', bg: '#E3EEFA', ink: '#2B5C8A' },
  approved: { label: 'Approved', bg: '#E2F0E9', ink: '#1F5C4D' },
  declined: { label: 'Declined', bg: '#FAE5E1', ink: '#9C3A2B' }
};

export function initials(name) {
  return name
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
