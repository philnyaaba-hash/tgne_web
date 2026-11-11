import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { businessServiceTypeLabel, isServiceStatus, serviceInvoiceNumber } from '../../../../../../lib/client-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value) {
  return 'GH₵ ' + Number(value || 0).toLocaleString('en-US');
}

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const action = String(input?.action || '').toLowerCase();
  if (!['quote', 'schedule', 'start', 'complete', 'cancel', 'update'].includes(action)) {
    return NextResponse.json({ error: 'Choose a valid service action.' }, { status: 400 });
  }

  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { client: { include: { user: { select: { name: true, email: true, phone: true } } } } }
  });
  if (!existing) return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
  const canFinance = auth.user.permissions.includes('finance.manage');
  const note = clean(input?.note ?? input?.message, 2000);

  try {
    const service = await prisma.$transaction(async (tx) => {
      if (action === 'quote') {
        if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
          throw Object.assign(new Error('This request is already closed.'), { status: 409 });
        }
        const amount = Math.round(Number(input?.amount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > 2_000_000_000) {
          throw Object.assign(new Error('Enter a valid quote amount in cedis.'), { status: 400 });
        }
        const scheduledFor = parseDate(input?.scheduledFor);
        let invoiceNumber = existing.invoiceNumber;

        if (canFinance) {
          invoiceNumber = serviceInvoiceNumber(existing.reference);
          const description = businessServiceTypeLabel(existing.type) + ' — ' + existing.title;
          const invoice = await tx.invoice.findUnique({ where: { number: invoiceNumber }, select: { id: true, status: true } });
          if (invoice) {
            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                amount,
                description,
                customerName: existing.client.user.name,
                customerEmail: existing.client.user.email,
                status: ['VOID', 'DRAFT'].includes(invoice.status) ? 'SENT' : invoice.status
              }
            });
          } else {
            await tx.invoice.create({
              data: {
                number: invoiceNumber,
                customerName: existing.client.user.name,
                customerEmail: existing.client.user.email,
                description,
                amount,
                status: 'SENT',
                createdById: auth.user.id
              }
            });
          }
        }

        const updated = await tx.serviceRequest.update({
          where: { id },
          data: { status: 'QUOTED', quoteAmount: amount, invoiceNumber, scheduledFor: scheduledFor || existing.scheduledFor }
        });
        await tx.serviceUpdate.create({
          data: {
            requestId: id,
            authorId: auth.user.id,
            authorRole: 'OFFICE',
            message: 'Quote issued for ' + money(amount) + '.' + (note ? ' ' + note : '') +
              (invoiceNumber ? ' Invoice ' + invoiceNumber + ' is available under Payments.' : '')
          }
        });
        await recordAudit(tx, auth.user.id, 'client.service_quoted', 'ServiceRequest', id, {
          reference: existing.reference,
          amount,
          invoiceNumber
        });
        return updated;
      }

      if (action === 'schedule') {
        const scheduledFor = parseDate(input?.scheduledFor);
        if (!scheduledFor) throw Object.assign(new Error('Choose the date and time for the work.'), { status: 400 });
        const assignedToId = clean(input?.assignedToId, 40) || null;
        let assigneeName = '';
        if (assignedToId) {
          const assignee = await tx.user.findFirst({ where: { id: assignedToId, status: 'ACTIVE' }, select: { name: true } });
          if (!assignee) throw Object.assign(new Error('Choose an active staff member.'), { status: 400 });
          assigneeName = assignee.name;
        }
        const updated = await tx.serviceRequest.update({
          where: { id },
          data: { status: 'SCHEDULED', scheduledFor, assignedToId }
        });
        await tx.serviceUpdate.create({
          data: {
            requestId: id,
            authorId: auth.user.id,
            authorRole: 'OFFICE',
            message: 'Work scheduled for ' + scheduledFor.toLocaleString('en-GB') + (assigneeName ? ' with ' + assigneeName : '') + '.' + (note ? ' ' + note : '')
          }
        });
        await recordAudit(tx, auth.user.id, 'client.service_scheduled', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }

      if (action === 'start') {
        const updated = await tx.serviceRequest.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
        await tx.serviceUpdate.create({
          data: { requestId: id, authorId: auth.user.id, authorRole: 'OFFICE', message: note || 'Work has started.' }
        });
        await recordAudit(tx, auth.user.id, 'client.service_started', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }

      if (action === 'complete') {
        if (existing.status === 'CANCELLED') throw Object.assign(new Error('This request was cancelled.'), { status: 409 });
        const updated = await tx.serviceRequest.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        if (canFinance && existing.invoiceNumber) {
          const invoice = await tx.invoice.findUnique({
            where: { number: existing.invoiceNumber },
            include: { payments: true }
          });
          if (invoice && invoice.status !== 'PAID' && !invoice.payments.some((payment) => payment.reference === existing.reference)) {
            await tx.payment.create({
              data: {
                invoiceId: invoice.id,
                reference: existing.reference,
                payerName: existing.client.user.name,
                amount: invoice.amount,
                method: 'CASH',
                note: 'Settled on completion of ' + businessServiceTypeLabel(existing.type) + '.',
                recordedById: auth.user.id
              }
            });
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date() } });
          }
        }
        await tx.serviceUpdate.create({
          data: { requestId: id, authorId: auth.user.id, authorRole: 'OFFICE', message: note || 'Work completed. Thank you for choosing TGNE Solutions.' }
        });
        await recordAudit(tx, auth.user.id, 'client.service_completed', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }

      if (action === 'cancel') {
        if (existing.status === 'COMPLETED') throw Object.assign(new Error('Completed work cannot be cancelled.'), { status: 409 });
        const updated = await tx.serviceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
        if (canFinance && existing.invoiceNumber) {
          const invoice = await tx.invoice.findUnique({ where: { number: existing.invoiceNumber }, include: { payments: true } });
          if (invoice && invoice.status === 'SENT' && invoice.payments.length === 0) {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
          }
        }
        await tx.serviceUpdate.create({
          data: { requestId: id, authorId: auth.user.id, authorRole: 'OFFICE', message: note || 'This request was cancelled.' }
        });
        await recordAudit(tx, auth.user.id, 'client.service_cancelled_by_office', 'ServiceRequest', id, { reference: existing.reference });
        return updated;
      }

      const status = String(input?.status || '').toUpperCase();
      if (status && !isServiceStatus(status)) throw Object.assign(new Error('Choose a valid service status.'), { status: 400 });
      if (note.length < 2) throw Object.assign(new Error('Write a short update first.'), { status: 400 });
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: status ? { status } : {}
      });
      await tx.serviceUpdate.create({
        data: { requestId: id, authorId: auth.user.id, authorRole: 'OFFICE', message: note }
      });
      await recordAudit(tx, auth.user.id, 'client.service_update', 'ServiceRequest', id, { reference: existing.reference, status: status || existing.status });
      return updated;
    }, { timeout: 15000 });

    return NextResponse.json({ service });
  } catch (error) {
    if (error?.status) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Client desk service action failed.', error?.message);
    return NextResponse.json({ error: 'The service request could not be updated.' }, { status: 503 });
  }
}
