import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { ensureClientProfile } from '../../../../lib/client-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function PATCH(request) {
  const auth = await requirePermission('client.portal');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const phone = clean(input?.phone, 40);
  if (phone && !/^[+()\d\s.-]{7,40}$/.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  }
  const profile = await ensureClientProfile(auth.user);
  const data = {
    companyName: clean(input?.companyName, 160) || null,
    ghanaCard: clean(input?.ghanaCard, 40) || null,
    address: clean(input?.address, 300) || null,
    region: clean(input?.region, 60) || null,
    city: clean(input?.city, 80) || null
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.clientProfile.update({ where: { id: profile.id }, data });
      if (phone !== (auth.user.phone || '')) {
        await tx.user.update({ where: { id: auth.user.id }, data: { phone: phone || null } });
      }
      await recordAudit(tx, auth.user.id, 'client.profile_updated', 'ClientProfile', profile.id, { clientCode: profile.clientCode });
      return saved;
    });
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Client profile could not be updated.', error?.message);
    return NextResponse.json({ error: 'Your profile could not be saved.' }, { status: 503 });
  }
}
