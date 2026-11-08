import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { clientOwnedHolding, ensureClientProfile } from '../../../../lib/client-access';
import { serviceReference, validateService } from '../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requirePermission('client.services');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const validation = validateService(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the service request.', fields: validation.errors }, { status: 400 });
  }
  const profile = await ensureClientProfile(auth.user);
  if (validation.value.holdingId) {
    const holding = await clientOwnedHolding(profile, validation.value.holdingId);
    if (!holding) return NextResponse.json({ error: 'That land is not in your portfolio.' }, { status: 403 });
  }

  try {
    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceRequest.create({
        data: { ...validation.value, reference: serviceReference(), clientId: profile.id, status: 'SUBMITTED' }
      });
      await tx.serviceUpdate.create({
        data: {
          requestId: created.id,
          authorRole: 'SYSTEM',
          message: 'Request received. The client desk will review it and issue a quote.'
        }
      });
      await recordAudit(tx, auth.user.id, 'client.service_requested', 'ServiceRequest', created.id, {
        reference: created.reference,
        type: created.type,
        clientCode: profile.clientCode
      });
      return created;
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Client service request could not be created.', error?.message);
    return NextResponse.json({ error: 'The service request could not be submitted.' }, { status: 503 });
  }
}
