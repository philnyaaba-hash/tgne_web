import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { clientOwnedService, ensureClientProfile } from '../../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.services');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const profile = await ensureClientProfile(auth.user);
  const existing = await clientOwnedService(profile, id);
  if (!existing) return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const action = String(input?.action || '').toLowerCase();
  const message = typeof input?.message === 'string' ? input.message.trim().slice(0, 2000) : '';

  try {
    const service = await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        if (existing.status !== 'QUOTED') {
          throw Object.assign(new Error('There is no open quote to approve.'), { status: 409 });
        }
        const updated = await tx.serviceRequest.update({ where: { id }, data: { status: 'APPROVED' } });
        await tx.serviceUpdate.create({
          data: {
            requestId: id,
            authorId: auth.user.id,
            authorRole: 'CLIENT',
            message: message || 'Quote approved. Please schedule the work.'
          }
        });
        await recordAudit(tx, auth.user.id, 'client.service_approved', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }
      if (action === 'cancel') {
        if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
          throw Object.assign(new Error('This service can no longer be cancelled.'), { status: 409 });
        }
        const updated = await tx.serviceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
        await tx.serviceUpdate.create({
          data: { requestId: id, authorId: auth.user.id, authorRole: 'CLIENT', message: message || 'Client cancelled this request.' }
        });
        await recordAudit(tx, auth.user.id, 'client.service_cancelled', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }
      if (action === 'message') {
        if (message.length < 2) throw Object.assign(new Error('Write a short message first.'), { status: 400 });
        await tx.serviceUpdate.create({
          data: { requestId: id, authorId: auth.user.id, authorRole: 'CLIENT', message }
        });
        await recordAudit(tx, auth.user.id, 'client.service_message', 'ServiceRequest', id, { reference: existing.reference });
        return existing;
      }
      throw Object.assign(new Error('Choose a valid service action.'), { status: 400 });
    });
    return NextResponse.json({ service });
  } catch (error) {
    if (error?.status) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Client service action failed.', error?.message);
    return NextResponse.json({ error: 'The service request could not be updated.' }, { status: 503 });
  }
}
