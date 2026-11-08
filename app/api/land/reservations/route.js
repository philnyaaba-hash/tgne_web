import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { reservationAmount, reservationReference, validateReservation } from '../../../../lib/land-commerce';
import { requireSameOrigin } from '../../../../lib/office-auth';
import { checkRateLimit, clientIp } from '../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const limit = checkRateLimit('land-reserve:' + clientIp(request), { limit: 4, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many reservation attempts. Please try again in a few minutes.' },
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

  const validation = validateReservation(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the form.', fields: validation.errors }, { status: 400 });
  }

  const listingRef = String(input.listingSlug || input.listingId || '').trim().slice(0, 120);
  if (!listingRef) return NextResponse.json({ error: 'Choose a listing first.' }, { status: 400 });

  let listing;
  try {
    listing = await prisma.landListing.findFirst({
      where: { OR: [{ id: listingRef }, { slug: listingRef }], status: 'PUBLISHED' }
    });
  } catch (error) {
    console.error('Land reservation lookup failed.', error?.message);
    return NextResponse.json({ error: 'The storefront is temporarily unavailable. Please try again.' }, { status: 503 });
  }
  if (!listing) return NextResponse.json({ error: 'This listing is no longer available to reserve.' }, { status: 404 });

  const amount = reservationAmount(listing.price);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reference = reservationReference(new Date(), randomBytes);
    try {
      await prisma.landReservation.create({
        data: {
          reference,
          listingId: listing.id,
          buyerName: validation.value.buyerName,
          email: validation.value.email,
          phone: validation.value.phone,
          amount,
          currency: listing.currency,
          paymentMethod: validation.value.paymentMethod,
          note: validation.value.note || null
        }
      });
      return NextResponse.json({ ok: true, reference, amount, currency: listing.currency }, { status: 201 });
    } catch (error) {
      if (error?.code === 'P2002') continue;
      console.error('Land reservation could not be saved.', error?.message);
      return NextResponse.json({ error: 'We could not hold this plot. Please try again or contact the office.' }, { status: 503 });
    }
  }

  return NextResponse.json({ error: 'We could not generate a reservation reference. Please try again.' }, { status: 503 });
}
