export const OFFICE_PANELS = {
  overview: { label: 'Office overview', permissions: [] },
  visitors: { label: 'Visitor operations', permissions: ['visitors.view'] },
  verify: { label: 'Access verification', permissions: ['visitors.view', 'visitors.checkin', 'visitors.card.print'] },
  staff: { label: 'Staff directory', permissions: ['staff.view'] },
  attendance: { label: 'Attendance', permissions: [] },
  organization: { label: 'Departments & rooms', permissions: ['organization.view', 'departments.manage', 'rooms.manage'] },
  reports: { label: 'Visitor reports', permissions: ['reports.view'] },
  finance: { label: 'Finance desk', permissions: ['finance.view'] },
  compliance: { label: 'Ghana compliance', permissions: ['compliance.view'] },
  growth: { label: 'Growth & outreach', permissions: ['growth.view'] },
  clients: { label: 'Clients & services', permissions: ['client.view', 'client.manage'] },
  roles: { label: 'Roles & security', permissions: ['roles.manage'] },
  audit: { label: 'Audit history', permissions: ['audit.view'] },
  settings: { label: 'Settings', permissions: ['settings.manage', 'cards.configure', 'notifications.manage'] }
};

export function canViewPanel(user, panel) {
  const def = OFFICE_PANELS[panel];
  if (!def) return false;
  // Super administrators carry the wildcard permission for workspace access.
  if (user.permissions.includes('*')) return true;
  if (!user.permissions.length) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.length && roles.every((role) => role.key === 'CLIENT')) return false;
  if (panel === 'overview') return true;
  if (!def.permissions.length) return true;
  return def.permissions.some((permission) => user.permissions.includes(permission));
}
