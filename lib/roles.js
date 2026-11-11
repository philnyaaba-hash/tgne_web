// Canonical role catalogue.
//
// This is the single source of truth for what a role *means*. Redirects,
// dashboards, the legacy workspace and the session cookie all derive their
// behaviour from these lists instead of keeping their own copies. A role that
// is added here is picked up everywhere; a role that is missing here can only
// ever be a "no access" account.
//
// Two access classes exist:
//   admin  -> staff workspace at /admin
//   client -> private client portal at /client
// Everything else (for example VISITOR) has no workspace access.

export const ADMIN_ROLE_KEYS = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'OFFICE_MANAGER',
  'ACCOUNTANT',
  'SURVEYOR',
  'RECEPTIONIST'
]);

export const CLIENT_ROLE_KEYS = Object.freeze(['CLIENT']);

// Roles that may exist in the database but must never receive a workspace.
export const UNPRIVILEGED_ROLE_KEYS = Object.freeze(['VISITOR']);

export const ACCESS_ADMIN = 'admin';
export const ACCESS_CLIENT = 'client';
export const ACCESS_NONE = 'none';

export const ADMIN_HOME = '/admin';
export const CLIENT_HOME = '/client';
export const PUBLIC_HOME = '/';
export const LOGIN_PATH = '/login';

const HOME_BY_ACCESS = Object.freeze({
  [ACCESS_ADMIN]: ADMIN_HOME,
  [ACCESS_CLIENT]: CLIENT_HOME,
  [ACCESS_NONE]: PUBLIC_HOME
});

export function isAdminRoleKey(key) {
  return typeof key === 'string' && ADMIN_ROLE_KEYS.includes(key);
}

export function isClientRoleKey(key) {
  return typeof key === 'string' && CLIENT_ROLE_KEYS.includes(key);
}

// Accepts roles as [{ key }], [{ role: { key } }] or plain strings, so callers
// can pass a database row, a session payload or a legacy object.
export function roleKeysOf(user) {
  if (!user || !Array.isArray(user.roles)) return [];
  return user.roles
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.key === 'string') return entry.key;
      if (entry && entry.role && typeof entry.role.key === 'string') return entry.role.key;
      return '';
    })
    .filter(Boolean);
}

// The one function that decides which workspace an account belongs to.
// Admin access always wins, so a mixed assignment can never fall back to the
// client portal by accident.
export function accessClassForRoles(roleKeys = []) {
  const keys = (Array.isArray(roleKeys) ? roleKeys : []).filter((key) => typeof key === 'string');
  if (keys.some(isAdminRoleKey)) return ACCESS_ADMIN;
  if (keys.some(isClientRoleKey)) return ACCESS_CLIENT;
  return ACCESS_NONE;
}

export function accessClassForUser(user) {
  return accessClassForRoles(roleKeysOf(user));
}

export function homeForAccessClass(accessClass) {
  return HOME_BY_ACCESS[accessClass] || PUBLIC_HOME;
}

// Route ownership for a URL path. Returns the access class that owns the path,
// or null for public pages.
export function accessClassForPath(pathname) {
  const path = typeof pathname === 'string' ? pathname : '';
  if (path === ADMIN_HOME || path.startsWith(ADMIN_HOME + '/')) return ACCESS_ADMIN;
  if (path === CLIENT_HOME || path.startsWith(CLIENT_HOME + '/')) return ACCESS_CLIENT;
  return null;
}

// Only allow relative, same-origin paths. No external URLs, no protocol-relative
// URLs (//evil.com), no javascript: or data: schemes.
export function isSafeRedirectPath(path) {
  if (typeof path !== 'string' || !path) return false;
  // Must start with / and not be // (protocol-relative) or /\ (Windows path).
  return /^\/[^\/\\]/.test(path);
}
