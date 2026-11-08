import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requirePermission('roles.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { roleId } = await params;
  const existing = await prisma.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
  if (!existing) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  if (existing.key === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'The Super Admin role is protected and cannot be reduced.' }, { status: 409 });
  }
  const name = input.name !== undefined ? requiredString(input.name, 100) : existing.name;
  const description = input.description !== undefined ? requiredString(input.description, 300) : existing.description;
  if (!name) return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  const permissionKeys = Array.isArray(input.permissions) ? [...new Set(input.permissions.filter((value) => typeof value === 'string'))] : null;
  if (permissionKeys && !permissionKeys.length) return NextResponse.json({ error: 'Select at least one permission.' }, { status: 400 });
  let permissions = null;
  if (permissionKeys) {
    permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true, key: true } });
    if (permissions.length !== permissionKeys.length) return NextResponse.json({ error: 'One or more permissions are unavailable.' }, { status: 400 });
  }
  if (existing.isSystem && permissions) {
    return NextResponse.json({ error: 'System role permissions are fixed. Create a custom role for different access.' }, { status: 409 });
  }
  const role = await prisma.$transaction(async (tx) => {
    if (permissions) {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      for (const permission of permissions) {
        await tx.rolePermission.create({ data: { roleId, permissionId: permission.id } });
      }
    }
    const updated = await tx.role.update({
      where: { id: roleId },
      data: { name, description },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }
    });
    await recordAudit(tx, auth.user.id, 'role.updated', 'Role', roleId, {
      key: existing.key,
      permissions: permissions ? permissions.map((permission) => permission.key) : undefined
    });
    return updated;
  });
  return NextResponse.json({ role: { ...role, permissions: role.permissions.map(({ permission }) => permission) } });
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission('roles.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { roleId } = await params;
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (!role) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: 'System roles cannot be deleted.' }, { status: 409 });
  if (role._count.users > 0) return NextResponse.json({ error: 'Reassign staff before deleting this role.' }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.role.delete({ where: { id: roleId } });
    await recordAudit(tx, auth.user.id, 'role.deleted', 'Role', roleId, { key: role.key, name: role.name });
  });
  return NextResponse.json({ ok: true });
}
