import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../lib/office-auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Signed out' });
  return clearSessionCookie(response);
}
