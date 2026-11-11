import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCESS_ADMIN,
  ACCESS_CLIENT,
  ACCESS_NONE,
  accessClassForPath,
  accessClassForRoles,
  accessClassForUser,
  homeForAccessClass,
  isAdminRoleKey,
  isClientRoleKey,
  roleKeysOf
} from '../lib/roles.js';
import { isAdminUser, isClientUser, workspacePathForUser } from '../lib/auth-redirect.js';

test('ADMIN and SUPER_ADMIN are both administrator roles', () => {
  assert.equal(accessClassForRoles(['ADMIN']), ACCESS_ADMIN);
  assert.equal(accessClassForRoles(['SUPER_ADMIN']), ACCESS_ADMIN);
  assert.equal(isAdminRoleKey('ADMIN'), true);
  assert.equal(homeForAccessClass(ACCESS_ADMIN), '/admin');
});

test('every staff role key resolves to the admin workspace', () => {
  for (const key of ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST']) {
    assert.equal(accessClassForRoles([key]), ACCESS_ADMIN, key);
    assert.equal(workspacePathForUser({ roles: [{ key }] }), '/admin', key);
    assert.equal(isAdminUser({ roles: [{ key }] }), true, key);
    assert.equal(isClientUser({ roles: [{ key }] }), false, key);
  }
});

test('CLIENT is the only client role and lands on /client', () => {
  assert.equal(isClientRoleKey('CLIENT'), true);
  assert.equal(accessClassForRoles(['CLIENT']), ACCESS_CLIENT);
  assert.equal(workspacePathForUser({ roles: [{ key: 'CLIENT' }] }), '/client');
  assert.equal(isClientUser({ roles: [{ key: 'CLIENT' }] }), true);
  assert.equal(isAdminUser({ roles: [{ key: 'CLIENT' }] }), false);
});

test('admin access always wins over client access', () => {
  for (const mixed of [['CLIENT', 'ADMIN'], ['CLIENT', 'SUPER_ADMIN'], ['ADMIN', 'CLIENT']]) {
    assert.equal(accessClassForRoles(mixed), ACCESS_ADMIN);
    assert.equal(workspacePathForUser({ roles: mixed.map((key) => ({ key })) }), '/admin');
    assert.equal(isClientUser({ roles: mixed.map((key) => ({ key })) }), false);
  }
});

test('unknown, visitor and empty role sets have no workspace', () => {
  for (const roles of [[], ['VISITOR'], ['UNKNOWN'], null, undefined]) {
    assert.equal(accessClassForRoles(roles), ACCESS_NONE);
  }
  assert.equal(accessClassForUser({ roles: [{ key: 'VISITOR' }] }), ACCESS_NONE);
  assert.equal(workspacePathForUser({ roles: [{ key: 'VISITOR' }] }), '/');
  assert.equal(homeForAccessClass(ACCESS_NONE), '/');
});

test('the access class is derived from every role shape the API returns', () => {
  assert.equal(accessClassForUser({ roles: [{ role: { key: 'ADMIN' } }] }), ACCESS_ADMIN);
  assert.equal(accessClassForUser({ roles: ['CLIENT'] }), ACCESS_CLIENT);
  assert.deepEqual(roleKeysOf({ roles: [{ key: 'ADMIN' }, { role: { key: 'CLIENT' } }] }), ['ADMIN', 'CLIENT']);
});

test('URL paths belong to exactly one workspace', () => {
  assert.equal(accessClassForPath('/admin'), ACCESS_ADMIN);
  assert.equal(accessClassForPath('/admin/users'), ACCESS_ADMIN);
  assert.equal(accessClassForPath('/admin/settings'), ACCESS_ADMIN);
  assert.equal(accessClassForPath('/client'), ACCESS_CLIENT);
  assert.equal(accessClassForPath('/client/profile'), ACCESS_CLIENT);
  assert.equal(accessClassForPath('/client/settings'), ACCESS_CLIENT);

  // Prefixes that only look similar must not be treated as protected.
  assert.equal(accessClassForPath('/administrator'), null);
  assert.equal(accessClassForPath('/clients'), null);
  assert.equal(accessClassForPath('/'), null);
  assert.equal(accessClassForPath('/login'), null);
  assert.equal(accessClassForPath(undefined), null);
});
