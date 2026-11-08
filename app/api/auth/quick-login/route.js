import { NextResponse } from 'next/server';
import { createSession, recordAudit, requireSameOrigin, setSessionCookie } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';
import { demoAccountFor, isDemoQuickLoginEnabled } from '../../../../lib/demo-accounts';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60 * 1000;
const ATTEMPT_LIMIT = 30;

export async function POST(request) {
  if (!isDemoQuickLoginEnabled()) {
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

  const user = await prisma.user.findUnique({
    where: { email: demo.email },
    include: { roles: { include: { role: { select: { key: true } } } } }
  });
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
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: now, failedLoginAttempts: 0, lockoutUntil: null }
  });
  await recordAudit(prisma, user.id, 'auth.quick_login', 'User', user.id, { role: demo.role, demo: true });

  const token = await createSession(user.id);
  const response = NextResponse.json(
    { ok: true, user: { id: user.id, name: user.name, email: user.email }, role: demo.role },
    { headers: { 'cache-control': 'no-store' } }
  );
  return setSessionCookie(response, token);
}
