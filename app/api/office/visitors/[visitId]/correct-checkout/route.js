import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { parseDate, requiredString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('visitors.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const reason = requiredString(input?.reason, 500);
  if (!reason) return NextResponse.json({ error: 'A correction reason is required.' }, { status: 400 });
  const checkedOutAt = input?.checkedOutAt ? parseDate(input.checkedOutAt) : null;
  if (checkedOutAt && Number.isNaN(checkedOutAt.getTime())) return NextResponse.json({ error: 'Choose a valid check-out time.' }, { status: 400 });
  const { visitId } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, select: { id: true, status: true, checkedOutAt: true } });
    if (!visit) return { error: 'Visit not found.', status: 404 };
    if (visit.status !== 'CHECKED_OUT') return { error: 'Only completed check-outs can be corrected.', status: 409 };
    if (checkedOutAt && visit.checkedOutAt && checkedOutAt < new Date(visit.checkedOutAt.getTime() - 24 * 60 * 60 * 1000)) {
      return { error: 'A corrected check-out time cannot move more than 24 hours earlier.', status: 400 };
    }
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: {
        checkedOutAt: checkedOutAt || new Date(),
        correctionReason: reason,
        correctedById: auth.user.id,
        correctedAt: new Date(),
        qrVersion: { increment: 1 }
      },
      include: { visitor: true, host: { select: { id: true, name: true } } }
    });
    await recordAudit(tx, auth.user.id, 'visitor.checkout_corrected', 'Visit', visitId, {
      reason,
      previousCheckedOutAt: visit.checkedOutAt,
      newCheckedOutAt: updated.checkedOutAt
    });
    return { visit: updated };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
