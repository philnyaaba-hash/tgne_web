import { NextResponse } from 'next/server';
import { requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { syncReservationAccounts } from '../../../../../../lib/land-accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYNC_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];

export async function POST(request) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!auth.user.permissions.includes('finance.manage')) {
    return NextResponse.json({ error: 'You need finance permission to post reservation invoices and payments.' }, { status: 403 });
  }
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  try {
    const reservations = await prisma.landReservation.findMany({
      where: { status: { in: SYNC_STATUSES } },
      include: { listing: { select: { title: true, slug: true, region: true } } },
      orderBy: { createdAt: 'asc' },
      take: 500
    });

    const summary = {
      checked: reservations.length,
      invoicesCreated: 0,
      invoicesReissued: 0,
      invoicesVoided: 0,
      paymentsRecorded: 0,
      skipped: [],
      errors: []
    };

    for (const reservation of reservations) {
      try {
        const result = await prisma.$transaction(
          (tx) => syncReservationAccounts(tx, { reservation, actorId: auth.user.id }),
          { timeout: 15000 }
        );
        if (result.invoiceCreated) summary.invoicesCreated += 1;
        if (result.invoiceReissued) summary.invoicesReissued += 1;
        if (result.invoiceVoided) summary.invoicesVoided += 1;
        if (result.paymentRecorded) summary.paymentsRecorded += 1;
        if (result.skipped) summary.skipped.push({ reference: reservation.reference, reason: result.skipped });
      } catch (error) {
        console.error('Reservation accounts sync failed for ' + reservation.reference + '.', error?.message);
        summary.errors.push({ reference: reservation.reference, message: 'Could not post this reservation to the ledger.' });
      }
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error('Land pipeline sync failed.', error?.message);
    return NextResponse.json({ error: 'The accounts sync could not be completed.' }, { status: 503 });
  }
}
