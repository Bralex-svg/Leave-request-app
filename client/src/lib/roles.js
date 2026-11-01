export const ROLE_HOME = {
  staff: '/overview',
  hod: '/approvals',
  hr: '/all-requests',
  principal: '/insights'
};

export const NAV_BY_ROLE = {
  staff: [
    { to: '/overview', label: 'Overview', icon: '◫' },
    { to: '/my-requests', label: 'My requests', icon: '☰' }
  ],
  hod: [
    { to: '/approvals', label: 'Approvals', icon: '✓' },
    { to: '/department-log', label: 'Department log', icon: '☰' }
  ],
  hr: [
    { to: '/all-requests', label: 'All requests', icon: '☰' },
    { to: '/balances', label: 'Staff balances', icon: '◫' },
    { to: '/settings', label: 'Settings & branding', icon: '⚙' }
  ],
  principal: [
    { to: '/insights', label: 'Insights', icon: '◫' },
    { to: '/all-requests', label: 'All requests', icon: '☰' }
  ]
};

export const ROLE_OPTIONS = [
  { key: 'staff', label: 'Staff member', sub: 'Request & track leave', mono: 'S' },
  { key: 'hod', label: 'Head of Dept.', sub: 'Approve requests', mono: 'H' },
  { key: 'hr', label: 'HR / Admin', sub: 'Manage & finalise', mono: 'A' },
  { key: 'principal', label: 'Executive', sub: 'Reports & insights', mono: 'E' }
];
