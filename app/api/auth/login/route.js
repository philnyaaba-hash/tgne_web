import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSession, recordAudit, requireSameOrigin, setSessionCookie } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';

// Compared against when the email is unknown so response time does not reveal
// whether an account exists.
const DUMMY_HASH = '$2b$10$RMXKmURNKhU3aM8lX1RKAePvns8ZxSRVtbYwSDFb/hOeroWhZtzg.';
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 60;
const FAILED_ATTEMPTS_BEFORE_LOCK = 5;
// 1, 2, 4, 8 minutes, then capped at 15.
const LOCKOUT_STEPS_MS = [60_000, 120_000, 240_000, 480_000, 900_000];

function lockoutDurationMs(lockoutCount) {
  const index = Math.max(lockoutCount - 1, 0);
  return LOCKOUT_STEPS_MS[Math.min(index, LOCKOUT_STEPS_MS.length - 1)];
}

function audit(actorId, action, entityId, metadata) {
  return recordAudit(prisma, actorId, action, 'user', entityId, metadata).catch(() => {
    // An audit write must never block a sign-in response.
  });
}

function unauthorized() {
  return NextResponse.json(
    { error: 'Email or password is incorrect.' },
    { status: 401, headers: { 'cache-control': 'no-store' } }
  );
}

export async function POST(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const throttle = checkRateLimit('auth:login:' + clientIp(request), {
    limit: LOGIN_ATTEMPT_LIMIT,
    windowMs: LOGIN_WINDOW_MS
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: { 'retry-after': String(throttle.retryAfter), 'cache-control': 'no-store' } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!email || email.length > 254 || !password || password.length > 200) {
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const now = new Date();
  if (!user) {
    await compare(password, DUMMY_HASH);
    await audit(null, 'auth.sign_in_failed', null, { email, reason: 'unknown_account' });
    return unauthorized();
  }
  if (user.status !== 'ACTIVE') {
    await compare(password, user.passwordHash);
    await audit(user.id, 'auth.sign_in_failed', user.id, { reason: 'inactive_account' });
    return unauthorized();
  }
  if (user.lockoutUntil && user.lockoutUntil > now) {
    return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, {
      status: 429,
      headers: { 'retry-after': String(Math.ceil((user.lockoutUntil - now) / 1000)) }
    });
  }

  const matches = await compare(password, user.passwordHash);
  if (!matches) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= FAILED_ATTEMPTS_BEFORE_LOCK;
    let lockoutUntil = null;
    let lockoutCount = user.lockoutCount;
    if (locked) {
      lockoutCount += 1;
      lockoutUntil = new Date(now.getTime() + lockoutDurationMs(lockoutCount));
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockoutCount,
        lockoutUntil
      }
    });
    await audit(user.id, 'auth.sign_in_failed', user.id, { email, attempts, locked });
    if (locked) {
      await audit(user.id, 'auth.lockout', user.id, { email, minutes: Math.round((lockoutUntil - now) / 60_000) });
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.' },
        {
          status: 429,
          headers: { 'retry-after': String(Math.ceil((lockoutUntil - now) / 1000)), 'cache-control': 'no-store' }
        }
      );
    }
    return unauthorized();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockoutCount: 0, lockoutUntil: null, lastLoginAt: now }
  });
  await audit(user.id, 'auth.sign_in', user.id, {});
  const token = await createSession(user.id);
  const response = NextResponse.json(
    { ok: true, user: { id: user.id, name: user.name, email: user.email } },
    { headers: { 'cache-control': 'no-store' } }
  );
  return setSessionCookie(response, token);
}
