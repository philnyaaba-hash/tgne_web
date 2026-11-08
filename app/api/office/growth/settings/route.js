import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { getGrowthSettings, saveGrowthSettings } from '../../../../../lib/growth-settings';

export const runtime = 'nodejs';

export async function PATCH(request) {
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

  const settings = await prisma.$transaction(async (tx) => {
    const saved = await saveGrowthSettings(tx, input, auth.user.id);
    await recordAudit(tx, auth.user.id, 'growth.settings_updated', 'Setting', 'growth', {
      minimumScore: saved.target.minimumScore,
      batchLimit: saved.batchLimit
    });
    return saved;
  });

  return NextResponse.json({ settings });
}

export async function GET() {
  const auth = await requirePermission('growth.view');
  if (auth.response) return auth.response;
  return NextResponse.json({ settings: await getGrowthSettings() });
}
