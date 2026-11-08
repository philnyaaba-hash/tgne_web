import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';

export const runtime = 'nodejs';

const RECIPIENT_LIMIT = 200;

export async function GET(_request, { params }) {
  const auth = await requirePermission('growth.view');
  if (auth.response) return auth.response;

  const { id } = await params;
  const campaign = await prisma.outreachCampaign.findUnique({
    where: { id },
    include: {
      approvedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const [statusCounts, repliedCount, recipients] = await Promise.all([
    prisma.campaignRecipient.groupBy({ by: ['status'], where: { campaignId: id }, _count: { _all: true } }),
    prisma.campaignRecipient.count({ where: { campaignId: id, prospect: { repliedAt: { not: null } } } }),
    prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
      take: RECIPIENT_LIMIT,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        error: true,
        sentAt: true,
        prospect: { select: { id: true, company: true, repliedAt: true, lastReplySummary: true } }
      }
    })
  ]);

  const delivery = { sent: 0, failed: 0, skipped: 0, queued: 0, replied: repliedCount, total: 0 };
  for (const row of statusCounts) {
    const value = row._count._all;
    delivery.total += value;
    if (row.status === 'SENT') delivery.sent += value;
    else if (row.status === 'FAILED') delivery.failed += value;
    else if (row.status === 'SKIPPED' || row.status === 'UNSUBSCRIBED') delivery.skipped += value;
    else delivery.queued += value;
  }

  return NextResponse.json({
    campaign,
    delivery,
    recipients,
    truncated: delivery.total > recipients.length
  });
}
