// Bridges storefront reservations into the finance ledger.
// Invoice numbers and payment references are derived from the reservation
// reference so repeated status changes stay idempotent without new columns.

const PAYMENT_METHOD_MAP = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
  OFFICE_PAYMENT: 'CASH'
};

const SYNCED_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);

export function reservationInvoiceNumber(reference) {
  const cleaned = String(reference || '').trim().toUpperCase();
  if (!/^LL-\d{4}-[A-Z0-9]{6}$/.test(cleaned)) return '';
  return 'INV-' + cleaned.slice(3);
}

export function accountsPaymentMethod(method) {
  return PAYMENT_METHOD_MAP[String(method || '').toUpperCase()] || 'CASH';
}

export function accountsStateFor(status, invoice, paymentCount = 0) {
  if (status === 'PENDING') return { key: 'WAITING', label: 'Awaiting payment' };
  if (status === 'CANCELLED') {
    if (!invoice || invoice.status === 'VOID') return { key: 'VOID', label: 'Cancelled' };
    if (invoice.status === 'PAID') return { key: 'ATTENTION', label: 'Refund review' };
    return { key: 'ATTENTION', label: 'Invoice still open' };
  }
  if (!SYNCED_STATUSES.has(status)) return { key: 'ATTENTION', label: 'Review needed' };
  if (!invoice) return { key: 'ATTENTION', label: 'Invoice missing' };
  if (invoice.status === 'VOID') return { key: 'ATTENTION', label: 'Invoice voided' };
  if (status === 'CONFIRMED') return { key: 'INVOICED', label: 'Invoice raised' };
  if (paymentCount > 0 && invoice.status === 'PAID') return { key: 'SETTLED', label: 'Paid in full' };
  return { key: 'ATTENTION', label: 'Payment incomplete' };
}

function invoiceDescription(reservation) {
  const title = reservation.listing?.title || 'Land reservation';
  const region = reservation.listing?.region ? ' · ' + reservation.listing.region : '';
  return 'Reservation ' + reservation.reference + ' · ' + title + region;
}

async function audit(tx, actorId, action, entityType, entityId, metadata) {
  await tx.auditEvent.create({ data: { actorId, action, entityType, entityId, metadata } });
}

// Must run inside a Prisma transaction. Returns a description of what the sync
// changed so callers can report back to the dashboard.
export async function syncReservationAccounts(tx, { reservation, actorId }) {
  const result = {
    reference: reservation.reference,
    status: reservation.status,
    invoiceNumber: '',
    invoiceStatus: null,
    paymentRecorded: false,
    invoiceCreated: false,
    invoiceReissued: false,
    invoiceVoided: false,
    skipped: ''
  };

  const number = reservationInvoiceNumber(reservation.reference);
  if (!number) {
    result.skipped = 'This reference cannot be matched to an invoice.';
    return result;
  }
  result.invoiceNumber = number;

  let invoice = await tx.invoice.findUnique({ where: { number }, include: { payments: true } });

  if (reservation.status === 'CANCELLED' || reservation.status === 'PENDING') {
    if (!invoice) return result;
    if (invoice.payments.length > 0) {
      result.skipped = 'Payments are already recorded, so the invoice stays open.';
    } else if (invoice.status !== 'VOID') {
      invoice = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
      result.invoiceVoided = true;
      result.invoiceStatus = invoice.status;
      await audit(tx, actorId, 'invoice.voided', 'Invoice', invoice.id, {
        number,
        source: 'land_reservation',
        reference: reservation.reference,
        reason: reservation.status === 'PENDING' ? 'reservation returned to pending' : 'reservation cancelled'
      });
    }
    return result;
  }

  if (!SYNCED_STATUSES.has(reservation.status)) return result;

  if (!invoice) {
    invoice = await tx.invoice.create({
      data: {
        number,
        customerName: reservation.buyerName,
        customerEmail: reservation.email,
        description: invoiceDescription(reservation),
        amount: reservation.amount,
        currency: reservation.currency || 'GHS',
        status: 'SENT',
        createdById: actorId
      },
      include: { payments: true }
    });
    result.invoiceCreated = true;
    await audit(tx, actorId, 'invoice.created', 'Invoice', invoice.id, {
      number,
      amount: Number(reservation.amount),
      source: 'land_reservation',
      reference: reservation.reference
    });
  } else if (invoice.status === 'VOID' && invoice.payments.length === 0) {
    const reissued = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'SENT' } });
    invoice = { ...reissued, payments: [] };
    result.invoiceReissued = true;
    await audit(tx, actorId, 'invoice.reissued', 'Invoice', invoice.id, {
      number,
      source: 'land_reservation',
      reference: reservation.reference
    });
  }

  if (reservation.status === 'COMPLETED') {
    let paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const existingPayment = invoice.payments.find((payment) => payment.reference === reservation.reference);
    if (!existingPayment) {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          reference: reservation.reference,
          payerName: reservation.buyerName,
          amount: reservation.amount,
          method: accountsPaymentMethod(reservation.paymentMethod),
          receivedAt: reservation.updatedAt || new Date(),
          note: 'Land reservation ' + reservation.reference,
          recordedById: actorId
        }
      });
      paid += Number(reservation.amount);
      result.paymentRecorded = true;
      await audit(tx, actorId, 'payment.recorded', 'Payment', payment.id, {
        reference: reservation.reference,
        amount: Number(reservation.amount),
        invoice: number,
        source: 'land_reservation'
      });
    }

    if (invoice.status !== 'PAID' && paid >= Number(invoice.amount)) {
      invoice = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date() } });
      await audit(tx, actorId, 'invoice.paid', 'Invoice', invoice.id, {
        number,
        source: 'land_reservation',
        reference: reservation.reference
      });
    }
  }

  result.invoiceStatus = invoice.status;
  return result;
}
