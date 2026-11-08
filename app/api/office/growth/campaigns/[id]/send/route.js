import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { appUrl, deliverEmail, emailConfigured } from '../../../../../../../lib/notifications';
import { getSettings } from '../../../../../../../lib/settings';
import { getGrowthSettings } from '../../../../../../../lib/growth-settings';
import { campaignAudienceWhere } from '../../../../../../../lib/growth-audience';
import { buildCampaignEmail, unsubscribeToken } from '../../../../../../../lib/growth';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('growth.send');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const campaign = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (!['APPROVED', 'SENDING'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Approve the campaign before sending it.' }, { status: 409 });
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: 'Unsubscribe links are not configured. Set AUTH_SECRET before sending.' }, { status: 500 });
  }

  const growth = await getGrowthSettings();
  const orgSettings = await getSettings();
  const limit = Math.min(50, Math.max(1, growth.batchLimit || 40));
  const where = { ...campaignAudienceWhere(campaign), campaignRecipients: { none: { campaignId: id } } };

  const prospects = await prisma.prospect.findMany({ where, take: limit, orderBy: [{ score: 'desc' }, { createdAt: 'asc' }] });
  if (!prospects.length) {
    if (campaign.status === 'SENDING') {
      await prisma.outreachCampaign.update({ where: { id }, data: { status: 'SENT', sentAt: campaign.sentAt || new Date() } });
      return NextResponse.json({ sent: 0, failed: 0, skipped: 0, remaining: 0, status: 'SENT' });
    }
    return NextResponse.json({ error: 'No consented prospects match this audience.' }, { status: 400 });
  }

  if (campaign.status !== 'SENDING') {
    await prisma.outreachCampaign.update({ where: { id }, data: { status: 'SENDING' } });
  }

  const summary = { sent: 0, failed: 0, skipped: 0 };
  for (const prospect of prospects) {
    const token = unsubscribeToken(prospect.id);
    if (!token) {
      summary.failed += 1;
      continue;
    }
    const unsubscribeUrl = appUrl() + '/unsubscribe?token=' + encodeURIComponent(token);
    const email = buildCampaignEmail({
      campaign,
      prospect,
      org: { ...orgSettings.organization, ...(growth.senderName ? { name: growth.senderName } : {}) },
      unsubscribeUrl,
      footer: growth.footer
    });

    let result;
    try {
      result = await deliverEmail({
        ...email,
        template: 'growth.campaign',
        entityType: 'OutreachCampaign',
        entityId: id,
        actorId: auth.user.id
      });
    } catch (error) {
      result = { sent: false, error: error.message || 'Email delivery failed.' };
    }

    const status = result.sent ? 'SENT' : result.skipped ? 'SKIPPED' : 'FAILED';
    if (result.sent) summary.sent += 1;
    else if (result.skipped) summary.skipped += 1;
    else summary.failed += 1;

    await prisma.campaignRecipient.upsert({
      where: { campaignId_prospectId: { campaignId: id, prospectId: prospect.id } },
      update: {
        status,
        error: result.error || result.reason || null,
        messageId: result.id || null,
        sentAt: result.sent ? new Date() : null
      },
      create: {
        campaignId: id,
        prospectId: prospect.id,
        email: prospect.email,
        name: prospect.contactName || prospect.company,
        status,
        error: result.error || result.reason || null,
        messageId: result.id || null,
        sentAt: result.sent ? new Date() : null
      }
    });
  }

  const remaining = await prisma.prospect.count({ where });
  const status = remaining ? 'SENDING' : 'SENT';
  await prisma.$transaction(async (tx) => {
    await tx.outreachCampaign.update({
      where: { id },
      data: { status, sentAt: remaining ? campaign.sentAt : campaign.sentAt || new Date() }
    });
    await recordAudit(tx, auth.user.id, 'growth.campaign_batch_sent', 'OutreachCampaign', id, {
      ...summary,
      remaining,
      emailConfigured: emailConfigured()
    });
  });

  return NextResponse.json({ ...summary, remaining, status });
}
