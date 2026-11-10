import { NextResponse } from 'next/server';
import { requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60 * 1000;
const ATTEMPT_LIMIT = 20;

export async function POST(request) {
  if (!requireSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const throttle = checkRateLimit('auth:reset:' + clientIp(request), {
    limit: ATTEMPT_LIMIT,
    windowMs: WINDOW_MS,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'retry-after': String(throttle.retryAfter), 'cache-control': 'no-store' } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  const token = typeof input.token === 'string' ? input.token : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!token || !password || password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Please provide a valid reset link and password.' }, { status: 400 });
  }

  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: reset.userId } });
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Account is not active.' }, { status: 400 });
  }

  const { hash } = await (await import('bcryptjs')).hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, failedLoginAttempts: 0, lockoutUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { used: true },
    }),
    prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'auth.password_reset',
        entityType: 'user',
        entityId: user.id,
        metadata: {},
      },
    }),
  ]).catch(() => {
    return NextResponse.json({ error: 'Password could not be reset. Try again.' }, { status: 500 });
  });

  return NextResponse.json(
    { ok: true, message: 'Your password has been reset. You can now sign in.' },
    { headers: { 'cache-control': 'no-store' } }
  );
}
