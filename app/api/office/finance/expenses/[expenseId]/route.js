import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { optionalString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];

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
  const status = STATUSES.includes(input.status) ? input.status : null;
  if (!status) return NextResponse.json({ error: 'Choose a valid expense status.' }, { status: 400 });
  if (['APPROVED', 'REJECTED'].includes(status) && !auth.user.permissions.includes('finance.approve')) {
    return NextResponse.json({ error: 'You do not have permission to approve or reject expenses.' }, { status: 403 });
  }
  const { expenseId } = await params;
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
  if (existing.status === 'PAID' && status !== 'PAID') return NextResponse.json({ error: 'Paid expenses cannot be reopened.' }, { status: 409 });
  const expense = await prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status,
        note: input.note !== undefined ? optionalString(input.note, 300) : undefined,
        approvedById: ['APPROVED', 'PAID'].includes(status) ? auth.user.id : existing.approvedById,
        approvedAt: ['APPROVED', 'PAID'].includes(status) ? new Date() : existing.approvedAt
      }
    });
    await recordAudit(tx, auth.user.id, 'expense.' + status.toLowerCase(), 'Expense', expenseId, { previousStatus: existing.status, status });
    return updated;
  });
  return NextResponse.json({ expense: { ...expense, amount: Number(expense.amount) } });
}
