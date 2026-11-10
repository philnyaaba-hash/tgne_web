export const DEMO_ACCOUNTS = [
  { role: 'SUPER_ADMIN', email: 'admin@tgnesolutions.com', name: 'TGNE Admin', label: 'Admin', hint: 'Full workspace', password: 'Admin123!' },
  { role: 'OFFICE_MANAGER', email: 'manager@tgnesolutions.com', name: 'TGNE Office Manager', label: 'Office manager', hint: 'Operations', password: 'Manager123!' },
  { role: 'ACCOUNTANT', email: 'accountant@tgnesolutions.com', name: 'TGNE Accountant', label: 'Accountant', hint: 'Finance', password: 'Accountant123!' },
  { role: 'SURVEYOR', email: 'surveyor@tgnesolutions.com', name: 'TGNE Surveyor', label: 'Surveyor', hint: 'Field work', password: 'Surveyor123!' },
  { role: 'RECEPTIONIST', email: 'receptionist@tgnesolutions.com', name: 'TGNE Receptionist', label: 'Receptionist', hint: 'Front desk', password: 'Receptionist123!' },
  { role: 'VISITOR', email: 'visitor@tgnesolutions.com', name: 'TGNE Visitor', label: 'Visitor', hint: 'External', password: 'Visitor123!' },
  { role: 'CLIENT', email: 'client@tgnesolutions.com', name: 'TGNE Client', label: 'Land client', hint: 'Buyer portal', password: 'Client123!' }
];

export function demoAccountFor(role) {
  return DEMO_ACCOUNTS.find((account) => account.role === role) || null;
}

export function demoAccountByEmail(email) {
  return DEMO_ACCOUNTS.find((account) => account.email === email.toLowerCase()) || null;
}

export function isDemoQuickLoginEnabled(env = process.env) {
  if (env.DEMO_QUICK_LOGIN !== '1') return false;
  // A production deployment must never grant one-click workspace access.
  if (env.VERCEL_ENV === 'production') return false;
  return true;
}
