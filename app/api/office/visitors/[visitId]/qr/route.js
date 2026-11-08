import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { createVisitorQrToken } from '../../../../../../lib/visitor-qr';
import { getSettings, publicSettings } from '../../../../../../lib/settings';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('visitors.card.print');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { visitId } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      visitor: true,
      host: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
      meetingRoom: { select: { id: true, name: true } }
    }
  });
  if (!visit) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  if (visit.status !== 'CHECKED_IN') return NextResponse.json({ error: 'Visitor access cards are only available during an active visit.' }, { status: 409 });
  let token;
  try {
    token = await createVisitorQrToken(visit);
  } catch (error) {
    if (error.message === 'Visitor access period has expired.') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
  const settings = publicSettings(await getSettings());
  const expiresAt = visit.expectedCheckout || new Date(Date.now() + 8 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await recordAudit(tx, auth.user.id, 'visitor.card_issued', 'Visit', visit.id, { visitCode: visit.visitCode, expiresAt });
  });
  return NextResponse.json({
    token,
    verificationUrl: new URL('/api/visitor-access/verify', request.url).origin,
    expiresAt,
    card: settings.card,
    print: settings.print,
    organization: settings.organization,
    visit: {
      id: visit.id,
      visitCode: visit.visitCode,
      category: visit.category,
      accessZones: visit.accessZones || settings.card.accessZones,
      expectedCheckout: visit.expectedCheckout,
      visitor: {
        visitorId: visit.visitor.visitorId,
        fullName: visit.visitor.fullName,
        organization: visit.visitor.organization,
        photoUrl: visit.visitor.photoUrl
      },
      host: visit.host,
      department: visit.department,
      meetingRoom: visit.meetingRoom
    }
  });
}
