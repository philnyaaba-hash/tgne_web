import { NextResponse } from 'next/server';
import { clearSessionCookie, invalidateCurrentSession, requireSameOrigin } from '../../../../lib/office-auth';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await invalidateCurrentSession();
  } catch (error) {
    console.error('Session invalidation failed.', error?.message);
    return NextResponse.json({ error: 'Your session could not be invalidated. Please try again.' }, { status: 503 });
  }
  return clearSessionCookie(NextResponse.json({ ok: true, message: 'Signed out' }, {
    headers: { 'cache-control': 'no-store' }
  }));
}
