import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { validateInquiry } from '../../../../lib/land-commerce';
import { requireSameOrigin } from '../../../../lib/office-auth';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const limit = checkRateLimit('land-inquiry:' + clientIp(request), { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages from this device. Please try again shortly.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  }
  if (typeof input.website === 'string' && input.website.trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const validation = validateInquiry(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the form.', fields: validation.errors }, { status: 400 });
  }

  let listingId = null;
  const listingRef = typeof input.listingSlug === 'string' ? input.listingSlug.trim().slice(0, 120) : '';
  try {
    if (listingRef) {
      const listing = await prisma.landListing.findFirst({
        where: { OR: [{ id: listingRef }, { slug: listingRef }] },
        select: { id: true }
      });
      listingId = listing ? listing.id : null;
    }
    await prisma.landInquiry.create({ data: { ...validation.value, listingId } });
  } catch (error) {
    console.error('Service inquiry could not be saved.', error?.message);
    return NextResponse.json({ error: 'We could not save your message. Please call or try again.' }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
