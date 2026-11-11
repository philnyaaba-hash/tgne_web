import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requirePermission('client.view');
  if (auth.response) return auth.response;

  try {
    const [clients, services, assignees, inquiries] = await Promise.all([
      prisma.clientProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, status: true } },
          _count: { select: { services: true, documents: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.serviceRequest.findMany({
        include: {
          client: { include: { user: { select: { name: true, email: true, phone: true } } } },
          assignedTo: { select: { id: true, name: true, jobTitle: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100
      }),
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          roles: { some: { role: { key: { notIn: ['CLIENT', 'VISITOR'] } } } }
        },
        select: { id: true, name: true, jobTitle: true },
        orderBy: { name: 'asc' },
        take: 40
      }),
      prisma.landInquiry.findMany({
        where: { listingId: null, type: 'GENERAL' },
        select: { id: true, name: true, email: true, phone: true, message: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200
      })
    ]);

    return NextResponse.json({
      clients,
      services,
      assignees,
      inquiries,
      canManage: auth.user.permissions.includes('client.manage'),
      canFinance: auth.user.permissions.includes('finance.manage'),
      stats: {
        clients: clients.length,
        openServices: services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status)).length,
        awaitingQuote: services.filter((service) => service.status === 'SUBMITTED').length,
        newInquiries: inquiries.filter((inquiry) => inquiry.status === 'NEW').length
      }
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Client desk query failed.', error?.message);
    return NextResponse.json({ error: 'The client desk could not be loaded.' }, { status: 503 });
  }
}
