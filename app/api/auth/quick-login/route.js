import { NextResponse } from 'next/server';
import { createSession, demoSessionUserId, isLocalDemoMode, recordAudit, requireSameOrigin, setSessionCookie, withDbTimeout } from '../../../../lib/office-auth';
import { workspacePathForUser } from '../../../../lib/auth-redirect';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';
import { demoAccountFor, isDemoQuickLoginEnabled } from '../../../../lib/demo-accounts';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60 * 1000;
const ATTEMPT_LIMIT = 30;

export async function POST(request) {
  // Development without a database signs the demo roles in locally instead of
  // querying seeded users. Production always requires a real account.
  const localDemo = isLocalDemoMode();
  if (!isDemoQuickLoginEnabled() && !localDemo) {
    return NextResponse.json(
      { error: 'Demo quick sign-in is disabled on this deployment.' },
      { status: 404, headers: { 'cache-control': 'no-store' } }
    );
  }
  if (!requireSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const throttle = checkRateLimit('auth:quick:' + clientIp(request), {
    limit: ATTEMPT_LIMIT,
    windowMs: WINDOW_MS
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many quick sign-in attempts. Try again shortly.' },
      { status: 429, headers: { 'retry-after': String(throttle.retryAfter), 'cache-control': 'no-store' } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  const demo = demoAccountFor(typeof input?.role === 'string' ? input.role : '');
  if (!demo) {
    return NextResponse.json({ error: 'Unknown demo role.' }, { status: 400 });
  }

  // One-click role sign-in is only acceptable when there is no database to
  // authenticate against. With a database configured the account's stored
  // roles must be verified, even in development.
  if (localDemo) {
    const token = await createSession(demoSessionUserId(demo.role), { demo: true, roleKeys: [demo.role] });
    const response = NextResponse.json(
      {
        ok: true,
        demo: true,
        user: { id: demoSessionUserId(demo.role), name: demo.name, email: demo.email },
        role: demo.role,
        redirectTo: workspacePathForUser({ roles: [{ key: demo.role }] })
      },
      { headers: { 'cache-control': 'no-store' } }
    );
    return setSessionCookie(response, token);
  }

  let user;
  try {
    user = await withDbTimeout(() => prisma.user.findUnique({
      where: { email: demo.email },
      include: { roles: { include: { role: { select: { key: true } } } } }
    }));
  } catch {
    return NextResponse.json(
      { error: 'The workspace database is currently unavailable. Try again shortly.' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Demo account is not seeded. Run npm run seed:demo.' },
      { status: 409, headers: { 'cache-control': 'no-store' } }
    );
  }
  if (!user.roles.some((entry) => entry.role.key === demo.role)) {
    return NextResponse.json(
      { error: 'Demo account role does not match. Re-run npm run seed:demo.' },
      { status: 409, headers: { 'cache-control': 'no-store' } }
    );
  }

  const now = new Date();
  try {
    await withDbTimeout(() => prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, failedLoginAttempts: 0, lockoutUntil: null }
    }));
  } catch {
    // Keep the demo session alive even if the database write is briefly unavailable.
  }
  await recordAudit(prisma, user.id, 'auth.quick_login', 'User', user.id, { role: demo.role, demo: true }).catch(() => {});

  const roleKeys = user.roles.map((entry) => entry.role.key);
  const token = await createSession(user.id, { sessionVersion: user.sessionVersion, roleKeys });
  const response = NextResponse.json(
    {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
      role: demo.role,
      redirectTo: workspacePathForUser({ roles: roleKeys.map((key) => ({ key })) })
    },
    { headers: { 'cache-control': 'no-store' } }
  );
  return setSessionCookie(response, token);
}
