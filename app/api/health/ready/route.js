import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECK_TIMEOUT_MS = 2500;

export async function GET() {
  const startedAt = Date.now();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database check timed out.')), CHECK_TIMEOUT_MS);
    });
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return NextResponse.json(
      {
        status: 'ready',
        checks: { database: 'ok' },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'unavailable',
        checks: { database: 'error' },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  } finally {
    clearTimeout(timer);
  }
}
