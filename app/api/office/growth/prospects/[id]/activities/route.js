import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { optionalString, requiredString } from '../../../../../../../lib/validation';

export const runtime = 'nodejs';

const ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'REPLY'];
const EARLY_STAGES = ['NEW', 'RESEARCHED', 'CONTACTED'];

export async function POST(request, { params }) {
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
  const prospect = await prisma.prospect.findUnique({ where: { id }, select: { id: true, company: true, stage: true } });
  if (!prospect) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

  const type = optionalString(input.type, 20) || 'NOTE';
  const summary = requiredString(input.summary, 200);
  if (!ACTIVITY_TYPES.includes(type)) return NextResponse.json({ error: 'Choose a valid activity type.' }, { status: 400 });
  if (summary.length < 3) return NextResponse.json({ error: 'Describe the activity in a few words.' }, { status: 400 });

  const now = new Date();
  const data = {};
  if (type !== 'NOTE') data.lastContactedAt = now;
  if (type === 'REPLY') {
    data.repliedAt = now;
    data.lastReplySummary = summary;
    if (EARLY_STAGES.includes(prospect.stage)) data.stage = 'RESPONDED';
  }

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.prospectActivity.create({
      data: { prospectId: id, userId: auth.user.id, type, summary, detail: optionalString(input.detail, 4000) }
    });
    await tx.prospect.update({ where: { id }, data });
    await recordAudit(tx, auth.user.id, type === 'REPLY' ? 'growth.prospect_replied' : 'growth.activity_logged', 'Prospect', id, {
      type,
      company: prospect.company
    });
    return activity;
  });

  return NextResponse.json({ item: result }, { status: 201 });
}
