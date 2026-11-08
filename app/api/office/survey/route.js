import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { optionalString, parseDate, requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

function numeric(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function canAccessTask(user, taskId) {
  if (user.permissions.includes('field.approve')) return prisma.surveyTask.findUnique({ where: { id: taskId }, select: { id: true, assignedToId: true, projectId: true, parcelId: true } });
  return prisma.surveyTask.findFirst({ where: { id: taskId, assignedToId: user.id }, select: { id: true, assignedToId: true, projectId: true, parcelId: true } });
}

export async function GET() {
  const auth = await requirePermission('field.view');
  if (auth.response) return auth.response;
  const canReview = auth.user.permissions.includes('field.approve');
  const projectWhere = canReview ? {} : {
    OR: [
      { parcels: { some: { assignedToId: auth.user.id } } },
      { tasks: { some: { assignedToId: auth.user.id } } },
      { reports: { some: { authorId: auth.user.id } } }
    ]
  };
  const parcelWhere = canReview ? {} : { OR: [{ assignedToId: auth.user.id }, { tasks: { some: { assignedToId: auth.user.id } } }] };
  const taskWhere = canReview ? {} : { assignedToId: auth.user.id };
  const reportWhere = canReview ? {} : { authorId: auth.user.id };

  const [projects, parcels, tasks, reports, members] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { parcels: true, tasks: true, reports: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.landParcel.findMany({
      where: parcelWhere,
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { tasks: true, reports: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 300
    }),
    prisma.surveyTask.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true, code: true } },
        parcel: { select: { id: true, parcelCode: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { reports: true } }
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 300
    }),
    prisma.fieldReport.findMany({
      where: reportWhere,
      include: {
        task: { select: { id: true, title: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        parcel: { select: { id: true, parcelCode: true } },
        author: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, jobTitle: true,
        department: { select: { name: true } },
        roles: { select: { role: { select: { key: true, name: true } } } }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const attachmentCounts = reports.length
    ? await prisma.attachment.groupBy({
      by: ['entityId'],
      where: { entityType: 'FIELD_REPORT', entityId: { in: reports.map((report) => report.id) } },
      _count: { _all: true }
    })
    : [];
  const counts = Object.fromEntries(attachmentCounts.map(({ entityId, _count }) => [entityId, _count._all]));
  const stats = {
    projects: projects.length,
    activeProjects: projects.filter((project) => project.status === 'ACTIVE').length,
    parcels: parcels.length,
    openTasks: tasks.filter((task) => ['TODO', 'IN_PROGRESS', 'SUBMITTED'].includes(task.status)).length,
    submittedReports: reports.filter((report) => report.status === 'SUBMITTED').length,
    approvedReports: reports.filter((report) => report.status === 'APPROVED').length
  };
  return NextResponse.json({
    canReview,
    stats,
    projects: projects.map((project) => ({ ...project, tasks: project._count.tasks, parcels: project._count.parcels })),
    parcels: parcels.map((parcel) => ({ ...parcel, size: parcel.size == null ? null : Number(parcel.size), tasks: parcel._count.tasks, reports: parcel._count.reports })),
    tasks: tasks.map((task) => ({ ...task, reportCount: task._count.reports })),
    reports: reports.map((report) => ({ ...report, attachments: counts[report.id] || 0 })),
    members: members.map(({ roles, ...member }) => ({ ...member, roles: roles.map(({ role }) => role.name) }))
  });
}

export async function POST(request) {
  const auth = await requirePermission('field.view');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const entity = input?.entity;

  if (entity === 'project') {
    if (!auth.user.permissions.includes('field.approve')) return NextResponse.json({ error: 'You do not have permission to create projects.' }, { status: 403 });
    const code = requiredString(input.code, 40).toUpperCase();
    const name = requiredString(input.name, 150);
    if (!/^[A-Z0-9-]{2,40}$/.test(code) || !name) return NextResponse.json({ error: 'Enter a project code and name.' }, { status: 400 });
    const startDate = input.startDate ? parseDate(input.startDate) : null;
    const endDate = input.endDate ? parseDate(input.endDate) : null;
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) return NextResponse.json({ error: 'Choose valid project dates.' }, { status: 400 });
    const managerId = optionalString(input.managerId, 50);
    if (managerId) {
      const manager = await prisma.user.findFirst({ where: { id: managerId, status: 'ACTIVE' }, select: { id: true } });
      if (!manager) return NextResponse.json({ error: 'Selected project manager is unavailable.' }, { status: 400 });
    }
    try {
      const project = await prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            code,
            name,
            description: optionalString(input.description, 500),
            location: optionalString(input.location, 200),
            status: PROJECT_STATUSES.includes(input.status) ? input.status : 'PLANNED',
            startDate,
            endDate,
            managerId,
            createdById: auth.user.id
          }
        });
        await recordAudit(tx, auth.user.id, 'project.created', 'Project', created.id, { code, name });
        return created;
      });
      return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
      if (error.code === 'P2002') return NextResponse.json({ error: 'A project with this code already exists.' }, { status: 409 });
      throw error;
    }
  }

  if (entity === 'parcel') {
    if (!auth.user.permissions.includes('field.approve')) return NextResponse.json({ error: 'You do not have permission to create parcels.' }, { status: 403 });
    const projectId = optionalString(input.projectId, 50);
    const parcelCode = requiredString(input.parcelCode, 50).toUpperCase();
    if (!projectId || !parcelCode) return NextResponse.json({ error: 'Choose a project and enter a parcel code.' }, { status: 400 });
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    const assignedToId = optionalString(input.assignedToId, 50);
    if (assignedToId) {
      const user = await prisma.user.findFirst({ where: { id: assignedToId, status: 'ACTIVE' }, select: { id: true } });
      if (!user) return NextResponse.json({ error: 'Selected surveyor is unavailable.' }, { status: 400 });
    }
    try {
      const parcel = await prisma.$transaction(async (tx) => {
        const created = await tx.landParcel.create({
          data: {
            projectId,
            parcelCode,
            size: numeric(input.size),
            unit: optionalString(input.unit, 20) || 'acres',
            location: optionalString(input.location, 200),
            latitude: numeric(input.latitude),
            longitude: numeric(input.longitude),
            assignedToId,
            notes: optionalString(input.notes, 500)
          }
        });
        await recordAudit(tx, auth.user.id, 'parcel.created', 'LandParcel', created.id, { parcelCode, projectId });
        return created;
      });
      return NextResponse.json({ parcel: { ...parcel, size: parcel.size == null ? null : Number(parcel.size) } }, { status: 201 });
    } catch (error) {
      if (error.code === 'P2002') return NextResponse.json({ error: 'That parcel code already exists in this project.' }, { status: 409 });
      throw error;
    }
  }

  if (entity === 'task') {
    if (!auth.user.permissions.includes('field.approve')) return NextResponse.json({ error: 'You do not have permission to create survey tasks.' }, { status: 403 });
    const projectId = optionalString(input.projectId, 50);
    const title = requiredString(input.title, 160);
    if (!projectId || !title) return NextResponse.json({ error: 'Choose a project and enter a task title.' }, { status: 400 });
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    const parcelId = optionalString(input.parcelId, 50);
    if (parcelId) {
      const parcel = await prisma.landParcel.findFirst({ where: { id: parcelId, projectId }, select: { id: true } });
      if (!parcel) return NextResponse.json({ error: 'Selected parcel does not belong to this project.' }, { status: 400 });
    }
    const assignedToId = optionalString(input.assignedToId, 50);
    if (assignedToId) {
      const user = await prisma.user.findFirst({ where: { id: assignedToId, status: 'ACTIVE' }, select: { id: true } });
      if (!user) return NextResponse.json({ error: 'Selected surveyor is unavailable.' }, { status: 400 });
    }
    const dueDate = input.dueDate ? parseDate(input.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) return NextResponse.json({ error: 'Choose a valid due date.' }, { status: 400 });
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.surveyTask.create({
        data: {
          projectId,
          parcelId,
          title,
          description: optionalString(input.description, 1000),
          priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(input.priority) ? input.priority : 'NORMAL',
          assignedToId,
          dueDate,
          createdById: auth.user.id
        }
      });
      await recordAudit(tx, auth.user.id, 'survey_task.created', 'SurveyTask', created.id, { projectId, assignedToId });
      return created;
    });
    return NextResponse.json({ task }, { status: 201 });
  }

  if (entity === 'report') {
    const taskId = optionalString(input.taskId, 50);
    const summary = requiredString(input.summary, 1000);
    if (!taskId || !summary) return NextResponse.json({ error: 'Choose a survey task and enter a report summary.' }, { status: 400 });
    const task = await canAccessTask(auth.user, taskId);
    if (!task) return NextResponse.json({ error: 'Task not found or not assigned to you.' }, { status: 404 });
    const status = input.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';
    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.fieldReport.create({
        data: {
          taskId,
          projectId: task.projectId,
          parcelId: task.parcelId,
          authorId: auth.user.id,
          summary,
          findings: optionalString(input.findings, 3000),
          coordinates: optionalString(input.coordinates, 500),
          measurements: optionalString(input.measurements, 1000),
          status,
          submittedAt: status === 'SUBMITTED' ? new Date() : null
        }
      });
      if (status === 'SUBMITTED') await tx.surveyTask.update({ where: { id: taskId }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
      await recordAudit(tx, auth.user.id, status === 'SUBMITTED' ? 'field_report.submitted' : 'field_report.drafted', 'FieldReport', created.id, { taskId });
      return created;
    });
    return NextResponse.json({ report }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown survey record type.' }, { status: 400 });
}
