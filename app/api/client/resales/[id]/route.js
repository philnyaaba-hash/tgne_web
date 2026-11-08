import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { clientOwnedResale, ensureClientProfile } from '../../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.resell');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const profile = await ensureClientProfile(auth.user);
  const existing = await clientOwnedResale(profile, id);
  if (!existing) return NextResponse.json({ error: 'Resale request not found.' }, { status: 404 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const action = String(input?.action || '').toLowerCase();

  try {
    const resale = await prisma.$transaction(async (tx) => {
      if (action === 'withdraw') {
        if (!['SUBMITTED', 'APPROVED', 'LIVE', 'REJECTED'].includes(existing.status)) {
          throw Object.assign(new Error('This resale can no longer be withdrawn.'), { status: 409 });
        }
        const updated = await tx.resaleRequest.update({ where: { id }, data: { status: 'WITHDRAWN' } });
        if (existing.listingId) {
          await tx.landListing.update({ where: { id: existing.listingId }, data: { status: 'ARCHIVED' } }).catch(() => {});
        }
        if (existing.holdingId) {
          await tx.landHolding.update({ where: { id: existing.holdingId }, data: { status: 'ACTIVE' } }).catch(() => {});
        }
        await recordAudit(tx, auth.user.id, 'client.resale_withdrawn', 'ResaleRequest', id, { reference: existing.reference });
        return updated;
      }
      if (action === 'resubmit') {
        if (!['REJECTED', 'WITHDRAWN', 'DRAFT'].includes(existing.status)) {
          throw Object.assign(new Error('This resale is already with the client desk.'), { status: 409 });
        }
        const updated = await tx.resaleRequest.update({
          where: { id },
          data: { status: 'SUBMITTED', reviewNote: null, reviewedAt: null, reviewedById: null }
        });
        await recordAudit(tx, auth.user.id, 'client.resale_resubmitted', 'ResaleRequest', id, { reference: existing.reference });
        return updated;
      }
      throw Object.assign(new Error('Choose a valid resale action.'), { status: 400 });
    });
    return NextResponse.json({ resale });
  } catch (error) {
    if (error?.status) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Client resale action failed.', error?.message);
    return NextResponse.json({ error: 'The resale request could not be updated.' }, { status: 503 });
  }
}
