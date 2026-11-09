export const OFFICE_PANELS = {
  overview: { label: 'Office overview', permissions: [] },
  visitors: { label: 'Visitor operations', permissions: ['visitors.view'] },
  verify: { label: 'Access verification', permissions: ['visitors.view', 'visitors.checkin', 'visitors.card.print'] },
  staff: { label: 'Staff directory', permissions: ['staff.view'] },
  attendance: { label: 'Attendance', permissions: [] },
  organization: { label: 'Departments & rooms', permissions: ['organization.view', 'departments.manage', 'rooms.manage'] },
  reports: { label: 'Visitor reports', permissions: ['reports.view'] },
  finance: { label: 'Finance desk', permissions: ['finance.view'] },
  survey: { label: 'Surveying', permissions: ['field.view'] },
  compliance: { label: 'Ghana compliance', permissions: ['compliance.view'] },
  growth: { label: 'Growth & outreach', permissions: ['growth.view'] },
  land: { label: 'Land storefront', permissions: ['land.view', 'land.manage'] },
  clients: { label: 'Client desk', permissions: ['client.view', 'client.manage'] },
  'client-overview': { label: 'My land', permissions: ['client.portal'] },
  'client-portfolio': { label: 'My portfolio', permissions: ['client.portal'] },
  'client-buy': { label: 'Buy land', permissions: ['client.portal'] },
  'client-resale': { label: 'Resell land', permissions: ['client.resell'] },
  'client-services': { label: 'Land services', permissions: ['client.services'] },
  'client-payments': { label: 'Payments', permissions: ['client.payments'] },
  'client-documents': { label: 'My documents', permissions: ['client.documents'] },
  'client-support': { label: 'Support', permissions: ['client.portal'] },
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
  if (roles.length && roles.every((role) => role.key === 'CLIENT') && !panel.startsWith('client-')) return false;
  if (panel === 'overview') return true;
  if (!def.permissions.length) return true;
  return def.permissions.some((permission) => user.permissions.includes(permission));
}
