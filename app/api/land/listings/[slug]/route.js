import { NextResponse } from 'next/server';
import { getPublishedListing } from '../../../../../lib/land-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { slug } = await params;
  const listing = await getPublishedListing(String(slug || '').slice(0, 120));
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  return NextResponse.json({ listing }, { headers: { 'cache-control': 'public, max-age=0, s-maxage=60' } });
}
