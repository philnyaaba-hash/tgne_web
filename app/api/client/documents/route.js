import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { clientOwnedHolding, ensureClientProfile } from '../../../../lib/client-access';
import { validateDocument } from '../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requirePermission('client.documents');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const validation = validateDocument(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the document details.', fields: validation.errors }, { status: 400 });
  }
  const profile = await ensureClientProfile(auth.user);
  if (validation.value.holdingId) {
    const holding = await clientOwnedHolding(profile, validation.value.holdingId);
    if (!holding) return NextResponse.json({ error: 'That land is not in your portfolio.' }, { status: 403 });
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.clientDocument.create({
        data: { ...validation.value, clientId: profile.id, status: 'PENDING' }
      });
      await recordAudit(tx, auth.user.id, 'client.document_added', 'ClientDocument', created.id, {
        name: created.name,
        type: created.type,
        clientCode: profile.clientCode
      });
      return created;
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Client document could not be created.', error?.message);
    return NextResponse.json({ error: 'The document could not be saved.' }, { status: 503 });
  }
}
