import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DASHBOARD_ROLES } from './dashboard-access';
import { demoAccountFor } from './demo-accounts';
import { prisma } from './prisma';

const SESSION_COOKIE = 'landledger.office.session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
// Development-only key for demo sessions when no database or AUTH_SECRET is
// configured. It is never used when NODE_ENV is production or DATABASE_URL is set.
const DEMO_FALLBACK_SECRET = 'landledger-local-demo-secret-development-only';

export function isLocalDemoMode(env = process.env) {
  return env.NODE_ENV !== 'production' && !env.DATABASE_URL;
}

export function demoSessionUserId(roleKey) {
  return 'demo:' + roleKey;
}

function authKey() {
  const secret = process.env.AUTH_SECRET || (isLocalDemoMode() ? DEMO_FALLBACK_SECRET : '');
  if (new TextEncoder().encode(secret).length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 bytes.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId, options = {}) {
  return new SignJWT({ sub: userId, purpose: 'office-session', ...(options.demo ? { demo: true } : {}) })
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

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
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
    permissions: access.permissions
  };
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authKey(), { algorithms: ['HS256'] });
    if (payload.purpose !== 'office-session' || typeof payload.sub !== 'string') return null;
    if (payload.demo === true) {
      if (!isLocalDemoMode() || !payload.sub.startsWith('demo:')) return null;
      return demoUserForRole(payload.sub.slice(5));
    }
    return prisma.user.findFirst({
      where: { id: payload.sub, status: 'ACTIVE' },
      select: {
        id: true,
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
    }).then((user) => {
      if (!user) return null;
      const permissions = new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)));
      return {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        phone: user.phone,
        photoUrl: user.photoUrl,
        department: user.department,
        roles: user.roles.map(({ role }) => ({ key: role.key, name: role.name })),
        permissions: [...permissions]
      };
    });
  } catch (error) {
    if (error && (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED')) return null;
    throw error;
  }
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
  if (!user.permissions.includes(permission)) {
    await auditPermissionDenied(user.id, permission);
    return { response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  }
  return { user };
}

export async function requireAnyPermission(permissions) {
  const user = await currentUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!permissions.some((permission) => user.permissions.includes(permission))) {
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
