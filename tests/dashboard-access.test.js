import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDashboardAccess } from '../lib/dashboard-access.js';
import { canViewPanel, OFFICE_PANELS } from '../lib/office-panels.js';

test('resolves the highest-priority workspace role', () => {
  const access = resolveDashboardAccess(['RECEPTIONIST', 'OFFICE_MANAGER']);
  assert.equal(access.key, 'OFFICE_MANAGER');
  assert.equal(access.visual, 'manager');
  assert.ok(access.permissions.includes('staff.manage'));
});

test('falls back to a member with no access when no role is recognised', () => {
  const access = resolveDashboardAccess(['UNKNOWN']);
  assert.equal(access.key, '');
  assert.equal(access.label, 'Member');
  assert.deepEqual(access.permissions, []);
});

test('super administrators keep wildcard workspace access', () => {
  const access = resolveDashboardAccess(['SUPER_ADMIN']);
  assert.deepEqual(access.permissions, ['*']);
  assert.equal(access.visual, 'admin');
});

test('plain administrators get the same wildcard workspace access', () => {
  // ADMIN is an alias of SUPER_ADMIN, so it resolves to the same definition.
  const access = resolveDashboardAccess(['ADMIN']);
  assert.equal(access.key, 'SUPER_ADMIN');
  assert.deepEqual(access.permissions, ['*']);
  assert.equal(access.visual, 'admin');
});

test('receptionists get visitor panels but no restricted office tools', () => {
  const user = { permissions: ['visitors.view', 'visitors.register', 'organization.view'] };
  assert.equal(canViewPanel(user, 'visitors'), true);
  assert.equal(canViewPanel(user, 'organization'), true);
  assert.equal(canViewPanel(user, 'overview'), true);
  assert.equal(canViewPanel(user, 'audit'), false);
  assert.equal(canViewPanel(user, 'finance'), false);
});

test('accounts with no office permissions see no office panels', () => {
  const user = { permissions: [] };
  for (const panel of Object.keys(OFFICE_PANELS)) {
    assert.equal(canViewPanel(user, panel), false, panel);
  }
});

test('any recognised office permission opens the overview', () => {
  assert.equal(canViewPanel({ permissions: ['field.view'] }, 'overview'), true);
  assert.equal(canViewPanel({ permissions: ['attendance.manage'] }, 'overview'), true);
});

test('the land storefront panel follows the land.view permission', () => {
  assert.ok(OFFICE_PANELS.land);
  assert.equal(canViewPanel({ permissions: ['land.view'] }, 'land'), true);
  assert.equal(canViewPanel({ permissions: ['land.manage'] }, 'land'), true);
  assert.equal(canViewPanel({ permissions: ['growth.view'] }, 'land'), false);
  const manager = resolveDashboardAccess(['OFFICE_MANAGER']);
  assert.ok(manager.permissions.includes('land.view'));
  assert.ok(manager.permissions.includes('land.manage'));
});

test('client-only accounts never reach an office panel', () => {
  // The client workspace now lives at /client and is no longer part of the
  // staff panel registry, so a client account must be denied every office panel.
  const client = {
    permissions: ['client.portal', 'client.resell', 'client.services', 'client.documents', 'client.payments'],
    roles: [{ key: 'CLIENT' }]
  };
  for (const panel of Object.keys(OFFICE_PANELS)) {
    assert.equal(canViewPanel(client, panel), false, panel);
  }

  const manager = {
    permissions: ['land.view', 'client.view', 'client.manage'],
    roles: [{ key: 'OFFICE_MANAGER' }]
  };
  assert.equal(canViewPanel(manager, 'overview'), true);
  assert.equal(canViewPanel(manager, 'clients'), true);
  assert.equal(canViewPanel(manager, 'client-overview'), false);
});
