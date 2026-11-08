import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { ensureClientProfile } from '../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const subject = clean(input?.subject, 160);
  const body = clean(input?.message, 2000);
  if (body.length < 10) return NextResponse.json({ error: 'Write at least 10 characters so we can help.' }, { status: 400 });

  const profile = await ensureClientProfile(auth.user);
  const message = (subject ? 'Subject: ' + subject + '\n\n' : '') + body;

  try {
    const inquiry = await prisma.$transaction(async (tx) => {
      const created = await tx.landInquiry.create({
        data: {
          type: 'GENERAL',
          name: auth.user.name,
          email: auth.user.email,
          phone: auth.user.phone || null,
          message,
          status: 'NEW'
        }
      });
      await recordAudit(tx, auth.user.id, 'client.support_message', 'LandInquiry', created.id, {
        clientCode: profile.clientCode,
        subject: subject || null
      });
      return created;
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    console.error('Client support message failed.', error?.message);
    return NextResponse.json({ error: 'Your message could not be sent.' }, { status: 503 });
  }
}
