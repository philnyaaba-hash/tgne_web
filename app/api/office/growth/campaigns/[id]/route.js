import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { PROSPECT_STAGES } from '../../../../../../lib/growth';
import { clampInt, optionalString, requiredString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('growth.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (existing.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only drafts can be edited. Cancel the campaign to start again.' }, { status: 409 });
  }

  const data = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    const name = requiredString(input.name, 140);
    if (name.length < 3) return NextResponse.json({ error: 'Give the campaign a name.' }, { status: 400 });
    data.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'subject')) {
    const subject = requiredString(input.subject, 180);
    if (subject.length < 4) return NextResponse.json({ error: 'Write a subject line.' }, { status: 400 });
    data.subject = subject;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'body')) {
    const body = requiredString(input.body, 8000);
    if (body.length < 40) return NextResponse.json({ error: 'Write a message of at least 40 characters.' }, { status: 400 });
    data.body = body;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'preview')) data.preview = optionalString(input.preview, 300);
  if (Object.prototype.hasOwnProperty.call(input, 'minScore')) data.minScore = clampInt(input.minScore, 0, 100, existing.minScore);
  if (Object.prototype.hasOwnProperty.call(input, 'segmentStage')) {
    const stage = optionalString(input.segmentStage, 30);
    if (stage && !PROSPECT_STAGES[stage]) return NextResponse.json({ error: 'Choose a valid audience stage.' }, { status: 400 });
    data.segmentStage = stage;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.outreachCampaign.update({ where: { id }, data });
    await recordAudit(tx, auth.user.id, 'growth.campaign_updated', 'OutreachCampaign', id, { name: updated.name });
    return updated;
  });

  return NextResponse.json({ item });
}
