const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_LABELS = {
  today: 'today',
  yesterday: 'yesterday',
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'all time'
};

const VISIT_FIELDS = {
  visitCode: true,
  purpose: true,
  checkedInAt: true,
  expectedCheckout: true,
  createdAt: true,
  visitor: { select: { fullName: true } },
  host: { select: { name: true } }
};

export function rangeBounds(range, now = new Date()) {
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case 'yesterday':
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      const offset = (from.getDay() + 6) % 7;
      from.setDate(from.getDate() - offset);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case 'all':
      return { from: null, to, label: RANGE_LABELS.all };
    default:
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
  }
  return { from, to, label: RANGE_LABELS[range] || RANGE_LABELS.today };
}

function utcDay(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function attendanceBounds(range, now = new Date()) {
  if (range === 'all') return { from: null, to: null };
  const bounds = rangeBounds(range, now);
  return { from: utcDay(bounds.from), to: new Date(utcDay(bounds.to).getTime() + DAY_MS) };
}

function visitRangeWhere(bounds) {
  if (!bounds.from) return {};
  return {
    OR: [
      { expectedArrival: { gte: bounds.from, lte: bounds.to } },
      { checkedInAt: { gte: bounds.from, lte: bounds.to } },
      { createdAt: { gte: bounds.from, lte: bounds.to } }
    ]
  };
}

export async function visitorSnapshot(db, range, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const where = visitRangeWhere(bounds);
  const [insideCount, inside, awaitingCount, awaiting, overdueCount, rangeTotal, statusRows] = await Promise.all([
    db.visit.count({ where: { status: 'CHECKED_IN' } }),
    db.visit.findMany({ where: { status: 'CHECKED_IN' }, select: VISIT_FIELDS, orderBy: { checkedInAt: 'asc' }, take: 10 }),
    db.visit.count({ where: { status: 'AWAITING_APPROVAL' } }),
    db.visit.findMany({ where: { status: 'AWAITING_APPROVAL' }, select: VISIT_FIELDS, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.visit.count({ where: { status: 'CHECKED_IN', expectedCheckout: { lt: now } } }),
    db.visit.count({ where }),
    db.visit.groupBy({ by: ['status'], where, _count: { _all: true } })
  ]);
  const statuses = Object.fromEntries(statusRows.map((row) => [row.status, row._count._all]));
  return { range, label: bounds.label, insideCount, inside, awaitingCount, awaiting, overdueCount, rangeTotal, statuses };
}

export async function staffSnapshot(db, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [total, active, deactivated, newHires, departmentRows] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'ACTIVE' } }),
    db.user.count({ where: { status: 'DEACTIVATED' } }),
    db.user.count({ where: { status: 'ACTIVE', dateEmployed: { gte: monthStart, lte: now } } }),
    db.user.groupBy({ by: ['departmentId'], where: { status: 'ACTIVE' }, _count: { _all: true } })
  ]);
  const ids = departmentRows.map((row) => row.departmentId).filter(Boolean);
  const names = ids.length
    ? await db.department.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(names.map((department) => [department.id, department.name]));
  const departments = departmentRows
    .map((row) => ({
      name: nameById.get(row.departmentId) || 'Unassigned',
      count: row._count._all
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return { total, active, deactivated, newHires, departments };
}

export async function attendanceSnapshot(db, range, user, now = new Date()) {
  const canViewAll = Array.isArray(user.permissions) && user.permissions.includes('attendance.view');
  const bounds = attendanceBounds(range, now);
  const where = {
    ...(bounds.from ? { date: { gte: bounds.from, lt: bounds.to } } : {}),
    ...(canViewAll ? {} : { userId: user.id })
  };
  const [records, activeStaff] = await Promise.all([
    db.attendance.findMany({
      where,
      select: {
        date: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        note: true,
        user: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
      take: canViewAll ? 1500 : 90
    }),
    canViewAll ? db.user.count({ where: { status: 'ACTIVE' } }) : Promise.resolve(null)
  ]);

  const summary = {
    records: records.length,
    present: records.filter((record) => ['PRESENT', 'LATE', 'REMOTE'].includes(record.status)).length,
    late: records.filter((record) => record.status === 'LATE').length,
    absent: records.filter((record) => record.status === 'ABSENT').length,
    leave: records.filter((record) => record.status === 'LEAVE').length,
    remote: records.filter((record) => record.status === 'REMOTE').length,
    onSite: records.filter((record) => record.checkInAt && !record.checkOutAt).length
  };

  const today = attendanceBounds('today', now).from.getTime();
  const todaysRecords = records.filter((record) => new Date(record.date).getTime() === today);
  const names = {
    late: todaysRecords.filter((record) => record.status === 'LATE').map((record) => record.user.name).slice(0, 6),
    absent: todaysRecords.filter((record) => record.status === 'ABSENT').map((record) => record.user.name).slice(0, 6)
  };
  const myRecord = canViewAll ? null : todaysRecords[0] || null;

  return {
    canViewAll,
    range,
    label: bounds.label,
    activeStaff,
    summary,
    names,
    myRecord: myRecord ? { status: myRecord.status, checkInAt: myRecord.checkInAt, checkOutAt: myRecord.checkOutAt } : null
  };
}

export async function financeSnapshot(db, range, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const dateWhere = bounds.from ? { gte: bounds.from, lte: bounds.to } : null;
  const [openInvoices, collected, expenses, invoiced, pending] = await Promise.all([
    db.invoice.findMany({
      where: { status: { in: ['DRAFT', 'SENT'] } },
      select: { amount: true, currency: true, payments: { select: { amount: true } } },
      take: 2000
    }),
    db.payment.aggregate({
      where: dateWhere ? { receivedAt: dateWhere } : {},
      _sum: { amount: true },
      _count: { _all: true }
    }),
    db.expense.aggregate({
      where: dateWhere ? { incurredAt: dateWhere } : {},
      _sum: { amount: true },
      _count: { _all: true }
    }),
    db.invoice.findMany({
      where: { status: { not: 'VOID' }, ...(dateWhere ? { issueDate: dateWhere } : {}) },
      select: { amount: true, currency: true },
      take: 2000
    }),
    db.expense.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { _all: true }
    })
  ]);

  const amount = (value) => Number(value || 0);
  const outstanding = openInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((total, payment) => total + amount(payment.amount), 0);
    return sum + Math.max(amount(invoice.amount) - paid, 0);
  }, 0);
  const invoicedTotal = invoiced.reduce((sum, invoice) => sum + amount(invoice.amount), 0);
  const collectedTotal = amount(collected._sum.amount);
  const expenseTotal = amount(expenses._sum.amount);

  return {
    label: bounds.label,
    currency: invoiced[0]?.currency || openInvoices[0]?.currency || 'GHS',
    outstanding,
    openInvoices: openInvoices.length,
    invoiced: invoicedTotal,
    invoiceCount: invoiced.length,
    collected: collectedTotal,
    paymentCount: collected._count._all,
    expenses: expenseTotal,
    expenseCount: expenses._count._all,
    pendingExpenses: amount(pending._sum.amount),
    pendingCount: pending._count._all,
    net: collectedTotal - expenseTotal
  };
}

