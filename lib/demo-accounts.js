export const DEMO_ACCOUNTS = [
  { role: 'SUPER_ADMIN', email: 'demo.admin@landledger.test', name: 'Demo Admin', label: 'Admin', hint: 'Full workspace' },
  { role: 'OFFICE_MANAGER', email: 'demo.manager@landledger.test', name: 'Demo Office Manager', label: 'Office manager', hint: 'Operations' },
  { role: 'ACCOUNTANT', email: 'demo.accountant@landledger.test', name: 'Demo Accountant', label: 'Accountant', hint: 'Finance' },
  { role: 'SURVEYOR', email: 'demo.surveyor@landledger.test', name: 'Demo Surveyor', label: 'Surveyor', hint: 'Field work' },
  { role: 'RECEPTIONIST', email: 'demo.receptionist@landledger.test', name: 'Demo Receptionist', label: 'Receptionist', hint: 'Front desk' },
  { role: 'VISITOR', email: 'demo.visitor@landledger.test', name: 'Demo Visitor', label: 'Visitor', hint: 'External' },
  { role: 'CLIENT', email: 'demo.client@landledger.test', name: 'Demo Land Client', label: 'Land client', hint: 'Buyer portal' }
];

export function demoAccountFor(role) {
  return DEMO_ACCOUNTS.find((account) => account.role === role) || null;
}

export function isDemoQuickLoginEnabled(env = process.env) {
  if (env.DEMO_QUICK_LOGIN !== '1') return false;
  // A production deployment must never grant one-click workspace access.
  if (env.VERCEL_ENV === 'production') return false;
  return true;
}
