import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { optionalString } from '../../../../../../lib/validation';
import { notifyVisitorEvent } from '../../../../../../lib/notifications';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('visitors.approve');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  const decision = input.decision === 'approve' ? 'EXPECTED' : input.decision === 'deny' ? 'DENIED' : null;
  if (!decision) return NextResponse.json({ error: 'Choose approve or deny.' }, { status: 400 });
  const note = optionalString(input.note, 500);
  const { visitId } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, select: { id: true, status: true, registeredById: true } });
    if (!visit) return { error: 'Visit not found.', status: 404 };
    if (visit.status !== 'AWAITING_APPROVAL') return { error: 'Only visits awaiting approval can be reviewed.', status: 409 };
    if (visit.registeredById === auth.user.id) return { error: 'You cannot review your own request.', status: 403 };
    const changed = await tx.visit.updateMany({
      where: { id: visit.id, status: 'AWAITING_APPROVAL' },
      data: {
        status: decision,
        approvalNote: note || null,
        approvedById: auth.user.id,
        approvedAt: new Date(),
        qrVersion: { increment: 1 }
      }
    });
    if (changed.count !== 1) return { error: 'This visit has already been reviewed. Refresh and try again.', status: 409 };
    const updated = await tx.visit.findUniqueOrThrow({
      where: { id: visit.id },
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        meetingRoom: { select: { id: true, name: true } }
      }
    });
    await recordAudit(tx, auth.user.id, decision === 'EXPECTED' ? 'visitor.approved' : 'visitor.denied', 'Visit', visit.id, { note });
    return { visit: updated };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  notifyVisitorEvent(decision === 'EXPECTED' ? 'approved' : 'denied', result.visit, auth.user.id).catch(() => {});
  return NextResponse.json({ visit: result.visit });
}
