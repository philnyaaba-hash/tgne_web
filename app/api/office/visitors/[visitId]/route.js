import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { validatePhoto } from '../../../../../lib/media';
import { optionalString, parseDate, requiredString, VISIT_CATEGORIES } from '../../../../../lib/validation';
import { publicVisit } from '../route';

export const runtime = 'nodejs';

const INCLUDE = {
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

export async function GET(_request, { params }) {
  const auth = await requirePermission('visitors.view');
  if (auth.response) return auth.response;
  const { visitId } = await params;
  const visit = await prisma.visit.findUnique({ where: { id: visitId }, include: INCLUDE });
  if (!visit) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  const result = publicVisit(visit);
  result.visitor.photoUrl = visit.visitor.photoUrl || null;
  return NextResponse.json({ visit: result });
}

export async function PATCH(request, { params }) {
  const auth = await requirePermission('visitors.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  const { visitId } = await params;
  const existing = await prisma.visit.findUnique({ where: { id: visitId }, include: { visitor: { select: { id: true } } } });
  if (!existing) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });

  const hostId = optionalString(input.hostId, 50);
  const departmentId = optionalString(input.departmentId, 50);
  const meetingRoomId = optionalString(input.meetingRoomId, 50);
  const [host, department, room] = await Promise.all([
    hostId ? prisma.user.findFirst({ where: { id: hostId, status: 'ACTIVE' }, select: { id: true } }) : null,
    departmentId ? prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } }) : null,
    meetingRoomId ? prisma.meetingRoom.findFirst({ where: { id: meetingRoomId, active: true }, select: { id: true } }) : null
  ]);
  if (hostId && !host) return NextResponse.json({ error: 'Selected host is unavailable.' }, { status: 400 });
  if (departmentId && !department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  if (meetingRoomId && !room) return NextResponse.json({ error: 'Selected meeting room is unavailable.' }, { status: 400 });

  const arrival = input.expectedArrival ? parseDate(input.expectedArrival) : existing.expectedArrival;
  const checkout = input.expectedCheckout ? parseDate(input.expectedCheckout) : existing.expectedCheckout;
  if ((arrival && Number.isNaN(arrival.getTime())) || (checkout && Number.isNaN(checkout.getTime()))) {
    return NextResponse.json({ error: 'Choose valid visit times.' }, { status: 400 });
  }
  if (arrival && checkout && checkout <= arrival) return NextResponse.json({ error: 'Departure must be later than arrival.' }, { status: 400 });
  const category = input.category && VISIT_CATEGORIES.includes(input.category) ? input.category : undefined;
  const purpose = input.purpose !== undefined ? requiredString(input.purpose, 1000) : undefined;
  if (purpose !== undefined && !purpose) return NextResponse.json({ error: 'Purpose of visit is required.' }, { status: 400 });

  let photoUrl;
  try {
    photoUrl = input.photo !== undefined ? validatePhoto(input.photo) : undefined;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const visit = await prisma.$transaction(async (tx) => {
    if (photoUrl !== undefined) {
      await tx.visitor.update({ where: { id: existing.visitor.id }, data: { photoUrl } });
    }
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: {
        hostId: hostId || existing.hostId,
        departmentId: departmentId || existing.departmentId,
        meetingRoomId: meetingRoomId || existing.meetingRoomId,
        purpose,
        category,
        appointmentReference: input.appointmentReference !== undefined ? optionalString(input.appointmentReference, 100) : undefined,
        expectedArrival: arrival,
        expectedCheckout: checkout,
        expectedDurationMinutes: arrival && checkout ? Math.round((checkout.getTime() - arrival.getTime()) / 60000) : undefined,
        accessZones: input.accessZones !== undefined ? optionalString(input.accessZones, 300) : undefined,
        notes: input.notes !== undefined ? optionalString(input.notes, 1000) : undefined,
        qrVersion: existing.status === 'CHECKED_IN' ? { increment: 1 } : undefined
      },
      include: INCLUDE
    });
    await recordAudit(tx, auth.user.id, 'visitor.updated', 'Visit', visitId, {
      hostChanged: Boolean(hostId && hostId !== existing.hostId),
      rescheduled: Boolean(input.expectedArrival || input.expectedCheckout)
    });
    return updated;
  });
  return NextResponse.json({ visit: publicVisit(visit) });
}
