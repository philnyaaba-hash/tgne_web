import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { toCsv } from '../../../../lib/validation';

export const runtime = 'nodejs';

const money = (value) => Number(value || 0);

export async function GET(request) {
  const auth = await requirePermission('finance.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const [invoices, payments, expenses] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        payments: { select: { id: true, amount: true, receivedAt: true, method: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { issueDate: 'desc' },
      take: 200
    }),
    prisma.payment.findMany({
      include: {
        invoice: { select: { id: true, number: true, customerName: true } },
        recordedBy: { select: { id: true, name: true } }
      },
      orderBy: { receivedAt: 'desc' },
      take: 200
    }),
    prisma.expense.findMany({
      include: {
        recordedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { incurredAt: 'desc' },
      take: 200
    })
  ]);

  const invoiceRows = invoices.map((invoice) => {
    const paid = invoice.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
    const amount = money(invoice.amount);
    return {
      ...invoice,
      amount,
      paid,
      balance: invoice.status === 'VOID' ? 0 : Math.max(amount - paid, 0),
      payments: invoice.payments.map((payment) => ({ ...payment, amount: money(payment.amount) }))
    };
  });
  const paymentRows = payments.map((payment) => ({ ...payment, amount: money(payment.amount) }));
  const expenseRows = expenses.map((expense) => ({ ...expense, amount: money(expense.amount) }));

  const summary = {
    invoiced: invoiceRows.filter((invoice) => invoice.status !== 'VOID').reduce((sum, invoice) => sum + invoice.amount, 0),
    collected: paymentRows.reduce((sum, payment) => sum + payment.amount, 0),
    outstanding: invoiceRows.reduce((sum, invoice) => sum + invoice.balance, 0),
    expensesRecorded: expenseRows.reduce((sum, expense) => sum + expense.amount, 0),
    expensesPending: expenseRows.filter((expense) => expense.status === 'PENDING').reduce((sum, expense) => sum + expense.amount, 0),
    expensesApproved: expenseRows.filter((expense) => ['APPROVED', 'PAID'].includes(expense.status)).reduce((sum, expense) => sum + expense.amount, 0),
    paidInvoices: invoiceRows.filter((invoice) => invoice.status === 'PAID').length,
    openInvoices: invoiceRows.filter((invoice) => ['DRAFT', 'SENT'].includes(invoice.status)).length,
    invoiceCount: invoiceRows.length,
    currency: invoiceRows[0]?.currency || 'GHS'
  };
  summary.netPosition = summary.collected - summary.expensesApproved;

  if (params.get('format') === 'csv') {
    if (!auth.user.permissions.includes('finance.export')) {
      return NextResponse.json({ error: 'You do not have permission to export financial records.' }, { status: 403 });
    }
    const headers = ['Type', 'Reference', 'Party', 'Description', 'Amount', 'Status', 'Date'];
    const rows = [
      ...invoiceRows.map((invoice) => ['Invoice', invoice.number, invoice.customerName, invoice.description, invoice.amount, invoice.status, new Date(invoice.issueDate).toISOString().slice(0, 10)]),
      ...paymentRows.map((payment) => ['Payment', payment.reference || payment.id.slice(-6), payment.payerName, payment.invoice?.number || 'Unallocated payment', payment.amount, 'RECEIVED', new Date(payment.receivedAt).toISOString().slice(0, 10)]),
      ...expenseRows.map((expense) => ['Expense', expense.id.slice(-6), expense.vendor || '', expense.category + ' · ' + expense.description, expense.amount, expense.status, new Date(expense.incurredAt).toISOString().slice(0, 10)])
    ];
    return new Response(toCsv(headers, rows), {
      headers: {
        'content-type': 'text/csv;charset=utf-8',
        'content-disposition': 'attachment; filename="finance-report-' + new Date().toISOString().slice(0, 10) + '.csv"'
      }
    });
  }

  return NextResponse.json({ invoices: invoiceRows, payments: paymentRows, expenses: expenseRows, summary });
}
