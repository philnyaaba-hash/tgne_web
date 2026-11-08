import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { optionalString, parseDate, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

function validReceipt(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (text.length > 1_800_000) throw new Error('The receipt file is too large.');
  if (/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(text)) return text;
  if (text.length <= 500 && /^https?:\/\//i.test(text)) return text;
  throw new Error('Receipt must be an HTTPS link or a PDF/image smaller than 1.3 MB.');
}

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
  const category = requiredString(input?.category, 80);
  const description = requiredString(input?.description, 500);
  const amount = Number(input?.amount);
  if (!category || !description || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) {
    return NextResponse.json({ error: 'Enter a category, description, and valid amount.' }, { status: 400 });
  }
  const incurredAt = input?.incurredAt ? parseDate(input.incurredAt) : new Date();
  if (Number.isNaN(incurredAt.getTime())) return NextResponse.json({ error: 'Choose a valid expense date.' }, { status: 400 });
  let receiptUrl;
  try {
    receiptUrl = validReceipt(input?.receiptUrl);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        category,
        vendor: optionalString(input.vendor, 150),
        description,
        amount,
        incurredAt,
        receiptUrl,
        note: optionalString(input.note, 300),
        recordedById: auth.user.id
      }
    });
    await recordAudit(tx, auth.user.id, 'expense.recorded', 'Expense', created.id, { category, amount, status: 'PENDING' });
    return created;
  });
  return NextResponse.json({ expense: { ...expense, amount: Number(expense.amount) } }, { status: 201 });
}
