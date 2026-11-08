import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requirePermission('roles.manage');
  if (auth.response) return auth.response;
  const [roles, permissions, changes] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: { include: { permission: { select: { key: true, module: true, action: true, description: true } } } },
        _count: { select: { users: true } }
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    }),
    prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] }),
    prisma.roleChange.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        actor: { select: { id: true, name: true } },
        role: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 80
    })
  ]);
  return NextResponse.json({
    roles: roles.map(({ permissions: items, ...role }) => ({ ...role, permissions: items.map(({ permission }) => permission) })),
    permissions,
    changes
  });
}

export async function POST(request) {
  const auth = await requirePermission('roles.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const name = requiredString(input?.name, 100);
  const key = requiredString(input?.key, 40).toLowerCase();
  const description = requiredString(input?.description, 300);
  const permissionKeys = Array.isArray(input?.permissions) ? [...new Set(input.permissions.filter((value) => typeof value === 'string'))] : [];
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(key) || !name || description.length > 300) {
    return NextResponse.json({ error: 'Enter a role key, name, and a description no longer than 300 characters.' }, { status: 400 });
  }
  if (!permissionKeys.length) return NextResponse.json({ error: 'Select at least one permission.' }, { status: 400 });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true, key: true } });
  if (permissions.length !== permissionKeys.length) return NextResponse.json({ error: 'One or more permissions are unavailable.' }, { status: 400 });
  try {
    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          key,
          name,
          description,
          permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
        },
        include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }
      });
      await recordAudit(tx, auth.user.id, 'role.created', 'Role', created.id, { key, permissions: permissionKeys });
      return created;
    });
    return NextResponse.json({
      role: { ...role, permissions: role.permissions.map(({ permission }) => permission) }
    }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A role with this key already exists.' }, { status: 409 });
    throw error;
  }
}
