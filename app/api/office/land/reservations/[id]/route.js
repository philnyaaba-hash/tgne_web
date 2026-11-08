import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { isReservationStatus } from '../../../../../../lib/land-commerce';
import { syncReservationAccounts } from '../../../../../../lib/land-accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESERVATION_INCLUDE = {
  listing: { select: { title: true, slug: true, region: true } }
};

export async function PATCH(request, { params }) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const status = String(input?.status || '').toUpperCase();
  if (!isReservationStatus(status)) return NextResponse.json({ error: 'Choose a valid reservation status.' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.landReservation.findUnique({ where: { id }, select: { id: true, reference: true, status: true } });
  if (!existing) return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });

  const canSyncAccounts = auth.user.permissions.includes('finance.manage');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.landReservation.update({
        where: { id },
        data: { status },
        include: RESERVATION_INCLUDE
      });
      await recordAudit(tx, auth.user.id, 'land.reservation_' + status.toLowerCase(), 'LandReservation', id, {
        reference: existing.reference,
        from: existing.status,
        to: status
      });
      const accounts = canSyncAccounts
        ? await syncReservationAccounts(tx, { reservation, actorId: auth.user.id })
        : null;
      return { reservation, accounts };
    }, { timeout: 15000 });

    return NextResponse.json({
      reservation: result.reservation,
      accounts: result.accounts,
      canSyncAccounts
    });
  } catch (error) {
    console.error('Land reservation could not be updated.', error?.message);
    return NextResponse.json({ error: 'The reservation could not be updated.' }, { status: 503 });
  }
}
