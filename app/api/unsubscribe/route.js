import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyUnsubscribeToken } from '../../../lib/growth';

export const runtime = 'nodejs';

function redirectTo(request, query) {
  return NextResponse.redirect(new URL('/unsubscribe?' + query, request.url), 303);
}

export async function POST(request) {
  let token = '';
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      token = typeof body?.token === 'string' ? body.token : '';
    } else {
      const form = await request.formData();
      token = String(form.get('token') || '');
    }
  } catch {
    return redirectTo(request, 'state=invalid');
  }

  const prospectId = verifyUnsubscribeToken(token);
  if (!prospectId) return redirectTo(request, 'state=invalid');

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, company: true, suppressed: true, consentStatus: true, stage: true }
  });
  if (!prospect) return redirectTo(request, 'state=invalid');
  if (prospect.suppressed && prospect.consentStatus === 'WITHDRAWN') return redirectTo(request, 'done=1');

  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({
      where: { id: prospect.id },
      data: {
        suppressed: true,
        suppressedAt: new Date(),
        suppressionReason: 'Unsubscribed from outreach email',
        consentStatus: 'WITHDRAWN',
        stage: 'SUPPRESSED'
      }
    });
    await tx.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        type: 'SUPPRESSION',
        summary: 'Unsubscribed from outreach email',
        detail: 'Recorded from the unsubscribe link. No further marketing email will be sent.'
      }
    });
    await tx.auditEvent.create({
      data: {
        action: 'growth.prospect_unsubscribed',
        entityType: 'Prospect',
        entityId: prospect.id,
        metadata: { company: prospect.company, source: 'unsubscribe_link' }
      }
    });
  });

  return redirectTo(request, 'done=1');
}
