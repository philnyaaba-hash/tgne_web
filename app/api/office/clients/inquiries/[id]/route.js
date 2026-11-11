import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INQUIRY_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  if (!INQUIRY_STATUSES.has(input?.status)) {
    return NextResponse.json({ error: 'Choose a valid inquiry status.' }, { status: 400 });
  }

  try {
    const inquiry = await prisma.$transaction(async (tx) => {
      const existing = await tx.landInquiry.findFirst({
        where: { id, listingId: null, type: 'GENERAL' },
        select: { id: true, status: true }
      });
      if (!existing) return null;

      const updated = await tx.landInquiry.update({
        where: { id },
        data: { status: input.status },
        select: { id: true, status: true }
      });
      await recordAudit(tx, auth.user.id, 'client.inquiry_status_changed', 'LandInquiry', id, {
        from: existing.status,
        to: updated.status
      });
      return updated;
    });

    if (!inquiry) return NextResponse.json({ error: 'Service inquiry not found.' }, { status: 404 });
    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error('Service inquiry could not be updated.', error?.message);
    return NextResponse.json({ error: 'The service inquiry could not be updated.' }, { status: 503 });
  }
}
