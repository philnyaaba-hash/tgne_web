import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { clientOwnedHolding, ensureClientProfile } from '../../../../lib/client-access';
import { resaleReference, validateResale } from '../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requirePermission('client.resell');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const validation = validateResale(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the resale details.', fields: validation.errors }, { status: 400 });
  }
  const profile = await ensureClientProfile(auth.user);

  if (validation.value.holdingId) {
    const holding = await clientOwnedHolding(profile, validation.value.holdingId);
    if (!holding) return NextResponse.json({ error: 'That land is not in your portfolio.' }, { status: 403 });
    const open = await prisma.resaleRequest.count({
      where: { holdingId: holding.id, status: { in: ['SUBMITTED', 'APPROVED', 'LIVE'] } }
    });
    if (open) return NextResponse.json({ error: 'That land already has an active resale request.' }, { status: 409 });
  }

  try {
    const resale = await prisma.$transaction(async (tx) => {
      const created = await tx.resaleRequest.create({
        data: {
          ...validation.value,
          reference: resaleReference(),
          clientId: profile.id,
          status: 'SUBMITTED'
        }
      });
      await recordAudit(tx, auth.user.id, 'client.resale_submitted', 'ResaleRequest', created.id, {
        reference: created.reference,
        clientCode: profile.clientCode
      });
      return created;
    });
    return NextResponse.json({ resale }, { status: 201 });
  } catch (error) {
    console.error('Client resale request could not be created.', error?.message);
    return NextResponse.json({ error: 'The resale request could not be submitted.' }, { status: 503 });
  }
}
