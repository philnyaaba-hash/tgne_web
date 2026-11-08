import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { fileResponse } from '../../../../../lib/validation';

export const runtime = 'nodejs';

async function mayAccess(user, attachment) {
  if (user.permissions.includes('field.approve')) return true;
  if (attachment.entityType === 'FIELD_REPORT') {
    const report = await prisma.fieldReport.findUnique({ where: { id: attachment.entityId }, select: { authorId: true } });
    return report?.authorId === user.id;
  }
  if (attachment.entityType === 'SURVEY_TASK') {
    const task = await prisma.surveyTask.findUnique({ where: { id: attachment.entityId }, select: { assignedToId: true } });
    return task?.assignedToId === user.id;
  }
  return false;
}

export async function GET(_request, { params }) {
  const auth = await requirePermission('field.view');
  if (auth.response) return auth.response;
  const { attachmentId } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  if (!(await mayAccess(auth.user, attachment))) return NextResponse.json({ error: 'You do not have access to this attachment.' }, { status: 403 });
  return fileResponse(attachment.data, attachment.fileName, attachment.mimeType);
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission('field.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { attachmentId } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  if (attachment.uploadedById !== auth.user.id && !auth.user.permissions.includes('field.approve')) {
    return NextResponse.json({ error: 'You do not have permission to remove this attachment.' }, { status: 403 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachmentId } });
    await recordAudit(tx, auth.user.id, 'attachment.deleted', attachment.entityType, attachment.entityId, { fileName: attachment.fileName });
  });
  return NextResponse.json({ ok: true });
}
