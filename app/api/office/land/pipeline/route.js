import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { accountsStateFor, reservationInvoiceNumber } from '../../../../../lib/land-accounts';
import { PAYMENT_METHODS, RESERVATION_STATUSES, labelFor } from '../../../../../lib/land-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const money = (value) => Number(value || 0);

export async function GET() {
  const auth = await requirePermission('land.view');
  if (auth.response) return auth.response;

  const canViewAccounts = auth.user.permissions.includes('finance.view');
  const canSyncAccounts = auth.user.permissions.includes('land.manage') && auth.user.permissions.includes('finance.manage');

  try {
    const [reservations, enquiries, newEnquiries] = await Promise.all([
      prisma.landReservation.findMany({
        include: { listing: { select: { title: true, slug: true, region: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.landInquiry.count(),
      prisma.landInquiry.count({ where: { status: 'NEW' } })
    ]);

    const numbers = reservations.map((reservation) => reservationInvoiceNumber(reservation.reference)).filter(Boolean);
    const invoices = canViewAccounts && numbers.length
      ? await prisma.invoice.findMany({
          where: { number: { in: numbers } },
          include: { payments: { select: { id: true, amount: true, method: true, reference: true, receivedAt: true } } }
        })
      : [];
    const invoiceByNumber = new Map(invoices.map((invoice) => [invoice.number, invoice]));

    const rows = reservations.map((reservation) => {
      const invoice = invoiceByNumber.get(reservationInvoiceNumber(reservation.reference)) || null;
      const payments = invoice?.payments || [];
      const state = accountsStateFor(reservation.status, invoice, payments.length);
      const invoiceAmount = invoice && invoice.status !== 'VOID' ? money(invoice.amount) : 0;
      const collected = invoice && invoice.status !== 'VOID'
        ? payments.reduce((sum, payment) => sum + money(payment.amount), 0)
        : 0;

      return {
        id: reservation.id,
        reference: reservation.reference,
        status: reservation.status,
        buyerName: reservation.buyerName,
        email: reservation.email,
        phone: reservation.phone,
        amount: money(reservation.amount),
        currency: reservation.currency,
        paymentMethod: reservation.paymentMethod,
        paymentMethodLabel: labelFor(PAYMENT_METHODS, reservation.paymentMethod),
        listing: reservation.listing,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        accounts: canViewAccounts ? {
          state: state.key,
          label: state.label,
          invoice: invoice ? {
            number: invoice.number,
            status: invoice.status,
            amount: invoiceAmount,
            issueDate: invoice.issueDate,
            paidAt: invoice.paidAt
          } : null,
          invoiceAmount,
          collected,
          outstanding: Math.max(invoiceAmount - collected, 0),
          payments: payments.map((payment) => ({
            id: payment.id,
            amount: money(payment.amount),
            method: payment.method,
            reference: payment.reference,
            receivedAt: payment.receivedAt
          }))
        } : null
      };
    });

    const stages = RESERVATION_STATUSES.map((option) => {
      const items = rows.filter((row) => row.status === option.value);
      return {
        value: option.value,
        label: option.label,
        count: items.length,
        amount: items.reduce((sum, row) => sum + row.amount, 0)
      };
    });

    const accounts = canViewAccounts ? {
      invoiced: rows.reduce((sum, row) => sum + (row.accounts?.invoiceAmount || 0), 0),
      collected: rows.reduce((sum, row) => sum + (row.accounts?.collected || 0), 0),
      outstanding: rows.reduce((sum, row) => sum + (row.accounts?.outstanding || 0), 0),
      awaitingSync: rows.filter((row) => ['CONFIRMED', 'COMPLETED'].includes(row.status) && row.accounts?.state === 'ATTENTION').length
    } : null;

    return NextResponse.json({
      ready: true,
      canSyncAccounts,
      canViewAccounts,
      rows,
      stages,
      accounts,
      funnel: {
        enquiries,
        newEnquiries,
        requests: rows.length,
        confirmed: rows.filter((row) => ['CONFIRMED', 'COMPLETED'].includes(row.status)).length,
        completed: rows.filter((row) => row.status === 'COMPLETED').length,
        pipelineValue: rows
          .filter((row) => ['PENDING', 'CONFIRMED'].includes(row.status))
          .reduce((sum, row) => sum + row.amount, 0)
      }
    });
  } catch (error) {
    console.error('Land pipeline query failed.', error?.message);
    return NextResponse.json({
      ready: false,
      canSyncAccounts: false,
      canViewAccounts,
      rows: [],
      stages: [],
      accounts: null,
      funnel: { enquiries: 0, newEnquiries: 0, requests: 0, confirmed: 0, completed: 0, pipelineValue: 0 },
      error: 'The storefront tables are not available yet. Apply the latest database migration.'
    });
  }
}
