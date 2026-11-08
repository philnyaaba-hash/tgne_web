import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { optionalString, parseDate, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requirePermission('finance.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const payerName = requiredString(input?.payerName, 150);
  const amount = Number(input?.amount);
  if (!payerName || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) {
    return NextResponse.json({ error: 'Enter a payer and a valid payment amount.' }, { status: 400 });
  }
  const invoiceId = optionalString(input?.invoiceId, 50);
  const invoice = invoiceId ? await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, amount: true, number: true, status: true } }) : null;
  if (invoiceId && !invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  if (invoice?.status === 'VOID') return NextResponse.json({ error: 'Payments cannot be recorded against a void invoice.' }, { status: 409 });
  const receivedAt = input?.receivedAt ? parseDate(input.receivedAt) : new Date();
  if (Number.isNaN(receivedAt.getTime())) return NextResponse.json({ error: 'Choose a valid payment date.' }, { status: 400 });
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: invoice?.id || null,
        reference: optionalString(input.reference, 60),
        payerName,
        amount,
        method: optionalString(input.method, 30) || 'CASH',
        receivedAt,
        note: optionalString(input.note, 300),
        recordedById: auth.user.id
      }
    });
    if (invoice) {
      const totals = await tx.payment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
      const paid = Number(totals._sum.amount || 0);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: paid >= Number(invoice.amount)
          ? { status: 'PAID', paidAt: receivedAt }
          : { status: 'SENT' }
      });
    }
    await recordAudit(tx, auth.user.id, 'payment.recorded', 'Payment', created.id, {
      amount,
      invoiceId: invoice?.id || null,
      invoiceNumber: invoice?.number || null
    });
    return created;
  });
  return NextResponse.json({ payment: { ...payment, amount: Number(payment.amount) } }, { status: 201 });
}
