// Seed profile: Saint Anne's Hospital, Damongo — same demo structure as the school
// profile (same people, balances and request shapes) so both are equally polished,
// just re-cast with hospital departments, clinical job titles and an executive
// title instead of academic ones.

export default {
  orgName: 'Saint Annes Hospital, Damongo',

  departments: ['Nursing', 'Maternity & Midwifery', 'Public Health', 'Administration'],

  // role: staff | hod | hr | principal (principal = the hospital's top executive)
  users: [
    { name: 'Afia Owusu', email: 'afia.owusu@stannes.health', role: 'staff', dept: 'Nursing', title: 'Staff Nurse, Nursing' },
    { name: 'Dr. Salifu Adam', email: 'salifu.adam@stannes.health', role: 'hod', dept: 'Nursing', title: 'Head of Nursing' },
    { name: 'Dr. Comfort Yeboah', email: 'comfort.yeboah@stannes.health', role: 'hod', dept: 'Maternity & Midwifery', title: 'Head of Maternity & Midwifery' },
    { name: 'Dr. Musah Iddrisu', email: 'musah.iddrisu@stannes.health', role: 'hod', dept: 'Public Health', title: 'Head of Public Health' },
    { name: 'Yussif Alhassan', email: 'yussif.alhassan@stannes.health', role: 'hod', dept: 'Administration', title: 'Head of Administration' },
    { name: 'Mary Kipo', email: 'mary.kipo@stannes.health', role: 'hr', dept: 'Administration', title: 'HR & Admin Officer' },
    { name: 'Dr. J. K. Nabila', email: 'jk.nabila@stannes.health', role: 'principal', dept: null, title: 'Medical Director' },
    { name: 'Kwabena Mensah', email: 'kwabena.mensah@stannes.health', role: 'staff', dept: 'Maternity & Midwifery', title: 'Midwife, Maternity & Midwifery' },
    { name: 'Zeinab Alhassan', email: 'zeinab.alhassan@stannes.health', role: 'staff', dept: 'Nursing', title: 'Staff Nurse, Nursing' },
    { name: 'Yaw Darko', email: 'yaw.darko@stannes.health', role: 'staff', dept: 'Public Health', title: 'Public Health Officer' },
    { name: 'Efua Asante', email: 'efua.asante@stannes.health', role: 'staff', dept: 'Maternity & Midwifery', title: 'Midwife, Maternity & Midwifery' },
    { name: 'Ibrahim Seidu', email: 'ibrahim.seidu@stannes.health', role: 'staff', dept: 'Administration', title: 'Admin Assistant' },
    { name: 'Akosua Boateng', email: 'akosua.boateng@stannes.health', role: 'staff', dept: 'Public Health', title: 'Public Health Officer' }
  ],

  // remaining/entitlement per staff for annual/sick/casual/study
  staffBalances: {
    'Afia Owusu': { annual: 22, sick: 13, casual: 4, study: 15 },
    'Kwabena Mensah': { annual: 18, sick: 15, casual: 6, study: 20 },
    'Zeinab Alhassan': { annual: 25, sick: 11, casual: 7, study: 20 },
    'Yaw Darko': { annual: 12, sick: 15, casual: 5, study: 18 },
    'Efua Asante': { annual: 30, sick: 14, casual: 7, study: 20 },
    'Ibrahim Seidu': { annual: 20, sick: 9, casual: 3, study: 20 },
    'Akosua Boateng': { annual: 27, sick: 15, casual: 6, study: 20 }
  },

  requests: [
    { staff: 'Afia Owusu', type: 'annual', start: '2026-08-24', end: '2026-08-28', days: 5, status: 'pending_hod', submitted: '2026-07-09', reason: 'Family travel to Tamale for my sister’s wedding.' },
    { staff: 'Afia Owusu', type: 'study', start: '2026-09-14', end: '2026-09-18', days: 5, status: 'approved', submitted: '2026-06-28', reason: 'MSc Nursing residential week, University of Ghana.' },
    { staff: 'Afia Owusu', type: 'sick', start: '2026-06-02', end: '2026-06-03', days: 2, status: 'approved', submitted: '2026-06-02', reason: 'Malaria treatment.' },
    { staff: 'Kwabena Mensah', type: 'casual', start: '2026-07-15', end: '2026-07-15', days: 1, status: 'pending_hod', submitted: '2026-07-10', reason: 'Attending a naming ceremony.' },
    { staff: 'Zeinab Alhassan', type: 'compassionate', start: '2026-07-13', end: '2026-07-17', days: 5, status: 'pending_hod', submitted: '2026-07-11', reason: 'Bereavement — funeral arrangements in Wa.' },
    { staff: 'Yaw Darko', type: 'annual', start: '2026-08-03', end: '2026-08-14', days: 10, status: 'pending_hr', submitted: '2026-07-05', reason: 'Annual family holiday.' },
    { staff: 'Efua Asante', type: 'maternity', start: '2026-09-01', end: '2026-11-24', days: 60, status: 'approved', submitted: '2026-06-15', reason: 'Maternity leave — expected delivery early September.' },
    { staff: 'Ibrahim Seidu', type: 'sick', start: '2026-07-08', end: '2026-07-10', days: 3, status: 'approved', submitted: '2026-07-08', reason: 'Medical review at Tamale Teaching Hospital.' },
    { staff: 'Akosua Boateng', type: 'study', start: '2026-07-20', end: '2026-07-24', days: 5, status: 'declined', submitted: '2026-06-30', reason: 'Short course overlapping with a scheduled ward coverage shift.' }
  ],

  deptHod: {
    'Nursing': 'Dr. Salifu Adam',
    'Maternity & Midwifery': 'Dr. Comfort Yeboah',
    'Public Health': 'Dr. Musah Iddrisu',
    'Administration': 'Yussif Alhassan'
  },

  demoLogins: [
    ['staff', 'afia.owusu@stannes.health'],
    ['hod', 'salifu.adam@stannes.health'],
    ['hr', 'mary.kipo@stannes.health'],
    ['principal (Medical Director)', 'jk.nabila@stannes.health']
  ]
};
