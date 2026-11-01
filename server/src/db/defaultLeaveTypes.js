// The default leave-type catalog every organisation starts with — used both by the
// demo seed script and by real self-serve signup, so both stay in sync from one source.
export const DEFAULT_LEAVE_TYPES = [
  { key: 'annual', name: 'Annual', emoji: '🌴', tint: '#E2F0E9', color: '#1F5C4D', entitlement: 30, chain: 'hod_then_hr', active: true },
  { key: 'sick', name: 'Sick', emoji: '🩺', tint: '#FAE5E1', color: '#B0563F', entitlement: 15, chain: 'hod_only', active: true },
  { key: 'casual', name: 'Casual', emoji: '☕', tint: '#FFF3D6', color: '#C9A227', entitlement: 7, chain: 'hod_only', active: true },
  { key: 'study', name: 'Study', emoji: '📚', tint: '#E3EEFA', color: '#2B5C8A', entitlement: 20, chain: 'hod_then_hr', active: true },
  { key: 'maternity', name: 'Maternity', emoji: '👶', tint: '#F3E5F5', color: '#8E44AD', entitlement: 90, chain: 'hod_then_hr', active: true },
  { key: 'paternity', name: 'Paternity', emoji: '👨‍👧', tint: '#E3EEFA', color: '#2B5C8A', entitlement: 10, chain: 'hod_then_hr', active: true },
  { key: 'compassionate', name: 'Compassionate', emoji: '🕊️', tint: '#EFEDE6', color: '#4A554F', entitlement: 5, chain: 'hod_then_hr', active: true },
  { key: 'unpaid', name: 'Unpaid', emoji: '⏸️', tint: '#EFEDE6', color: '#4A554F', entitlement: null, chain: 'hod_then_hr', active: false }
];
