export const DASHBOARD_ROLES = {
  SUPER_ADMIN: {
    label: 'Administrator',
    visual: 'admin',
    summary: 'Full access to records, settings, data tools and workspace controls.',
    permissions: ['*']
  },

  OFFICE_MANAGER: {
    label: 'Office manager',
    visual: 'manager',
    summary: 'Run office operations, staff, visitors, rooms, reports and workspace records.',
    permissions: [
      'sales.create', 'sales.void', 'payments.record', 'buyers.manage', 'buyers.delete',
      'plots.manage', 'reminders.send', 'messages.send', 'documents.manage',
      'settings.view', 'settings.edit', 'data.export', 'accounting.view', 'expenses.manage',
      'finance.view', 'finance.manage',
      'staff.view', 'staff.manage',
      'leads.view', 'leads.manage', 'tasks.view', 'tasks.manage', 'reports.view',
      'estateDocs.view', 'estateDocs.manage', 'maintenance.view', 'maintenance.manage',
      'complaints.view', 'complaints.manage', 'land.view', 'land.manage'
    ]
  },
  ACCOUNTANT: {
    label: 'Accountant',
    visual: 'sales',
    summary: 'Own invoices, payments, expenses and financial reporting.',
    permissions: ['accounting.view', 'finance.view', 'finance.manage', 'expenses.manage', 'reports.view']
  },
  SURVEYOR: {
    label: 'Surveyor',
    visual: 'viewer',
    summary: 'Work with assigned parcels, field measurements and survey reports.',
    permissions: ['plots.manage', 'maintenance.view', 'reports.view']
  },
  RECEPTIONIST: {
    label: 'Receptionist',
    visual: 'viewer',
    summary: 'Front desk visitor registration, check-in, check-out and temporary cards.',
    permissions: []
  },
  VISITOR: {
    label: 'Visitor',
    visual: 'viewer',
    summary: 'External visitor account with no office administration access.',
    permissions: []
  },
  CLIENT: {
    label: 'Client',
    visual: 'client',
    summary: 'Manage TGNE service requests, delivery updates, documents and payments in your private client workspace.',
    permissions: ['client.portal', 'client.resell', 'client.services', 'client.documents', 'client.payments']
  }
};

// Role keys that share another role's workspace definition. Keeping ADMIN as
// an alias avoids a second, divergent copy of the administrator permissions.
export const ROLE_ALIASES = {
  ADMIN: 'SUPER_ADMIN'
};

export function resolveDashboardAccess(roleKeys = []) {
  const normalized = roleKeys.map((key) => ROLE_ALIASES[key] || key);
  const key = Object.keys(DASHBOARD_ROLES).find((candidate) => normalized.includes(candidate));
  if (!key) {
    return {
      key: '',
      label: 'Member',
      visual: 'viewer',
      summary: 'Ask an administrator to assign your workspace role.',
      permissions: []
    };
  }
  return { key, ...DASHBOARD_ROLES[key] };
}
