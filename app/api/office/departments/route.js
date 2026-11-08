import { NextResponse } from 'next/server';
import { recordAudit, requireAnyPermission, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { optionalString, requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAnyPermission(['visitors.view', 'visitors.register', 'staff.view', 'organization.view', 'departments.manage']);
  if (auth.response) return auth.response;
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      active: true,
      head: { select: { id: true, name: true } },
      _count: { select: { users: true } }
    }
  });
  return NextResponse.json({ departments });
}

export async function POST(request) {
  const auth = await requirePermission('departments.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const name = requiredString(input?.name, 100);
  if (!name) return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
  const headId = optionalString(input?.headId, 50);
  if (headId) {
    const head = await prisma.user.findFirst({ where: { id: headId, status: 'ACTIVE' }, select: { id: true } });
    if (!head) return NextResponse.json({ error: 'Selected department head is unavailable.' }, { status: 400 });
  }
  try {
    const department = await prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: { name, description: optionalString(input.description, 300), location: optionalString(input.location, 150), headId }
      });
      await recordAudit(tx, auth.user.id, 'department.created', 'Department', created.id, { name });
      return created;
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 });
    throw error;
  }
}
