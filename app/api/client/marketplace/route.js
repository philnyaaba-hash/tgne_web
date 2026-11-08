import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { ensureClientProfile, getClientMarketplace } from '../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  try {
    const profile = await ensureClientProfile(auth.user);
    const result = await getClientMarketplace(profile, {
      query: params.get('q'),
      region: params.get('region'),
      landType: params.get('landType')
    });
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Client marketplace query failed.', error?.message);
    return NextResponse.json({ error: 'The land marketplace could not be loaded.' }, { status: 503 });
  }
}
