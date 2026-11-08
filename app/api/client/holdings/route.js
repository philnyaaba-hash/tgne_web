import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { ensureClientProfile } from '../../../../lib/client-access';
import { validateHolding } from '../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const validation = validateHolding(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the land details.', fields: validation.errors }, { status: 400 });
  }
  const profile = await ensureClientProfile(auth.user);

  try {
    const holding = await prisma.$transaction(async (tx) => {
      const created = await tx.landHolding.create({ data: { ...validation.value, clientId: profile.id } });
      await recordAudit(tx, auth.user.id, 'client.holding_added', 'LandHolding', created.id, {
        clientCode: profile.clientCode,
        title: created.title
      });
      return created;
    });
    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    console.error('Client holding could not be created.', error?.message);
    return NextResponse.json({ error: 'The land could not be added to your portfolio.' }, { status: 503 });
  }
}
