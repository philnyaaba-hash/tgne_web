import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { encryptVisitorIdentifier } from '../../../../lib/visitor-privacy';
import { validatePhoto } from '../../../../lib/media';
import { getSettings } from '../../../../lib/settings';
import { notifyVisitorEvent } from '../../../../lib/notifications';
import {
  cleanEmail,
  effectiveVisitStatus,
  isEmail,
  isPhone,
  optionalString,
  parseDate,
  requiredString,
  VISIT_CATEGORIES
} from '../../../../lib/validation';

export const runtime = 'nodejs';

const VISIT_INCLUDE = {
  visitor: true,
  host: { select: { id: true, name: true, email: true, jobTitle: true } },
  department: { select: { id: true, name: true } },
  meetingRoom: { select: { id: true, name: true, location: true } },
  registeredBy: { select: { id: true, name: true } },
  checkedInBy: { select: { id: true, name: true } },
  checkedOutBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  correctedBy: { select: { id: true, name: true } }
};

export function publicVisit(visit) {
  const status = effectiveVisitStatus(visit);
  const { identificationCiphertext, photoUrl, ...visitor } = visit.visitor;
  return {
    ...visit,
    status,
    visitor: { ...visitor, hasPhoto: Boolean(photoUrl) }
  };
}

export async function GET(request) {
  const auth = await requirePermission('visitors.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') || '').trim().slice(0, 100);
  const status = params.get('status') || 'ALL';
  const allowedStatuses = ['ALL', 'OVERDUE', 'EXPIRED', 'EXPECTED', 'AWAITING_APPROVAL', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'DENIED'];
  if (!allowedStatuses.includes(status)) return NextResponse.json({ error: 'Unknown visit status.' }, { status: 400 });
  const now = new Date();
  const baseWhere = {
    ...(query ? {
      OR: [
        { visitCode: { contains: query, mode: 'insensitive' } },
        { visitor: { visitorId: { contains: query, mode: 'insensitive' } } },
        { visitor: { fullName: { contains: query, mode: 'insensitive' } } },
        { visitor: { phone: { contains: query } } },
        { visitor: { organization: { contains: query, mode: 'insensitive' } } },
        { host: { name: { contains: query, mode: 'insensitive' } } }
      ]
    } : {})
  };
  const where = { ...baseWhere };
  if (status === 'CHECKED_IN') where.status = 'CHECKED_IN';
  else if (status === 'OVERDUE') {
    where.status = 'CHECKED_IN';
    where.expectedCheckout = { lt: now };
  } else if (status === 'EXPIRED') {
    where.status = 'EXPECTED';
    where.expectedCheckout = { lt: now };
  } else if (status !== 'ALL') where.status = status;
  const visits = await prisma.visit.findMany({
    where,
    include: VISIT_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 300
  });
  const rows = visits.map(publicVisit);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const [todayByStatus, inside, overdue, expectedToday, checkedOutToday, pending] = await Promise.all([
    prisma.visit.groupBy({ by: ['status'], where: { OR: [{ expectedArrival: { gte: start, lt: end } }, { createdAt: { gte: start, lt: end } }] }, _count: { _all: true } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN' } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN', expectedCheckout: { lt: now } } }),
    prisma.visit.count({ where: { status: 'EXPECTED', expectedArrival: { gte: start, lt: end } } }),
    prisma.visit.count({ where: { status: 'CHECKED_OUT', checkedOutAt: { gte: start, lt: end } } }),
    prisma.visit.count({ where: { status: 'AWAITING_APPROVAL' } })
  ]);
  const counts = Object.fromEntries(todayByStatus.map(({ status: itemStatus, _count }) => [itemStatus, _count._all]));
  return NextResponse.json({
    visits: rows,
    counts: { ...counts, INSIDE: inside, OVERDUE: overdue, EXPECTED_TODAY: expectedToday, CHECKED_OUT_TODAY: checkedOutToday, AWAITING_APPROVAL: pending }
  });
}

