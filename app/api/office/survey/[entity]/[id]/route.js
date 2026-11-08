import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { optionalString, parseDate, requiredString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'];
const REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

export async function PATCH(request, { params }) {
  const auth = await requirePermission('field.view');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const canReview = auth.user.permissions.includes('field.approve');
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { entity, id } = await params;

  if (entity === 'project') {
    if (!canReview) return NextResponse.json({ error: 'You do not have permission to update projects.' }, { status: 403 });
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: {
          name: input.name !== undefined ? requiredString(input.name, 150) : undefined,
          description: input.description !== undefined ? optionalString(input.description, 500) : undefined,
          location: input.location !== undefined ? optionalString(input.location, 200) : undefined,
          status: PROJECT_STATUSES.includes(input.status) ? input.status : undefined,
          startDate: input.startDate ? parseDate(input.startDate) : undefined,
          endDate: input.endDate ? parseDate(input.endDate) : undefined,
          managerId: input.managerId !== undefined ? optionalString(input.managerId, 50) : undefined
        }
      });
      await recordAudit(tx, auth.user.id, 'project.updated', 'Project', id, { status: updated.status });
      return updated;
    });
    return NextResponse.json({ project });
  }

  if (entity === 'parcel') {
    if (!canReview) return NextResponse.json({ error: 'You do not have permission to update parcels.' }, { status: 403 });
    const existing = await prisma.landParcel.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Parcel not found.' }, { status: 404 });
    const parcel = await prisma.$transaction(async (tx) => {
      const updated = await tx.landParcel.update({
        where: { id },
        data: {
          assignedToId: input.assignedToId !== undefined ? optionalString(input.assignedToId, 50) : undefined,
          status: input.status !== undefined ? requiredString(input.status, 30) : undefined,
          location: input.location !== undefined ? optionalString(input.location, 200) : undefined,
          notes: input.notes !== undefined ? optionalString(input.notes, 500) : undefined,
          size: input.size !== undefined ? (input.size === '' || input.size == null ? null : Number(input.size)) : undefined,
          latitude: input.latitude !== undefined ? (input.latitude === '' || input.latitude == null ? null : Number(input.latitude)) : undefined,
          longitude: input.longitude !== undefined ? (input.longitude === '' || input.longitude == null ? null : Number(input.longitude)) : undefined
        }
      });
      await recordAudit(tx, auth.user.id, 'parcel.updated', 'LandParcel', id, { assignedToId: updated.assignedToId });
      return updated;
    });
    return NextResponse.json({ parcel: { ...parcel, size: parcel.size == null ? null : Number(parcel.size) } });
  }

  if (entity === 'task') {
    const existing = await prisma.surveyTask.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Survey task not found.' }, { status: 404 });
    if (!canReview && existing.assignedToId !== auth.user.id) return NextResponse.json({ error: 'This task is not assigned to you.' }, { status: 403 });
    const requestedStatus = TASK_STATUSES.includes(input.status) ? input.status : existing.status;
    if (!canReview && !['TODO', 'IN_PROGRESS'].includes(requestedStatus)) {
      return NextResponse.json({ error: 'Surveyors can only start or pause assigned tasks. Reports drive approval status.' }, { status: 403 });
    }
    if (!canReview && input.assignedToId !== undefined) return NextResponse.json({ error: 'Only an approver can reassign tasks.' }, { status: 403 });
    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.surveyTask.update({
        where: { id },
        data: {
          status: requestedStatus,
          priority: canReview && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(input.priority) ? input.priority : undefined,
          assignedToId: canReview && input.assignedToId !== undefined ? optionalString(input.assignedToId, 50) : undefined,
          dueDate: canReview && input.dueDate !== undefined ? parseDate(input.dueDate) : undefined,
          reviewNote: canReview && input.reviewNote !== undefined ? optionalString(input.reviewNote, 1000) : undefined,
          approvedById: canReview && ['APPROVED', 'REJECTED'].includes(requestedStatus) ? auth.user.id : undefined,
          approvedAt: canReview && ['APPROVED', 'REJECTED'].includes(requestedStatus) ? new Date() : undefined,
          submittedAt: requestedStatus === 'SUBMITTED' ? new Date() : undefined
        }
      });
      await recordAudit(tx, auth.user.id, 'survey_task.updated', 'SurveyTask', id, { status: updated.status });
      return updated;
    });
    return NextResponse.json({ task });
  }

  if (entity === 'report') {
    const existing = await prisma.fieldReport.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Field report not found.' }, { status: 404 });
    const isAuthor = existing.authorId === auth.user.id;
    const requestedStatus = REPORT_STATUSES.includes(input.status) ? input.status : existing.status;
    const reviewing = ['APPROVED', 'REJECTED'].includes(requestedStatus);

    if (reviewing) {
      if (!canReview) return NextResponse.json({ error: 'You do not have permission to review field reports.' }, { status: 403 });
      if (isAuthor) return NextResponse.json({ error: 'You cannot approve or reject your own field report.' }, { status: 403 });
    } else {
      if (!isAuthor && !canReview) return NextResponse.json({ error: 'You do not have permission to edit this report.' }, { status: 403 });
      if (!isAuthor && canReview) return NextResponse.json({ error: 'Review actions must approve or reject the report.' }, { status: 403 });
      if (!['DRAFT', 'REJECTED', 'SUBMITTED'].includes(existing.status)) return NextResponse.json({ error: 'Approved reports cannot be edited.' }, { status: 409 });
      if (!['DRAFT', 'SUBMITTED'].includes(requestedStatus)) return NextResponse.json({ error: 'Surveyors can save a draft or submit for review.' }, { status: 400 });
    }

    const report = await prisma.$transaction(async (tx) => {
      const updated = await tx.fieldReport.update({
        where: { id },
        data: {
          summary: input.summary !== undefined ? requiredString(input.summary, 1000) : undefined,
          findings: input.findings !== undefined ? optionalString(input.findings, 3000) : undefined,
          coordinates: input.coordinates !== undefined ? optionalString(input.coordinates, 500) : undefined,
          measurements: input.measurements !== undefined ? optionalString(input.measurements, 1000) : undefined,
          status: requestedStatus,
          submittedAt: requestedStatus === 'SUBMITTED' ? new Date() : existing.submittedAt,
          reviewNote: reviewing && input.reviewNote !== undefined ? optionalString(input.reviewNote, 1000) : undefined,
          approvedById: reviewing ? auth.user.id : undefined,
          approvedAt: reviewing ? new Date() : undefined
        }
      });
      if (requestedStatus === 'SUBMITTED') await tx.surveyTask.update({ where: { id: existing.taskId }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
      if (requestedStatus === 'APPROVED') await tx.surveyTask.update({ where: { id: existing.taskId }, data: { status: 'APPROVED', approvedById: auth.user.id, approvedAt: new Date(), reviewNote: optionalString(input.reviewNote, 1000) } });
      if (requestedStatus === 'REJECTED') await tx.surveyTask.update({ where: { id: existing.taskId }, data: { status: 'REJECTED', reviewNote: optionalString(input.reviewNote, 1000) } });
      await recordAudit(tx, auth.user.id, 'field_report.' + requestedStatus.toLowerCase(), 'FieldReport', id, { taskId: existing.taskId });
      return updated;
    });
    return NextResponse.json({ report });
  }

  return NextResponse.json({ error: 'Unknown survey record type.' }, { status: 400 });
}
