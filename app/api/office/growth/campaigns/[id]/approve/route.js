import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { campaignAudienceWhere } from '../../../../../../../lib/growth-audience';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('growth.send');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const campaign = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (campaign.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only draft campaigns can be approved.' }, { status: 409 });
  }

  const audience = await prisma.prospect.count({ where: campaignAudienceWhere(campaign) });
  if (!audience) {
    return NextResponse.json({ error: 'No consented prospects match this audience. Review the segment and consent records first.' }, { status: 400 });
  }

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.outreachCampaign.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: auth.user.id, approvedAt: new Date() }
    });
    await recordAudit(tx, auth.user.id, 'growth.campaign_approved', 'OutreachCampaign', id, {
      name: campaign.name,
      audience
    });
    return updated;
  });

  return NextResponse.json({ item, audience });
}
