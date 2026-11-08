import { NextResponse } from 'next/server';
import { requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { ensureClientProfile } from '../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const listingId = typeof input?.listingId === 'string' ? input.listingId.slice(0, 40) : '';
  if (!listingId) return NextResponse.json({ error: 'Choose a listing to watch.' }, { status: 400 });

  const listing = await prisma.landListing.findFirst({ where: { id: listingId, status: 'PUBLISHED' }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: 'That listing is not available.' }, { status: 404 });

  const profile = await ensureClientProfile(auth.user);
  const existing = await prisma.landWatch.findUnique({
    where: { clientId_listingId: { clientId: profile.id, listingId } },
    select: { id: true }
  });
  if (existing) {
    await prisma.landWatch.delete({ where: { id: existing.id } });
    return NextResponse.json({ watched: false });
  }
  await prisma.landWatch.create({ data: { clientId: profile.id, listingId } });
  return NextResponse.json({ watched: true });
}
