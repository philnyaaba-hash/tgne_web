import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { PROSPECT_STAGES } from '../../../../../lib/growth';
import { clampInt, optionalString, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request) {
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

  const name = requiredString(input.name, 140);
  const subject = requiredString(input.subject, 180);
  const body = requiredString(input.body, 8000);
  const segmentStage = optionalString(input.segmentStage, 30);

  if (name.length < 3) return NextResponse.json({ error: 'Give the campaign a name.' }, { status: 400 });
  if (subject.length < 4) return NextResponse.json({ error: 'Write a subject line.' }, { status: 400 });
  if (body.length < 40) return NextResponse.json({ error: 'Write a message of at least 40 characters.' }, { status: 400 });
  if (segmentStage && !PROSPECT_STAGES[segmentStage]) return NextResponse.json({ error: 'Choose a valid audience stage.' }, { status: 400 });

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.outreachCampaign.create({
      data: {
        name,
        subject,
        preview: optionalString(input.preview, 300),
        body,
        segmentStage,
        minScore: clampInt(input.minScore, 0, 100, 0),
        createdById: auth.user.id
      }
    });
    await recordAudit(tx, auth.user.id, 'growth.campaign_created', 'OutreachCampaign', created.id, { name, segmentStage, minScore: created.minScore });
    return created;
  });

  return NextResponse.json({ item: campaign }, { status: 201 });
}
