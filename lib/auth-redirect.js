// Shared sign-in routing rules.
//
// A user's workspace is derived from trusted role records returned by the
// server, never from a requested URL, a query string, local storage or a
// previous session. The role lists and the access-class calculation live in
// lib/roles.js so the middleware, the dashboards and the legacy workspace all
// agree on what a role means.

import {
  ACCESS_ADMIN,
  ACCESS_CLIENT,
  ADMIN_HOME as ROLES_ADMIN_HOME,
  ADMIN_ROLE_KEYS,
  CLIENT_HOME as ROLES_CLIENT_HOME,
  CLIENT_ROLE_KEYS,
  PUBLIC_HOME as ROLES_PUBLIC_HOME,
  accessClassForRoles,
  isAdminRoleKey,
  roleKeysOf
} from './roles.js';

export {
  ADMIN_ROLE_KEYS,
  CLIENT_ROLE_KEYS,
  isSafeRedirectPath,
  roleKeysOf
} from './roles.js';

export const STAFF_ROLE_KEYS = ADMIN_ROLE_KEYS;
export const STAFF_HOME = ROLES_ADMIN_HOME;
export const ADMIN_HOME = ROLES_ADMIN_HOME;
export const CLIENT_HOME = ROLES_CLIENT_HOME;
export const PUBLIC_HOME = ROLES_PUBLIC_HOME;

export function isAdminUser(user) {
  return accessClassForRoles(roleKeysOf(user)) === ACCESS_ADMIN;
}

export function isStaffUser(user) {
  return isAdminUser(user);
}

// A client account is client-only. Mixed assignments stay staff accounts, so
// staff permissions can never be carried into a client session.
export function isClientUser(user) {
  return accessClassForRoles(roleKeysOf(user)) === ACCESS_CLIENT;
}

// The single source of truth for where a signed-in account belongs.
export function workspacePathForUser(user) {
  const accessClass = accessClassForRoles(roleKeysOf(user));
  if (accessClass === ACCESS_ADMIN) return STAFF_HOME;
  if (accessClass === ACCESS_CLIENT) return CLIENT_HOME;
  return PUBLIC_HOME;
}

// Re-exported for callers that need to test a single role key.
export { isAdminRoleKey };
