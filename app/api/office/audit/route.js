import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requirePermission('audit.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const requested = Number(params.get('limit') || 150);
  const limit = Number.isFinite(requested) ? Math.min(500, Math.max(1, Math.floor(requested))) : 150;
  const query = (params.get('q') || '').trim().slice(0, 100);
  const action = (params.get('action') || '').trim().slice(0, 100);
  const from = params.get('from') ? new Date(params.get('from')) : null;
  const to = params.get('to') ? new Date(params.get('to')) : null;
  const where = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(from && !Number.isNaN(from.getTime()) ? { createdAt: { gte: from } } : {}),
    ...(to && !Number.isNaN(to.getTime()) ? { createdAt: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), lte: to } } : {}),
    ...(query ? {
      OR: [
        { action: { contains: query, mode: 'insensitive' } },
        { entityType: { contains: query, mode: 'insensitive' } },
        { entityId: { contains: query, mode: 'insensitive' } },
        { actor: { name: { contains: query, mode: 'insensitive' } } }
      ]
    } : {})
  };
  const [events, actions] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    }),
    prisma.auditEvent.groupBy({ by: ['action'], _count: { _all: true }, orderBy: { _count: { action: 'desc' } }, take: 40 })
  ]);
  return NextResponse.json({ events, actions: actions.map(({ action: name, _count }) => ({ action: name, count: _count._all })) });
}
