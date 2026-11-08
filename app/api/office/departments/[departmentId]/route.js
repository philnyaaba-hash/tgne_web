import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { optionalString, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('departments.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { departmentId } = await params;
  const existing = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!existing) return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
  const name = input.name !== undefined ? requiredString(input.name, 100) : existing.name;
  if (!name) return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
  const headId = input.headId === null || input.headId === '' ? null : input.headId !== undefined ? optionalString(input.headId, 50) : existing.headId;
  if (headId) {
    const head = await prisma.user.findFirst({ where: { id: headId, status: 'ACTIVE' }, select: { id: true } });
    if (!head) return NextResponse.json({ error: 'Selected department head is unavailable.' }, { status: 400 });
  }
  try {
    const department = await prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id: departmentId },
        data: {
          name,
          description: input.description !== undefined ? optionalString(input.description, 300) : undefined,
          location: input.location !== undefined ? optionalString(input.location, 150) : undefined,
          headId,
          active: typeof input.active === 'boolean' ? input.active : undefined
        },
        include: { head: { select: { id: true, name: true } }, _count: { select: { users: true } } }
      });
      await recordAudit(tx, auth.user.id, 'department.updated', 'Department', departmentId, { name, active: updated.active });
      return updated;
    });
    return NextResponse.json({ department });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 });
    throw error;
  }
}
