import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { PROSPECT_STAGES } from '../../../../../lib/growth';
import { campaignAudienceWhere } from '../../../../../lib/growth-audience';
import { clampInt, optionalString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requirePermission('growth.view');
  if (auth.response) return auth.response;

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  }

  const segmentStage = optionalString(input.segmentStage, 30);
  if (segmentStage && !PROSPECT_STAGES[segmentStage]) {
    return NextResponse.json({ error: 'Choose a valid audience stage.' }, { status: 400 });
  }
  const where = campaignAudienceWhere({ segmentStage, minScore: clampInt(input.minScore, 0, 100, 0) });
  const [count, sample] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      take: 8,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, company: true, contactName: true, email: true, score: true, stage: true }
    })
  ]);

  return NextResponse.json({ count, sample });
}
