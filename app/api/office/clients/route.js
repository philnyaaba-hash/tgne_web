import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requirePermission('client.view');
  if (auth.response) return auth.response;

  try {
    const [clients, resales, services, assignees] = await Promise.all([
      prisma.clientProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, status: true } },
          _count: { select: { holdings: true, resales: true, services: true, documents: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.resaleRequest.findMany({
        include: {
          client: { include: { user: { select: { name: true, email: true, phone: true } } } },
          holding: { select: { id: true, title: true, titleStatus: true } },
          listing: { select: { id: true, slug: true, status: true } },
          reviewedBy: { select: { name: true } }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100
      }),
      prisma.serviceRequest.findMany({
        include: {
          client: { include: { user: { select: { name: true, email: true, phone: true } } } },
          holding: { select: { id: true, title: true } },
          assignedTo: { select: { id: true, name: true, jobTitle: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100
      }),
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          roles: { some: { role: { key: { in: ['SURVEYOR', 'OFFICE_MANAGER'] } } } }
        },
        select: { id: true, name: true, jobTitle: true },
        orderBy: { name: 'asc' },
        take: 40
      })
    ]);

    return NextResponse.json({
      clients,
      resales,
      services,
      assignees,
      canManage: auth.user.permissions.includes('client.manage'),
      canFinance: auth.user.permissions.includes('finance.manage'),
      stats: {
        clients: clients.length,
        holdings: clients.reduce((total, client) => total + client._count.holdings, 0),
        pendingResales: resales.filter((resale) => resale.status === 'SUBMITTED').length,
        liveResales: resales.filter((resale) => resale.status === 'LIVE').length,
        openServices: services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status)).length,
        awaitingQuote: services.filter((service) => service.status === 'SUBMITTED').length
      }
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Client desk query failed.', error?.message);
    return NextResponse.json({ error: 'The client desk could not be loaded.' }, { status: 503 });
  }
}
