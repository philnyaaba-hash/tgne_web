import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_ACCOUNTS, demoAccountFor, isDemoQuickLoginEnabled } from '../lib/demo-accounts.js';
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
  }
  assert.equal(demoAccountFor('NOT_A_ROLE'), null);
});

test('quick sign-in stays off unless explicitly enabled for a demo environment', () => {
  assert.equal(isDemoQuickLoginEnabled({}), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '0' }), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1' }), true);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1', VERCEL_ENV: 'production' }), false);
  assert.equal(isDemoQuickLoginEnabled({ DEMO_QUICK_LOGIN: '1', VERCEL_ENV: 'preview' }), true);
});
