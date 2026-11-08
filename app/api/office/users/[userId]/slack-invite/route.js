import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { sendSlackInviteEmail } from '../../../../../../lib/notifications';
import { prisma } from '../../../../../../lib/prisma';
import { slackInviteUrl } from '../../../../../../lib/slack';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const auth = await requirePermission('staff.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, slackEmail: true, status: true }
  });
  if (!user) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Reactivate this staff member before sending a Slack invite.' }, { status: 409 });
  }
  const inviteUrl = slackInviteUrl();
  if (!inviteUrl) {
    return NextResponse.json({ error: 'No Slack invite link is configured. Set SLACK_INVITE_URL to enable invitations.' }, { status: 503 });
  }
  const to = user.slackEmail || user.email;
  const result = await sendSlackInviteEmail({ to, name: user.name, inviteUrl, actorId: auth.user.id, userId: user.id });
  if (!result.sent) {
    return NextResponse.json(
      { error: result.error || result.reason || 'The Slack invite could not be sent.' },
      { status: result.skipped ? 503 : 502 }
    );
  }
  await recordAudit(prisma, auth.user.id, 'staff.slack_invite_sent', 'User', user.id, {
    recipientDomain: to.split('@')[1] || null,
    viaSlackEmail: Boolean(user.slackEmail)
  });
  return NextResponse.json({ ok: true, sent: true, to });
}
