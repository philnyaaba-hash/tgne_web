import { NextResponse } from 'next/server';
import { recordAudit, requireAnyPermission, requireSameOrigin } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { optionalString } from '../../../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requireAnyPermission(['growth.manage', 'growth.send']);
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const campaign = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (!['DRAFT', 'APPROVED'].includes(campaign.status)) {
    return NextResponse.json({ error: 'This campaign can no longer be cancelled.' }, { status: 409 });
  }

  let reason = '';
  try {
    const body = await request.json();
    reason = optionalString(body?.reason, 300) || '';
  } catch {
    reason = '';
  }

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.outreachCampaign.update({ where: { id }, data: { status: 'CANCELLED' } });
    await recordAudit(tx, auth.user.id, 'growth.campaign_cancelled', 'OutreachCampaign', id, { name: campaign.name, reason });
    return updated;
  });

  return NextResponse.json({ item });
}
