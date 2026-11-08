import { NextResponse } from 'next/server';
import { parseListingFilters } from '../../../../lib/land-commerce';
import { listPublishedListings } from '../../../../lib/land-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseListingFilters(new URL(request.url).searchParams);
  const result = await listPublishedListings(filters);
  return NextResponse.json(result, {
    headers: { 'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' }
  });
}
