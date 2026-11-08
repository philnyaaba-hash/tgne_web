import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { clientOwnedHolding, ensureClientProfile } from '../../../../../lib/client-access';
import { validateHolding } from '../../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const profile = await ensureClientProfile(auth.user);
  const existing = await clientOwnedHolding(profile, id);
  if (!existing) return NextResponse.json({ error: 'Land holding not found.' }, { status: 404 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const validation = validateHolding({
    title: existing.title,
    region: existing.region,
    district: existing.district,
    community: existing.community,
    sizeAcres: existing.sizeAcres,
    acquisitionDate: existing.acquisitionDate,
    acquisitionPrice: existing.acquisitionPrice,
    currentValue: existing.currentValue,
    titleStatus: existing.titleStatus,
    titleNumber: existing.titleNumber,
    coordinates: existing.coordinates,
    notes: existing.notes,
    ...input
  });
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the land details.', fields: validation.errors }, { status: 400 });
  }

  try {
    const holding = await prisma.$transaction(async (tx) => {
      const updated = await tx.landHolding.update({ where: { id }, data: validation.value });
      await recordAudit(tx, auth.user.id, 'client.holding_updated', 'LandHolding', id, { clientCode: profile.clientCode });
      return updated;
    });
    return NextResponse.json({ holding });
  } catch (error) {
    console.error('Client holding could not be updated.', error?.message);
    return NextResponse.json({ error: 'The land details could not be saved.' }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const profile = await ensureClientProfile(auth.user);
  const existing = await clientOwnedHolding(profile, id);
  if (!existing) return NextResponse.json({ error: 'Land holding not found.' }, { status: 404 });
  const commitments = await prisma.serviceRequest.count({
    where: { holdingId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
  });
  if (commitments) {
    return NextResponse.json({ error: 'This land has open service requests. Close them before removing it.' }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.landHolding.delete({ where: { id } });
      await recordAudit(tx, auth.user.id, 'client.holding_removed', 'LandHolding', id, {
        clientCode: profile.clientCode,
        title: existing.title
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Client holding could not be removed.', error?.message);
    return NextResponse.json({ error: 'The land could not be removed.' }, { status: 503 });
  }
}
