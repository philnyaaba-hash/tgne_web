import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DASHBOARD_ROLES, hasPermission, permissionsForRoles } from './dashboard-access';
import { demoAccountFor } from './demo-accounts';
import { isClientUser, roleKeysOf } from './auth-redirect';
import { accessClassForRoles } from './roles';
import { prisma } from './prisma';
import {
  SESSION_COOKIE,
  SESSION_PURPOSE,
  SESSION_TTL_SECONDS,
  isLocalDemoMode,
  resolveSessionSecret
} from './session-constants';

export { SESSION_COOKIE, isLocalDemoMode };

export function demoSessionUserId(roleKey) {
  return 'demo:' + roleKey;
}

function authKey() {
  return resolveSessionSecret();
}

function newSessionId() {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return String(Date.now()) + Math.random().toString(36).slice(2);
  }
}

export async function createSession(userId, options = {}) {
  const payload = {
    sub: userId,
    purpose: SESSION_PURPOSE,
    sid: newSessionId(),
    ...(options.demo ? { demo: true } : {}),
    ...(Number.isSafeInteger(options.sessionVersion) ? { sv: options.sessionVersion } : {})
  };
  // The access class is a coarse hint for the Edge middleware. The database and
  // the server layouts remain authoritative for every permission decision.
  const accessClass = typeof options.accessClass === 'string' ? options.accessClass : accessClassForRoles(options.roleKeys || []);
  if (accessClass && accessClass !== 'none') payload.cls = accessClass;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(authKey());
}

export function setSessionCookie(response, token) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  return response;
}

function normalizeOriginLike(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const canonicalHost = host === 'localhost' || host === '::1' ? '127.0.0.1' : host;
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    return `${url.protocol}//${canonicalHost}:${port}`;
  } catch {
    return null;
  }
}

export function requireSameOrigin(request) {
  const requestOrigin = normalizeOriginLike(request.url);
  const origin = normalizeOriginLike(request.headers.get('origin'));
  if (origin && requestOrigin) return origin === requestOrigin;

  const referer = normalizeOriginLike(request.headers.get('referer'));
  if (referer && requestOrigin) return referer === requestOrigin;

  const host = request.headers.get('host');
  if (host && requestOrigin) {
    const requestHost = new URL(request.url);
    const normalizedHost = host.toLowerCase().replace(/^\[::1\]$/i, '127.0.0.1').replace(/^localhost$/i, '127.0.0.1');
    const canonicalRequestHost = (requestHost.hostname.toLowerCase() === 'localhost' || requestHost.hostname.toLowerCase() === '::1' ? '127.0.0.1' : requestHost.hostname.toLowerCase()) + (requestHost.port ? `:${requestHost.port}` : '');
    return normalizedHost === canonicalRequestHost;
  }

  return false;
}

function demoUserForRole(roleKey) {
  const account = demoAccountFor(roleKey);
  const access = roleKey ? DASHBOARD_ROLES[roleKey] : null;
  if (!account || !access) return null;
  return {
    id: demoSessionUserId(roleKey),
    employeeId: null,
    email: account.email,
    name: account.name,
    jobTitle: access.label,
    phone: null,
    photoUrl: null,
    department: null,
    roles: [{ key: roleKey, name: access.label }],
    permissions: access.permissions,
    accessClass: accessClassForRoles([roleKey])
  };
}

export async function withDbTimeout(operation, timeoutMs = 4_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Database request timed out.')), timeoutMs);
    Promise.resolve()
      .then(operation)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authKey(), { algorithms: ['HS256'] });
    if (payload.purpose !== SESSION_PURPOSE || typeof payload.sub !== 'string') return null;
    if (payload.demo === true) {
      if (process.env.NODE_ENV === 'production' || !payload.sub.startsWith('demo:')) return null;
      return demoUserForRole(payload.sub.slice(5));
    }
    try {
      const user = await withDbTimeout(() => prisma.user.findFirst({
        where: { id: payload.sub, status: 'ACTIVE' },
        select: {
          id: true,
          sessionVersion: true,
          employeeId: true,
          email: true,
          name: true,
          jobTitle: true,
          phone: true,
          photoUrl: true,
          department: { select: { id: true, name: true } },
          roles: {
            select: {
              role: {
                select: {
                  key: true,
                  name: true,
                  permissions: { select: { permission: { select: { key: true } } } }
                }
              }
            }
          }
        }
      }));
      if (!user || !Number.isSafeInteger(payload.sv) || payload.sv !== user.sessionVersion) return null;
      const roles = user.roles.map(({ role }) => ({ key: role.key, name: role.name }));
      const permissions = permissionsForRoles(
        roles.map((role) => role.key),
        user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key))
      );
      return {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        phone: user.phone,
        photoUrl: user.photoUrl,
        department: user.department,
        roles,
        permissions,
        accessClass: accessClassForRoles(roleKeysOf({ roles }))
      };
    } catch {
      console.error('Session profile lookup failed.');
      return null;
    }
  } catch (error) {
    if (error && (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED')) return null;
    throw error;
  }
}

// Revokes every existing token for the current account by moving the stored
// session version forward. Any token minted before this call (including the
// one in this request's cookie) stops resolving, so signing out cannot leave a
// replayable session behind.
export async function invalidateCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, authKey(), { algorithms: ['HS256'] }));
  } catch (error) {
    if (error && ['ERR_JWT_EXPIRED', 'ERR_JWS_INVALID', 'ERR_JWT_CLAIM_VALIDATION_FAILED'].includes(error.code)) return;
    throw error;
  }
  if (payload.purpose !== SESSION_PURPOSE || typeof payload.sub !== 'string' || payload.demo === true) return;
  if (!Number.isSafeInteger(payload.sv)) return;

  await withDbTimeout(() => prisma.user.updateMany({
    where: { id: payload.sub, sessionVersion: payload.sv },
    data: { sessionVersion: { increment: 1 } }
  }));
}

function auditPermissionDenied(userId, permission, permissions) {
  return prisma.auditEvent.create({
    data: {
      actorId: userId,
      action: 'auth.permission_denied',
      entityType: 'permission',
      entityId: permission,
      metadata: permissions && permissions.length > 1 ? { required: permissions } : undefined
    }
  }).catch(() => {
    // An audit write must never block the permission response.
  });
}

export async function requirePermission(permission) {
  const user = await currentUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const isClientPermission = permission.startsWith('client.');
  const permitted = isClientPermission
    ? isClientUser(user) && user.permissions.includes(permission)
    : hasPermission(user, permission);
  if (!permitted) {
    await auditPermissionDenied(user.id, permission);
    return { response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  }
  return { user };
}

export async function requireAnyPermission(permissions) {
  const user = await currentUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!permissions.some((permission) => hasPermission(user, permission))) {
    await auditPermissionDenied(user.id, permissions[0], permissions);
    return { response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  }
  return { user };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  return { user };
}

export async function recordAudit(tx, actorId, action, entityType, entityId, metadata) {
  await tx.auditEvent.create({
    data: { actorId, action, entityType, entityId, metadata: metadata || undefined }
  });
}
