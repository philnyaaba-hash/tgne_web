import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { cleanEmail, isEmail, optionalString, parseDate, requiredString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

const STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID'];

export async function PATCH(request, { params }) {
  const auth = await requirePermission('finance.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { invoiceId } = await params;
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!existing) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  const status = STATUSES.includes(input.status) ? input.status : existing.status;
  const email = input.customerEmail !== undefined ? cleanEmail(input.customerEmail) : existing.customerEmail || '';
  if (email && !isEmail(email)) return NextResponse.json({ error: 'Enter a valid customer email.' }, { status: 400 });
  const amount = input.amount !== undefined ? Number(input.amount) : Number(existing.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a valid invoice amount.' }, { status: 400 });
  const description = input.description !== undefined ? requiredString(input.description, 500) : existing.description;
  const customerName = input.customerName !== undefined ? requiredString(input.customerName, 150) : existing.customerName;
  if (!description || !customerName) return NextResponse.json({ error: 'Customer and description are required.' }, { status: 400 });
  const dueDate = input.dueDate ? parseDate(input.dueDate) : existing.dueDate;
  const invoice = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        customerName,
        customerEmail: email || null,
        description,
        amount,
        status,
        dueDate,
        paidAt: status === 'PAID' ? (existing.paidAt || new Date()) : status === 'VOID' ? null : existing.paidAt
      }
    });
    await recordAudit(tx, auth.user.id, 'invoice.updated', 'Invoice', invoiceId, { number: existing.number, status, amount });
    return updated;
  });
  return NextResponse.json({ invoice: { ...invoice, amount: Number(invoice.amount) } });
}
