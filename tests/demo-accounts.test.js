import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_ACCOUNTS,
  demoAccountFor,
  demoAccountsForSeeding,
  demoPasswordFor,
  demoSeedConfigurationErrors,
  isDemoQuickLoginEnabled
} from '../lib/demo-accounts.js';
import { DASHBOARD_ROLES } from '../lib/dashboard-access.js';

test('every workspace role has exactly one quick sign-in demo account', () => {
  const roles = DEMO_ACCOUNTS.map((account) => account.role);
  for (const key of Object.keys(DASHBOARD_ROLES)) {
    assert.ok(roles.includes(key), 'missing demo account for ' + key);
  }
  assert.equal(new Set(roles).size, roles.length);
  assert.equal(new Set(DEMO_ACCOUNTS.map((account) => account.email)).size, DEMO_ACCOUNTS.length);
  for (const account of DEMO_ACCOUNTS) {
    assert.match(account.email, /^[a-z-]+@tgnesolutions\.com$/);
    assert.ok(demoAccountFor(account.role));
    assert.equal(Object.hasOwn(account, 'password'), false);
  }
  assert.equal(demoAccountFor('NOT_A_ROLE'), null);
});

test('demo account passwords come only from the matching environment variables', () => {
  const account = demoAccountFor('SUPER_ADMIN', { TEST_ADMIN_EMAIL: 'admin-test@example.com' });
  assert.equal(account.email, 'admin-test@example.com');
  assert.equal(demoPasswordFor(account, { TEST_ADMIN_PASSWORD: 'a-private-test-password' }), 'a-private-test-password');
  assert.equal(demoPasswordFor(account, {}), '');
  assert.equal(demoAccountsForSeeding({}).every((entry) => entry.password === ''), true);
});

test('demo seeding fails closed for production and missing opt-in', () => {
  const base = {
    DATABASE_URL: 'postgresql://dev:dev@localhost:5432/tgne_test',
    ALLOW_DEMO_SEED: '1',
    ...Object.fromEntries(DEMO_ACCOUNTS.map((account) => [account.passwordEnv, `${account.role}-private-test-password`]))
  };
  assert.ok(demoSeedConfigurationErrors({ ...base, NODE_ENV: 'production' }).some((error) => error.includes('production')));
  assert.ok(demoSeedConfigurationErrors({ ...base, VERCEL_ENV: 'production' }).some((error) => error.includes('production')));
  assert.ok(demoSeedConfigurationErrors({ ...base, ALLOW_DEMO_SEED: '0' }).some((error) => error.includes('ALLOW_DEMO_SEED')));
  assert.deepEqual(demoSeedConfigurationErrors({ ...base, ALLOW_DEMO_SEED: '1' }), []);
});

test('remote demo seeding requires a separate explicit opt-in and strong unique passwords', () => {
  const base = {
    DATABASE_URL: 'postgresql://dev:dev@db.example.test:5432/tgne_test',
    ALLOW_DEMO_SEED: '1',
    ...Object.fromEntries(DEMO_ACCOUNTS.map((account) => [account.passwordEnv, `${account.role}-private-test-password`]))
  };
  assert.ok(demoSeedConfigurationErrors(base).some((error) => error.includes('ALLOW_REMOTE_DEMO_SEED')));
  assert.deepEqual(demoSeedConfigurationErrors({ ...base, ALLOW_REMOTE_DEMO_SEED: '1' }), []);

  const shortPassword = { ...base, TEST_ADMIN_PASSWORD: 'short' };
  assert.ok(demoSeedConfigurationErrors(shortPassword).some((error) => error.includes('TEST_ADMIN_PASSWORD')));

  const duplicatePassword = { ...base, TEST_MANAGER_PASSWORD: base.TEST_ADMIN_PASSWORD };
  assert.ok(demoSeedConfigurationErrors(duplicatePassword).some((error) => error.includes('unique password')));
});

test('quick sign-in stays off unless explicitly enabled for a demo environment', () => {
  assert.equal(isDemoQuickLoginEnabled({}), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '0' }), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1' }), true);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1', NODE_ENV: 'production' }), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1', VERCEL_ENV: 'production' }), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1', VERCEL_ENV: 'preview' }), true);
});
