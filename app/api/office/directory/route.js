import { NextResponse } from 'next/server';
import { requireAnyPermission } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAnyPermission(['visitors.view', 'visitors.register', 'staff.view', 'staff.manage', 'organization.view', 'rooms.manage']);
  if (auth.response) return auth.response;
  const canSeeRoles = auth.user.permissions.includes('staff.manage') || auth.user.permissions.includes('roles.manage');
  const [users, departments, rooms, roles] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        department: { select: { id: true, name: true } },
        roles: { select: { role: { select: { name: true } } } }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.meetingRoom.findMany({ where: { active: true }, select: { id: true, name: true, location: true, capacity: true }, orderBy: { name: 'asc' } }),
    canSeeRoles ? prisma.role.findMany({ select: { id: true, key: true, name: true, isSystem: true }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] }) : []
  ]);
  return NextResponse.json({
    users: users.map(({ roles: assignments, ...user }) => ({ ...user, roles: assignments.map(({ role }) => role.name) })),
    departments,
    rooms,
    roles
  });
}
