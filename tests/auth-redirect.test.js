import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_HOME,
  PUBLIC_HOME,
  STAFF_HOME,
  isAdminUser,
  isClientUser,
  isSafeRedirectPath,
  roleKeysOf,
  workspacePathForUser
} from '../lib/auth-redirect.js';

test('staff roles land on the workspace dashboard', () => {
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST']) {
    assert.equal(workspacePathForUser({ roles: [{ key: role }] }), STAFF_HOME);
  }
  assert.equal(STAFF_HOME, '/admin');
});

test('client accounts land on the client portal', () => {
  assert.equal(workspacePathForUser({ roles: [{ key: 'CLIENT' }] }), CLIENT_HOME);
  assert.equal(isClientUser({ roles: [{ key: 'CLIENT' }] }), true);
  assert.equal(isAdminUser({ roles: [{ key: 'CLIENT' }] }), false);
});

test('accounts without workspace access stay on the public site', () => {
  assert.equal(workspacePathForUser({ roles: [{ key: 'VISITOR' }] }), PUBLIC_HOME);
  assert.equal(workspacePathForUser({ roles: [] }), PUBLIC_HOME);
  assert.equal(workspacePathForUser(null), PUBLIC_HOME);
});

test('admin roles take precedence and mixed roles never become client accounts', () => {
  for (const adminKey of ['SUPER_ADMIN', 'ADMIN']) {
    const mixed = { roles: [{ key: 'CLIENT' }, { key: adminKey }] };
    assert.equal(workspacePathForUser(mixed), STAFF_HOME);
    assert.equal(isAdminUser(mixed), true);
    assert.equal(isClientUser(mixed), false);
  }
});

test('role keys are read from every shape the API returns', () => {
  assert.deepEqual(roleKeysOf({ roles: [{ key: 'CLIENT' }] }), ['CLIENT']);
  assert.deepEqual(roleKeysOf({ roles: [{ role: { key: 'VISITOR' } }] }), ['VISITOR']);
  assert.deepEqual(roleKeysOf({ roles: ['ACCOUNTANT'] }), ['ACCOUNTANT']);
  assert.deepEqual(roleKeysOf({}), []);
  assert.deepEqual(roleKeysOf(null), []);
});

test('only same-origin relative paths are accepted as redirects', () => {
  assert.equal(isSafeRedirectPath('/admin'), true);
  assert.equal(isSafeRedirectPath('/client/profile'), true);
  assert.equal(isSafeRedirectPath('/client'), true);
  assert.equal(isSafeRedirectPath('//evil.com'), false);
  assert.equal(isSafeRedirectPath('/\\evil.com'), false);
  assert.equal(isSafeRedirectPath('https://evil.com'), false);
  assert.equal(isSafeRedirectPath('javascript:alert(1)'), false);
  assert.equal(isSafeRedirectPath(''), false);
  assert.equal(isSafeRedirectPath(null), false);
});
