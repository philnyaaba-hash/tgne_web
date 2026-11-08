import { NextResponse } from 'next/server';
import { recordAudit, requireAnyPermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { optionalString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requireAnyPermission(['visitors.manage', 'visitors.approve']);
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input = {};
  try {
    input = await request.json();
  } catch {}
  const note = optionalString(input?.note, 500);
  const { visitId } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, select: { id: true, status: true } });
    if (!visit) return { error: 'Visit not found.', status: 404 };
    if (!['EXPECTED', 'AWAITING_APPROVAL'].includes(visit.status)) {
      return { error: 'Checked-in visitors must be checked out. Completed visits cannot be cancelled.', status: 409 };
    }
    const changed = await tx.visit.updateMany({
      where: { id: visitId, status: visit.status },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: auth.user.id, approvalNote: note || null, qrVersion: { increment: 1 } }
    });
    if (changed.count !== 1) return { error: 'This visit has already changed. Refresh and try again.', status: 409 };
    await recordAudit(tx, auth.user.id, 'visitor.cancelled', 'Visit', visitId, { note });
    return { ok: true };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
