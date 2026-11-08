import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { getClientWorkspace } from '../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  try {
    const workspace = await getClientWorkspace(auth.user);
    return NextResponse.json(workspace, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Client workspace query failed.', error?.message);
    return NextResponse.json({ error: 'Your client workspace could not be loaded.' }, { status: 503 });
  }
}
