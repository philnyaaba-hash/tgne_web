import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = new Set(['NEW', 'READ', 'CLOSED']);

export async function PATCH(request, { params }) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const status = String(input?.status || '').toUpperCase();
  if (!STATUSES.has(status)) return NextResponse.json({ error: 'Choose a valid inquiry status.' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.landInquiry.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.landInquiry.update({ where: { id }, data: { status } });
      await recordAudit(tx, auth.user.id, 'land.inquiry_updated', 'LandInquiry', id, {
        from: existing.status,
        to: status
      });
      return inquiry;
    });
    return NextResponse.json({ inquiry: updated });
  } catch (error) {
    console.error('Land enquiry could not be updated.', error?.message);
    return NextResponse.json({ error: 'The enquiry could not be updated.' }, { status: 503 });
  }
}
