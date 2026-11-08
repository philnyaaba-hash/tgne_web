import { NextResponse } from 'next/server';
import { requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { emailConfigured, sendTestEmail } from '../../../../lib/notifications';
import { cleanEmail, isEmail } from '../../../../lib/validation';
import { getSettings } from '../../../../lib/settings';

export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requirePermission('notifications.manage');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const status = ['SENT', 'FAILED', 'SKIPPED'].includes(params.get('status')) ? params.get('status') : null;
  const notifications = await prisma.notification.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 150
  });
  return NextResponse.json({ notifications, emailConfigured: emailConfigured(), emailFrom: process.env.EMAIL_FROM || null });
}

export async function POST(request) {
  const auth = await requirePermission('notifications.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input = {};
  try {
    input = await request.json();
  } catch {}
  const settings = await getSettings();
  const to = cleanEmail(input?.to) || settings.notifications.opsEmail || auth.user.email;
  if (!isEmail(to)) return NextResponse.json({ error: 'Enter a valid test recipient.' }, { status: 400 });
  const result = await sendTestEmail(to, auth.user.id);
  await prisma.auditEvent.create({
    data: { actorId: auth.user.id, action: 'notifications.test', entityType: 'Notification', metadata: { to, sent: Boolean(result.sent), skipped: Boolean(result.skipped) } }
  });
  if (result.sent) return NextResponse.json({ ok: true, sent: true, to });
  return NextResponse.json({ ok: false, sent: false, skipped: Boolean(result.skipped), error: result.error || result.reason || 'Email could not be sent.' }, { status: result.skipped ? 503 : 502 });
}
