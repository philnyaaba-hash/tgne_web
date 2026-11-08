import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'landledger',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
