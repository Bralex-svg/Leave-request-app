// Seed profile: Damongo Nursing & Midwifery College (the original pilot client / design brief).

export default {
  orgName: 'Damongo Nursing & Midwifery College',

  departments: ['Clinical Nursing', 'Midwifery', 'Public Health', 'Administration'],

  // role: staff | hod | hr | principal
  users: [
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
  ],

  // remaining/entitlement per staff for annual/sick/casual/study, from prototype staffDir
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
    { staff: 'Ibrahim Seidu', type: 'sick', start: '2026-07-08', end: '2026-07-10', days: 3, status: 'approved', submitted: '2026-07-08', reason: 'Medical review at Damongo hospital.' },
    { staff: 'Akosua Boateng', type: 'study', start: '2026-07-20', end: '2026-07-24', days: 5, status: 'declined', submitted: '2026-06-30', reason: 'Short course overlapping with exam invigilation.' }
  ],

  deptHod: {
    'Clinical Nursing': 'Dr. Salifu Adam',
    'Midwifery': 'Dr. Comfort Yeboah',
    'Public Health': 'Dr. Musah Iddrisu',
    'Administration': 'Yussif Alhassan'
  },

  demoLogins: [
    ['staff', 'afia.owusu@dnmc.edu.gh'],
    ['hod', 'salifu.adam@dnmc.edu.gh'],
    ['hr', 'mary.kipo@dnmc.edu.gh'],
    ['principal', 'jk.nabila@dnmc.edu.gh']
  ]
};
