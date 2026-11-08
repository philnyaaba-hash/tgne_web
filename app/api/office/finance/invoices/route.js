import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { cleanEmail, isEmail, optionalString, parseDate, requiredString } from '../../../../../lib/validation';

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
  const customerName = requiredString(input?.customerName, 150);
  const description = requiredString(input?.description, 500);
  const amount = Number(input?.amount);
  const email = cleanEmail(input?.customerEmail);
  if (!customerName || !description || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) {
    return NextResponse.json({ error: 'Enter a customer, description, and a valid invoice amount.' }, { status: 400 });
  }
  if (email && !isEmail(email)) return NextResponse.json({ error: 'Enter a valid customer email.' }, { status: 400 });
  const issueDate = input?.issueDate ? parseDate(input.issueDate) : new Date();
  const dueDate = input?.dueDate ? parseDate(input.dueDate) : null;
  if (Number.isNaN(issueDate.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) {
    return NextResponse.json({ error: 'Choose valid invoice dates.' }, { status: 400 });
  }
  const number = optionalString(input?.number, 40) || 'INV-' + new Date().getFullYear() + '-' + randomBytes(3).toString('hex').toUpperCase();
  const status = ['DRAFT', 'SENT'].includes(input?.status) ? input.status : 'DRAFT';
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          number,
          customerName,
          customerEmail: email || null,
          description,
          amount,
          currency: optionalString(input.currency, 8) || 'GHS',
          status,
          issueDate,
          dueDate,
          createdById: auth.user.id
        },
        include: { createdBy: { select: { id: true, name: true } } }
      });
      await recordAudit(tx, auth.user.id, 'invoice.created', 'Invoice', created.id, { number, amount, status });
      return created;
    });
    return NextResponse.json({ invoice: { ...invoice, amount: Number(invoice.amount), paid: 0, balance: Number(invoice.amount), payments: [] } }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'An invoice with this number already exists.' }, { status: 409 });
    throw error;
  }
}
