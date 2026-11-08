import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';
import { verifyVisitorQrToken } from '../../../../lib/visitor-qr';

export const runtime = 'nodejs';

export async function POST(request) {
  const throttle = checkRateLimit('visitor-verify:' + clientIp(request), { limit: 120, windowMs: 60 * 1000 });
  if (!throttle.allowed) {
    return NextResponse.json(
      { valid: false, error: 'Too many verification attempts. Try again later.' },
      { status: 429, headers: { 'retry-after': String(throttle.retryAfter), 'cache-control': 'no-store' } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (typeof input.token !== 'string' || input.token.length > 2000) {
    return NextResponse.json({ valid: false, error: 'Visitor access credential is invalid.' }, { status: 400 });
  }
  let claims;
  try {
    claims = await verifyVisitorQrToken(input.token);
  } catch {
    return NextResponse.json({ valid: false, error: 'Visitor access is expired or invalid.' }, { status: 401 });
  }
  const visit = await prisma.visit.findUnique({
    where: { id: claims.visitId },
    select: {
      status: true,
      qrVersion: true,
      expectedCheckout: true,
      visitor: { select: { visitorId: true, fullName: true, organization: true } },
      host: { select: { name: true } },
      department: { select: { name: true } }
    }
  });
  if (!visit || visit.status !== 'CHECKED_IN' || visit.qrVersion !== claims.version) {
    return NextResponse.json({ valid: false, error: 'Visitor access has been revoked.' }, { status: 401 });
  }
  return NextResponse.json({
    valid: true,
    visitor: visit.visitor,
    host: visit.host?.name || null,
    department: visit.department?.name || null,
    expectedCheckout: visit.expectedCheckout
  });
}