export async function POST(request) {
  const auth = await requirePermission('visitors.register');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });

  const settings = await getSettings();
  const existingVisitorId = optionalString(input.existingVisitorId, 50);
  const existingVisitor = existingVisitorId
    ? await prisma.visitor.findUnique({ where: { id: existingVisitorId } })
    : null;
  if (existingVisitorId && !existingVisitor) return NextResponse.json({ error: 'The selected visitor record no longer exists.' }, { status: 400 });
  const fullName = requiredString(input.fullName, 150) || existingVisitor?.fullName || '';
  const phone = requiredString(input.phone, 40) || existingVisitor?.phone || '';
  const email = cleanEmail(input.email) || existingVisitor?.email || '';
  const purpose = requiredString(input.purpose, 1000);
  const category = typeof input.category === 'string' ? input.category : 'GUEST';
  if (!fullName || !isPhone(phone) || !purpose || !VISIT_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Enter a visitor name, valid phone number, purpose, and visit category.' }, { status: 400 });
  }
  if (email && !isEmail(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (input.consent !== true) return NextResponse.json({ error: 'Visitor consent is required before storing personal information.' }, { status: 400 });

  let photoUrl = null;
  try {
    photoUrl = validatePhoto(input.photo);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (settings.security.photoRequired && !photoUrl) {
    return NextResponse.json({ error: 'A visitor photograph is required by your organization policy.' }, { status: 400 });
  }

  const arrival = input.expectedArrival ? parseDate(input.expectedArrival) : new Date();
  const fallbackMinutes = Number(settings.security.defaultVisitMinutes) || 120;
  const duration = Math.min(60 * 24 * 14, Math.max(15, Number(input.expectedDurationMinutes) || fallbackMinutes));
  const expectedCheckout = input.expectedCheckout
    ? parseDate(input.expectedCheckout)
    : new Date(arrival.getTime() + duration * 60 * 1000);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(expectedCheckout.getTime()) || expectedCheckout <= arrival) {
    return NextResponse.json({ error: 'Choose valid arrival and departure times; departure must be later than arrival.' }, { status: 400 });
  }

  const hostId = optionalString(input.hostId, 50);
  const departmentId = optionalString(input.departmentId, 50);
  const meetingRoomId = optionalString(input.meetingRoomId, 50);
  const [host, department, room] = await Promise.all([
    hostId ? prisma.user.findFirst({ where: { id: hostId, status: 'ACTIVE' }, select: { id: true, departmentId: true } }) : null,
    departmentId ? prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } }) : null,
    meetingRoomId ? prisma.meetingRoom.findFirst({ where: { id: meetingRoomId, active: true }, select: { id: true } }) : null
  ]);
  if (hostId && !host) return NextResponse.json({ error: 'Selected host is unavailable.' }, { status: 400 });
  if (departmentId && !department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  if (meetingRoomId && !room) return NextResponse.json({ error: 'Selected meeting room is unavailable.' }, { status: 400 });

  const identifier = requiredString(input.identificationNumber, 100);
  let identificationCiphertext = null;
  try {
    identificationCiphertext = encryptVisitorIdentifier(identifier);
  } catch (error) {
    if (identifier) return NextResponse.json({ error: error.message }, { status: 503 });
  }

  const approvalCategories = settings.security.requireApprovalForCategories || [];
  const status = input.requiresApproval === true || approvalCategories.includes(category) ? 'AWAITING_APPROVAL' : 'EXPECTED';
  const year = new Date().getFullYear();
  const visitorCode = 'VIS-' + year + '-' + randomBytes(4).toString('hex').toUpperCase();
  const visitCode = 'VISIT-' + year + '-' + randomBytes(4).toString('hex').toUpperCase();

  const visit = await prisma.$transaction(async (tx) => {
    const visitor = existingVisitor
      ? await tx.visitor.update({
        where: { id: existingVisitor.id },
        data: {
          fullName,
          phone,
          email: email || undefined,
          organization: optionalString(input.organization, 150) || undefined,
          photoUrl: photoUrl || undefined,
          consentAt: new Date(),
          consentVersion: settings.security.consentVersion || null,
          identificationType: optionalString(input.identificationType, 50) || undefined,
          identificationCiphertext: identificationCiphertext || undefined
        }
      })
      : await tx.visitor.create({
        data: {
          visitorId: visitorCode,
          fullName,
          phone,
          email: email || null,
          organization: optionalString(input.organization, 150),
          photoUrl,
          identificationType: optionalString(input.identificationType, 50),
          identificationCiphertext,
          consentAt: new Date(),
          consentVersion: settings.security.consentVersion || null,
          notes: optionalString(input.notes, 500)
        }
      });
    const created = await tx.visit.create({
      data: {
        visitCode,
        visitorId: visitor.id,
        hostId: host?.id || null,
        departmentId: department?.id || host?.departmentId || null,
        meetingRoomId: room?.id || null,
        purpose,
        category,
        appointmentReference: optionalString(input.appointmentReference, 100),
        expectedArrival: arrival,
        expectedCheckout,
        expectedDurationMinutes: Math.round((expectedCheckout.getTime() - arrival.getTime()) / 60000),
        accessZones: optionalString(input.accessZones, 300) || settings.card.accessZones || null,
        notes: optionalString(input.notes, 1000),
        status,
        registeredById: auth.user.id
      },
      include: VISIT_INCLUDE
    });
    await recordAudit(tx, auth.user.id, 'visitor.registered', 'Visit', created.id, { visitorId: visitor.visitorId, status, category });
    return created;
  });

  notifyVisitorEvent('registered', visit, auth.user.id).catch(() => {});
  if (status === 'AWAITING_APPROVAL') notifyVisitorEvent('awaiting_approval', visit, auth.user.id).catch(() => {});
  return NextResponse.json({ visit: publicVisit(visit) }, { status: 201 });
}
