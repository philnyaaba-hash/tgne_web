import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { ensureClientProfile } from '../../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const auth = await requirePermission('client.documents');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const profile = await ensureClientProfile(auth.user);
  const existing = await prisma.clientDocument.findFirst({ where: { id, clientId: profile.id } });
  if (!existing) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (existing.status === 'VERIFIED') {
    return NextResponse.json({ error: 'Verified documents stay on record. Ask the client desk if you need it removed.' }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clientDocument.delete({ where: { id } });
      await recordAudit(tx, auth.user.id, 'client.document_removed', 'ClientDocument', id, { name: existing.name });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Client document could not be removed.', error?.message);
    return NextResponse.json({ error: 'The document could not be removed.' }, { status: 503 });
  }
}
