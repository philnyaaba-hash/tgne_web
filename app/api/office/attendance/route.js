import { NextResponse } from 'next/server';
import { recordAudit, requireUser } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { requireSameOrigin } from '../../../../lib/office-auth';
import { optionalString, parseDate } from '../../../../lib/validation';

export const runtime = 'nodejs';

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'REMOTE', 'LEAVE'];

function dayOnly(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export async function GET(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const canViewAll = auth.user.permissions.includes('attendance.view');
  const requestedUser = params.get('userId');
  const dateParam = params.get('date');
  const monthParam = params.get('month');
  let where;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    where = { date: { gte: start, lt: end } };
  } else {
    const day = dateParam && !Number.isNaN(new Date(dateParam).getTime()) ? dayOnly(new Date(dateParam)) : dayOnly();
    where = { date: day };
  }
  if (!canViewAll) where.userId = auth.user.id;
  else if (requestedUser) where.userId = requestedUser;
  const records = await prisma.attendance.findMany({
    where,
    include: { user: { select: { id: true, name: true, employeeId: true, jobTitle: true, department: { select: { name: true } } } } },
    orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
    take: 500
  });
  const myRecord = records.find((record) => record.userId === auth.user.id) || await prisma.attendance.findUnique({
    where: { userId_date: { userId: auth.user.id, date: dayOnly() } }
  });
  const summary = {
    present: records.filter((record) => ['PRESENT', 'LATE', 'REMOTE'].includes(record.status)).length,
    late: records.filter((record) => record.status === 'LATE').length,
    absent: records.filter((record) => record.status === 'ABSENT').length,
    leave: records.filter((record) => record.status === 'LEAVE').length,
    onSite: records.filter((record) => record.checkInAt && !record.checkOutAt).length
  };
  return NextResponse.json({ records, summary, myRecord, canViewAll, today: dayOnly().toISOString().slice(0, 10) });
}

export async function POST(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const action = input?.action;
  const now = new Date();
  const date = dayOnly();

  if (action === 'clock-in' || action === 'clock-out') {
    const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: auth.user.id, date } } });
    if (action === 'clock-in') {
      if (existing?.checkInAt) return NextResponse.json({ error: 'You have already clocked in today.' }, { status: 409 });
      const late = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
      const record = existing
        ? await prisma.attendance.update({ where: { id: existing.id }, data: { checkInAt: now, status: late ? 'LATE' : 'PRESENT', note: optionalString(input.note, 300) } })
        : await prisma.attendance.create({ data: { userId: auth.user.id, date, checkInAt: now, status: late ? 'LATE' : 'PRESENT', note: optionalString(input.note, 300) } });
      await recordAudit(prisma, auth.user.id, 'attendance.clocked_in', 'Attendance', record.id, {});
      return NextResponse.json({ record }, { status: 201 });
    }
    if (!existing?.checkInAt) return NextResponse.json({ error: 'Clock in before recording a clock-out.' }, { status: 409 });
    if (existing.checkOutAt) return NextResponse.json({ error: 'You have already clocked out today.' }, { status: 409 });
    const record = await prisma.attendance.update({ where: { id: existing.id }, data: { checkOutAt: now } });
    await recordAudit(prisma, auth.user.id, 'attendance.clocked_out', 'Attendance', record.id, {});
    return NextResponse.json({ record });
  }

  if (action === 'mark') {
    if (!auth.user.permissions.includes('attendance.manage')) {
      return NextResponse.json({ error: 'You do not have permission to record attendance for staff.' }, { status: 403 });
    }
    const userId = optionalString(input.userId, 50);
    const status = STATUSES.includes(input.status) ? input.status : null;
    if (!userId || !status) return NextResponse.json({ error: 'Select a staff member and attendance status.' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { id: userId, status: 'ACTIVE' }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    const targetDate = input.date ? dayOnly(new Date(input.date)) : date;
    if (Number.isNaN(targetDate.getTime())) return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });
    const checkInAt = input.checkInAt ? parseDate(input.checkInAt) : null;
    const checkOutAt = input.checkOutAt ? parseDate(input.checkOutAt) : null;
    if ((checkInAt && Number.isNaN(checkInAt.getTime())) || (checkOutAt && Number.isNaN(checkOutAt.getTime()))) {
      return NextResponse.json({ error: 'Choose valid attendance times.' }, { status: 400 });
    }
    const record = await prisma.attendance.upsert({
      where: { userId_date: { userId, date: targetDate } },
      update: { status, note: optionalString(input.note, 300), checkInAt, checkOutAt, recordedById: auth.user.id },
      create: { userId, date: targetDate, status, note: optionalString(input.note, 300), checkInAt, checkOutAt, recordedById: auth.user.id }
    });
    await recordAudit(prisma, auth.user.id, 'attendance.recorded', 'Attendance', record.id, { userId, status });
    return NextResponse.json({ record }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown attendance action.' }, { status: 400 });
}
