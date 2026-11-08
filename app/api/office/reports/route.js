import { NextResponse } from 'next/server';
import { requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { toCsv, VISIT_CATEGORY_LABELS, VISIT_STATUS_LABELS } from '../../../../lib/validation';

export const runtime = 'nodejs';

function rangeFromParams(params) {
  const to = params.get('to') ? new Date(params.get('to')) : new Date();
  const from = params.get('from') ? new Date(params.get('from')) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (to < from) return null;
  return { from, to };
}

export async function GET(request) {
  const auth = await requirePermission('reports.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const range = rangeFromParams(params);
  if (!range) return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 });
  const { from, to } = range;
  const visits = await prisma.visit.findMany({
    where: { OR: [{ expectedArrival: { gte: from, lte: to } }, { createdAt: { gte: from, lte: to } }] },
    include: {
      visitor: { select: { fullName: true, visitorId: true, organization: true, phone: true } },
      host: { select: { name: true } },
      department: { select: { name: true } },
      meetingRoom: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5000
  });
  const now = new Date();
  const byStatus = {};
  const byCategory = {};
  const byDepartment = {};
  const byHost = {};
  const byDay = {};
  let durations = 0;
  let durationCount = 0;
  let overdue = 0;
  let cardsMissing = 0;
  for (const visit of visits) {
    const status = visit.status === 'CHECKED_IN' && visit.expectedCheckout && visit.expectedCheckout < now ? 'OVERDUE' : visit.status;
    byStatus[status] = (byStatus[status] || 0) + 1;
    byCategory[visit.category] = (byCategory[visit.category] || 0) + 1;
    const department = visit.department?.name || 'Unassigned';
    byDepartment[department] = (byDepartment[department] || 0) + 1;
    if (visit.host?.name) byHost[visit.host.name] = (byHost[visit.host.name] || 0) + 1;
    const day = new Date(visit.expectedArrival || visit.createdAt).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    if (visit.checkedInAt && visit.checkedOutAt) {
      durations += new Date(visit.checkedOutAt).getTime() - new Date(visit.checkedInAt).getTime();
      durationCount += 1;
    }
    if (status === 'OVERDUE') overdue += 1;
    if (visit.cardReturned === false) cardsMissing += 1;
  }
  const [staffTotal, staffActive, inside, awaiting] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN' } }),
    prisma.visit.count({ where: { status: 'AWAITING_APPROVAL' } })
  ]);
  const summary = {
    range: { from: from.toISOString(), to: to.toISOString() },
    totalVisits: visits.length,
    byStatus,
    byCategory,
    byDepartment,
    byHost: Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    averageDurationMinutes: durationCount ? Math.round(durations / durationCount / 60000) : 0,
    overdue,
    cardsMissing,
    inside,
    awaiting,
    staffTotal,
    staffActive,
    cardReturnRate: visits.filter((visit) => visit.status === 'CHECKED_OUT').length
      ? Math.round(((visits.filter((visit) => visit.status === 'CHECKED_OUT' && visit.cardReturned !== false).length) / visits.filter((visit) => visit.status === 'CHECKED_OUT').length) * 100)
      : 100
  };

  if (params.get('format') === 'csv') {
    if (!auth.user.permissions.includes('reports.export')) {
      return NextResponse.json({ error: 'You do not have permission to export reports.' }, { status: 403 });
    }
    const headers = ['Visit reference', 'Visitor', 'Visitor ID', 'Organization', 'Phone', 'Host', 'Department', 'Room', 'Category', 'Purpose', 'Status', 'Expected arrival', 'Checked in', 'Checked out', 'Card returned'];
    const rows = visits.map((visit) => [
      visit.visitCode, visit.visitor.fullName, visit.visitor.visitorId, visit.visitor.organization, visit.visitor.phone,
      visit.host?.name, visit.department?.name, visit.meetingRoom?.name, VISIT_CATEGORY_LABELS[visit.category] || visit.category,
      visit.purpose, VISIT_STATUS_LABELS[visit.status] || visit.status, visit.expectedArrival, visit.checkedInAt, visit.checkedOutAt,
      visit.cardReturned == null ? '' : visit.cardReturned ? 'Yes' : 'No'
    ]);
    return new Response(toCsv(headers, rows), {
      headers: {
        'content-type': 'text/csv;charset=utf-8',
        'content-disposition': 'attachment; filename="visitor-report-' + from.toISOString().slice(0, 10) + '-to-' + to.toISOString().slice(0, 10) + '.csv"'
      }
    });
  }
  return NextResponse.json({ summary, visits: visits.slice(0, 200) });
}
