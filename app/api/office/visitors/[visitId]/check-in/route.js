import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { optionalString } from '../../../../../../lib/validation';
import { notifyVisitorEvent } from '../../../../../../lib/notifications';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('visitors.checkin');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input = {};
  try {
    input = await request.json();
  } catch {}
  if (input?.identityVerified !== true) {
    return NextResponse.json({ error: 'Visitor identity must be confirmed before check-in.' }, { status: 400 });
  }
  const meetingRoomId = optionalString(input?.meetingRoomId, 50);
  const note = optionalString(input?.checkInNote, 500);
  const duration = Math.min(60 * 24 * 14, Math.max(15, Number(input?.expectedDurationMinutes) || 0));
  const { visitId } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, select: { id: true, status: true, expectedCheckout: true } });
    if (!visit) return { error: 'Visit not found.', status: 404 };
    if (visit.status === 'AWAITING_APPROVAL') return { error: 'This visit must be approved before check-in.', status: 409 };
    if (visit.status !== 'EXPECTED') return { error: 'Only expected visits can be checked in.', status: 409 };
    if (meetingRoomId) {
      const room = await tx.meetingRoom.findFirst({ where: { id: meetingRoomId, active: true }, select: { id: true } });
      if (!room) return { error: 'Selected meeting room is unavailable.', status: 400 };
    }
    const now = new Date();
    const expectedCheckout = duration ? new Date(now.getTime() + duration * 60 * 1000) : visit.expectedCheckout;
    const changed = await tx.visit.updateMany({
      where: { id: visit.id, status: 'EXPECTED' },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
        checkedInById: auth.user.id,
        hostNotifiedAt: now,
        checkInNote: note,
        meetingRoomId: meetingRoomId || undefined,
        expectedCheckout,
        expectedDurationMinutes: duration || undefined,
        qrVersion: { increment: 1 }
      }
    });
    if (changed.count !== 1) return { error: 'This visit has already changed. Refresh and try again.', status: 409 };
    const updated = await tx.visit.findUniqueOrThrow({
      where: { id: visit.id },
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        meetingRoom: { select: { id: true, name: true, location: true } }
      }
    });
    await recordAudit(tx, auth.user.id, 'visitor.checked_in', 'Visit', visit.id, { visitCode: updated.visitCode, meetingRoomId: meetingRoomId || null });
    return { visit: updated };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  notifyVisitorEvent('checked_in', result.visit, auth.user.id).catch(() => {});
  return NextResponse.json({ visit: result.visit });
}
