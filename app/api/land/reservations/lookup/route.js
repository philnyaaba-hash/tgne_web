import { NextResponse } from 'next/server';
import { findReservation } from '../../../../../lib/land-store';
import { requireSameOrigin } from '../../../../../lib/office-auth';
import { checkRateLimit, clientIp } from '../../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskEmail(value) {
  const email = String(value || '');
  const [name, domain] = email.split('@');
  if (!name || !domain) return '—';
  return name.slice(0, 1) + '***@' + domain;
}

export async function POST(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const limit = checkRateLimit('land-track:' + clientIp(request), { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many lookups. Please try again shortly.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  const reference = String(input?.reference || '').trim().toUpperCase();
  const email = String(input?.email || '').trim();
  if (!reference || !email) return NextResponse.json({ error: 'Enter your reference and email address.' }, { status: 400 });

  const reservation = await findReservation(reference, email);
  if (!reservation) {
    return NextResponse.json({ error: 'We could not find a reservation with those details.' }, { status: 404 });
  }

  return NextResponse.json({
    reservation: {
      reference: reservation.reference,
      status: reservation.status,
      amount: reservation.amount,
      currency: reservation.currency,
      createdAt: reservation.createdAt,
      buyerName: reservation.buyerName,
      email: maskEmail(reservation.email),
      listing: {
        title: reservation.listing.title,
        slug: reservation.listing.slug,
        region: reservation.listing.region,
        district: reservation.listing.district
      }
    }
  });
}