export async function surveySnapshot(db, user, now = new Date()) {
  const canReview = Array.isArray(user.permissions) && user.permissions.includes('field.approve');
  const projectWhere = canReview
    ? {}
    : {
        OR: [
          { parcels: { some: { assignedToId: user.id } } },
          { tasks: { some: { assignedToId: user.id } } },
          { reports: { some: { authorId: user.id } } }
        ]
      };
  const parcelWhere = canReview ? {} : { OR: [{ assignedToId: user.id }, { tasks: { some: { assignedToId: user.id } } }] };
  const taskWhere = canReview ? {} : { assignedToId: user.id };
  const reportWhere = canReview ? {} : { authorId: user.id };
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS);

  const [activeProjects, projectTotal, parcels, tasks, overdue, dueSoon, pendingReports, projectRows] = await Promise.all([
    db.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
    db.project.count({ where: projectWhere }),
    db.landParcel.count({ where: parcelWhere }),
    db.surveyTask.count({ where: taskWhere }),
    db.surveyTask.count({ where: { ...taskWhere, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: now } } }),
    db.surveyTask.count({ where: { ...taskWhere, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: now, lte: weekAhead } } }),
    db.fieldReport.count({ where: { ...reportWhere, status: 'SUBMITTED' } }),
    db.project.findMany({
      where: { ...projectWhere, status: 'ACTIVE' },
      select: { name: true, code: true },
      orderBy: { createdAt: 'desc' },
      take: 4
    })
  ]);

  return {
    scoped: !canReview,
    activeProjects,
    projectTotal,
    parcels,
    tasks,
    overdue,
    dueSoon,
    pendingReports,
    projects: projectRows
  };
}

export async function clientSnapshot(db, range, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const dateWhere = bounds.from ? { gte: bounds.from, lte: bounds.to } : null;
  const [total, newClients, holdings, linkedReservations, regionRows] = await Promise.all([
    db.clientProfile.count(),
    db.clientProfile.count({ where: dateWhere ? { createdAt: dateWhere } : {} }),
    db.landHolding.count(),
    db.landReservation.count({ where: { clientId: { not: null } } }),
    db.clientProfile.groupBy({ by: ['region'], where: { region: { not: null } }, _count: { _all: true } })
  ]);
  const regions = regionRows
    .map((row) => ({ name: row.region, count: row._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  return { label: bounds.label, total, newClients, holdings, linkedReservations, regions };
}

export async function pipelineSnapshot(db, range, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const dateWhere = bounds.from ? { gte: bounds.from, lte: bounds.to } : null;
  const [reservationRows, pendingValue, newReservations, inquiryRows, published, featured] = await Promise.all([
    db.landReservation.groupBy({ by: ['status'], _count: { _all: true } }),
    db.landReservation.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    db.landReservation.count({ where: dateWhere ? { createdAt: dateWhere } : {} }),
    db.landInquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    db.landListing.count({ where: { status: 'PUBLISHED' } }),
    db.landListing.count({ where: { status: 'PUBLISHED', featured: true } })
  ]);
  const reservations = Object.fromEntries(reservationRows.map((row) => [row.status, row._count._all]));
  const inquiries = Object.fromEntries(inquiryRows.map((row) => [row.status, row._count._all]));
  return {
    label: bounds.label,
    reservations,
    pendingValue: Number(pendingValue._sum.amount || 0),
    newReservations,
    inquiries,
    published,
    featured
  };
}

export async function auditSnapshot(db, range, now = new Date()) {
  const bounds = rangeBounds(range, now);
  const where = bounds.from ? { createdAt: { gte: bounds.from, lte: bounds.to } } : {};
  const [total, events] = await Promise.all([
    db.auditEvent.count({ where }),
    db.auditEvent.findMany({
      where,
      select: {
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    })
  ]);
  return {
    label: bounds.label,
    total,
    events: events.map((event) => ({
      action: event.action,
      entityType: event.entityType,
      actor: event.actor?.name || 'System',
      createdAt: event.createdAt
    }))
  };
}
