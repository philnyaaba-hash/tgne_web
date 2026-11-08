import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { clampInt, optionalString, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('rooms.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { roomId } = await params;
  const existing = await prisma.meetingRoom.findUnique({ where: { id: roomId } });
  if (!existing) return NextResponse.json({ error: 'Meeting room not found.' }, { status: 404 });
  const name = input.name !== undefined ? requiredString(input.name, 100) : existing.name;
  if (!name) return NextResponse.json({ error: 'Room name is required.' }, { status: 400 });
  const departmentId = input.departmentId === null || input.departmentId === '' ? null : input.departmentId !== undefined ? optionalString(input.departmentId, 50) : existing.departmentId;
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } });
    if (!department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  }
  try {
    const room = await prisma.$transaction(async (tx) => {
      const updated = await tx.meetingRoom.update({
        where: { id: roomId },
        data: {
          name,
          location: input.location !== undefined ? optionalString(input.location, 150) : undefined,
          capacity: input.capacity !== undefined ? (input.capacity ? clampInt(input.capacity, 1, 500, null) : null) : undefined,
          departmentId,
          active: typeof input.active === 'boolean' ? input.active : undefined
        },
        include: { department: { select: { id: true, name: true } } }
      });
      await recordAudit(tx, auth.user.id, 'room.updated', 'MeetingRoom', roomId, { name, active: updated.active });
      return updated;
    });
    return NextResponse.json({ room });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A meeting room with this name already exists.' }, { status: 409 });
    throw error;
  }
}
