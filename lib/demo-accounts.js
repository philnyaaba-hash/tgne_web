const ACCOUNT_DEFINITIONS = [
  { role: 'SUPER_ADMIN', envPrefix: 'TEST_ADMIN', email: 'admin@tgnesolutions.com', name: 'TGNE Admin', label: 'Admin', hint: 'Full workspace' },
  { role: 'OFFICE_MANAGER', envPrefix: 'TEST_MANAGER', email: 'manager@tgnesolutions.com', name: 'TGNE Office Manager', label: 'Office manager', hint: 'Operations' },
  { role: 'ACCOUNTANT', envPrefix: 'TEST_ACCOUNTANT', email: 'accountant@tgnesolutions.com', name: 'TGNE Accountant', label: 'Accountant', hint: 'Finance' },
  { role: 'SURVEYOR', envPrefix: 'TEST_SURVEYOR', email: 'surveyor@tgnesolutions.com', name: 'TGNE Surveyor', label: 'Surveyor', hint: 'Field work' },
  { role: 'RECEPTIONIST', envPrefix: 'TEST_RECEPTIONIST', email: 'receptionist@tgnesolutions.com', name: 'TGNE Receptionist', label: 'Receptionist', hint: 'Front desk' },
  { role: 'VISITOR', envPrefix: 'TEST_VISITOR', email: 'visitor@tgnesolutions.com', name: 'TGNE Visitor', label: 'Visitor', hint: 'External' },
  { role: 'CLIENT', envPrefix: 'TEST_CLIENT', email: 'client@tgnesolutions.com', name: 'TGNE Client', label: 'Client', hint: 'Client workspace' }
];

export const DEMO_ACCOUNTS = ACCOUNT_DEFINITIONS.map((account) => ({
  ...account,
  emailEnv: `${account.envPrefix}_EMAIL`,
  passwordEnv: `${account.envPrefix}_PASSWORD`
}));

function configuredAccount(account, env) {
  return {
    ...account,
    email: env[account.emailEnv]?.trim().toLowerCase() || account.email
  };
}

export function demoAccountFor(role, env = process.env) {
  const account = DEMO_ACCOUNTS.find((entry) => entry.role === role);
  return account ? configuredAccount(account, env) : null;
}

export function demoAccountByEmail(email, env = process.env) {
  if (typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((entry) => configuredAccount(entry, env).email === normalizedEmail);
  return account ? configuredAccount(account, env) : null;
}

export function demoPasswordFor(account, env = process.env) {
  return account ? env[account.passwordEnv] || '' : '';
}

export function demoAccountsForSeeding(env = process.env) {
  return DEMO_ACCOUNTS.map((account) => ({
    ...configuredAccount(account, env),
    password: demoPasswordFor(account, env)
  }));
}

export function demoSeedConfigurationErrors(env = process.env) {
  const errors = [];
  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') {
    errors.push('Demo accounts cannot be seeded in a production environment.');
  }
  if (env.ALLOW_DEMO_SEED !== '1') {
    errors.push('Set ALLOW_DEMO_SEED=1 to intentionally seed local test accounts.');
  }
  if (!env.DATABASE_URL) {
    errors.push('Set DATABASE_URL to a dedicated non-production database.');
  } else {
    try {
      const databaseUrl = new URL(env.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        errors.push('DATABASE_URL must use PostgreSQL.');
      }
      const localHosts = ['localhost', '127.0.0.1', '::1'];
      if (!localHosts.includes(databaseUrl.hostname) && env.ALLOW_REMOTE_DEMO_SEED !== '1') {
        errors.push('Remote test databases require ALLOW_REMOTE_DEMO_SEED=1 and must not contain production data.');
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
  }

  const accounts = demoAccountsForSeeding(env);
  const emails = new Set();
  const passwords = new Set();
  for (const account of accounts) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
      errors.push(`Set a valid ${account.emailEnv} value.`);
    }
    if (emails.has(account.email)) errors.push('Each demo account must use a unique email address.');
    emails.add(account.email);

    if (account.password.length < 12) {
      errors.push(`Set ${account.passwordEnv} to a password of at least 12 characters.`);
    }
    if (account.password.length >= 12) {
      if (passwords.has(account.password)) errors.push('Each demo account must use a unique password.');
      passwords.add(account.password);
    }
  }
  return errors;
}

export function isDemoQuickLoginEnabled(env = process.env) {
  if (env.DEMO_QUICK_LOGIN !== '1') return false;
  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') return false;
  return true;
}
