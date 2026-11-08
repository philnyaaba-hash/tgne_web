import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { validateAttachment } from '../../../../lib/media';

export const runtime = 'nodejs';

async function allowed(user, entityType, entityId) {
  if (user.permissions.includes('field.approve')) return true;
  if (entityType === 'FIELD_REPORT') {
    const report = await prisma.fieldReport.findUnique({ where: { id: entityId }, select: { authorId: true } });
    return report?.authorId === user.id;
  }
  const task = await prisma.surveyTask.findUnique({ where: { id: entityId }, select: { assignedToId: true } });
  return task?.assignedToId === user.id;
}

export async function GET(request) {
  const auth = await requirePermission('field.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const entityType = params.get('entityType');
  const entityId = params.get('entityId') || '';
  if (!['FIELD_REPORT', 'SURVEY_TASK'].includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'Choose a report or survey task.' }, { status: 400 });
  }
  if (!(await allowed(auth.user, entityType, entityId))) {
    return NextResponse.json({ error: 'You do not have access to these attachments.' }, { status: 403 });
  }
  const attachments = await prisma.attachment.findMany({
    where: { entityType, entityId },
    select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ attachments });
}

export async function POST(request) {
  const auth = await requirePermission('field.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const entityType = input?.entityType;
  const entityId = typeof input?.entityId === 'string' ? input.entityId : '';
  if (!['FIELD_REPORT', 'SURVEY_TASK'].includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'Choose a report or survey task for this upload.' }, { status: 400 });
  }
  let file;
  try {
    file = validateAttachment({ fileName: input.fileName, mimeType: input.mimeType, data: input.data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const canReview = auth.user.permissions.includes('field.approve');
  if (entityType === 'FIELD_REPORT') {
    const report = await prisma.fieldReport.findUnique({ where: { id: entityId }, select: { id: true, authorId: true } });
    if (!report) return NextResponse.json({ error: 'Field report not found.' }, { status: 404 });
    if (!canReview && report.authorId !== auth.user.id) return NextResponse.json({ error: 'You can only attach files to your own reports.' }, { status: 403 });
  } else {
    const task = await prisma.surveyTask.findUnique({ where: { id: entityId }, select: { id: true, assignedToId: true } });
    if (!task) return NextResponse.json({ error: 'Survey task not found.' }, { status: 404 });
    if (!canReview && task.assignedToId !== auth.user.id) return NextResponse.json({ error: 'You can only attach files to tasks assigned to you.' }, { status: 403 });
  }
  const attachment = await prisma.$transaction(async (tx) => {
    const created = await tx.attachment.create({
      data: { ...file, entityType, entityId, uploadedById: auth.user.id }
    });
    await recordAudit(tx, auth.user.id, 'attachment.uploaded', entityType, entityId, { attachmentId: created.id, fileName: file.fileName, size: file.size });
    return { id: created.id, fileName: created.fileName, mimeType: created.mimeType, size: created.size, entityType: created.entityType, entityId: created.entityId, createdAt: created.createdAt };
  });
  return NextResponse.json({ attachment }, { status: 201 });
}
