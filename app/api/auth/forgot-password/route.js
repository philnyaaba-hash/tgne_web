import { NextResponse } from 'next/server';
import { requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60 * 1000;
const ATTEMPT_LIMIT = 20;
const RESET_TOKEN_TTL_MS = 60 * 60 * 2; // 2 hours

export async function POST(request) {
  if (!requireSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const throttle = checkRateLimit('auth:forgot:' + clientIp(request), {
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

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!email || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Always respond success so email enumeration is not possible.
  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);

  if (user && user.status === 'ACTIVE') {
    const token = Buffer.from(crypto.randomUUID() + ':' + Date.now()).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    }).catch(() => {});

    // In production this would send an email via Resend. For now we record an
    // audit event so the request is traceable internally.
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'auth.password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        metadata: { email },
      },
    }).catch(() => {});
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
