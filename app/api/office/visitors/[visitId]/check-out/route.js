import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { notifyVisitorEvent } from '../../../../../../lib/notifications';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('visitors.checkout');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  if (typeof input.cardReturned !== 'boolean') return NextResponse.json({ error: 'Confirm whether the visitor card was returned.' }, { status: 400 });
  const note = typeof input.cardReturnNote === 'string' ? input.cardReturnNote.trim().slice(0, 500) : '';
  if (!input.cardReturned && !note) return NextResponse.json({ error: 'Add a note when a visitor card is missing or damaged.' }, { status: 400 });
  const { visitId } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, select: { id: true, status: true, checkedInAt: true } });
    if (!visit) return { error: 'Visit not found.', status: 404 };
    if (visit.status !== 'CHECKED_IN') {
      return { error: 'Only checked-in visitors can be checked out. Use the correction workflow for completed visits.', status: 409 };
    }
    const now = new Date();
    const changed = await tx.visit.updateMany({
      where: { id: visit.id, status: 'CHECKED_IN' },
      data: {
        status: 'CHECKED_OUT',
        checkedOutAt: now,
        checkedOutById: auth.user.id,
        cardReturned: input.cardReturned,
        cardReturnNote: note || null,
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
        meetingRoom: { select: { id: true, name: true } }
      }
    });
    await recordAudit(tx, auth.user.id, 'visitor.checked_out', 'Visit', visit.id, {
      cardReturned: input.cardReturned,
      durationMinutes: visit.checkedInAt ? Math.round((now.getTime() - visit.checkedInAt.getTime()) / 60000) : null
    });
    return { visit: updated };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  notifyVisitorEvent('checked_out', result.visit, auth.user.id).catch(() => {});
  return NextResponse.json({ visit: result.visit });
}
