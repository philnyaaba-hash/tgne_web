import { NextResponse } from 'next/server';
import { recordAudit, requireAnyPermission, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { clampInt, optionalString, requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAnyPermission(['visitors.view', 'visitors.register', 'organization.view', 'rooms.manage', 'staff.view']);
  if (auth.response) return auth.response;
  const rooms = await prisma.meetingRoom.findMany({
    orderBy: { name: 'asc' },
    include: { department: { select: { id: true, name: true } } }
  });
  return NextResponse.json({ rooms });
}

export async function POST(request) {
  const auth = await requirePermission('rooms.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const name = requiredString(input?.name, 100);
  if (!name) return NextResponse.json({ error: 'Room name is required.' }, { status: 400 });
  const departmentId = optionalString(input?.departmentId, 50);
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } });
    if (!department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  }
  try {
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.meetingRoom.create({
        data: {
          name,
          location: optionalString(input.location, 150),
          capacity: input.capacity ? clampInt(input.capacity, 1, 500, null) : null,
          departmentId
        }
      });
      await recordAudit(tx, auth.user.id, 'room.created', 'MeetingRoom', created.id, { name });
      return created;
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A meeting room with this name already exists.' }, { status: 409 });
    throw error;
  }
}
