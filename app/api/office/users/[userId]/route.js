import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { validatePhoto } from '../../../../../lib/media';
import { cleanEmail, isEmail, isPhone, optionalString, parseDate, requiredString } from '../../../../../lib/validation';

export const runtime = 'nodejs';

const USER_INCLUDE = {
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
  roles: { select: { role: { select: { id: true, key: true, name: true, isSystem: true } }, assignedAt: true } }
};

function serialize(user) {
  return { ...user, roles: user.roles.map(({ role, assignedAt }) => ({ ...role, assignedAt })) };
}

async function activeSuperAdmins(tx, excludeId) {
  return tx.user.count({
    where: {
      status: 'ACTIVE',
      ...(excludeId ? { id: { not: excludeId } } : {}),
      roles: { some: { role: { key: 'SUPER_ADMIN' } } }
    }
  });
}

export async function GET(request, { params }) {
  const auth = await requirePermission('staff.view');
  if (auth.response) return auth.response;
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_INCLUDE,
      id: true, employeeId: true, email: true, slackEmail: true, name: true, phone: true, photoUrl: true,
      jobTitle: true, officeLocation: true, dateEmployed: true, emergencyContactName: true,
      emergencyContactPhone: true, status: true, lastLoginAt: true, createdAt: true, updatedAt: true
    }
  });
  if (!user) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  const [audit, attendance] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { OR: [{ actorId: userId }, { entityType: 'User', entityId: userId }] },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40
    }),
    prisma.attendance.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 14 })
  ]);
  return NextResponse.json({ user: serialize(user), activity: audit, attendance });
}

export async function PATCH(request, { params }) {
  const auth = await requirePermission('staff.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const { userId } = await params;
  const existing = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!existing) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (userId === auth.user.id && (input.status === 'DEACTIVATED' || Array.isArray(input.roles))) {
    return NextResponse.json({ error: 'You cannot deactivate your own account or change your own role assignment.' }, { status: 409 });
  }

  const email = input.email !== undefined ? cleanEmail(input.email) : existing.email;
  const slackEmail = input.slackEmail !== undefined ? cleanEmail(input.slackEmail) : existing.slackEmail || '';
  const name = input.name !== undefined ? requiredString(input.name, 150) : existing.name;
  if (!name || !isEmail(email)) return NextResponse.json({ error: 'Enter a valid name and email address.' }, { status: 400 });
  if (slackEmail && !isEmail(slackEmail)) return NextResponse.json({ error: 'Enter a valid Slack email address, or leave it blank.' }, { status: 400 });
  if (input.phone && !isPhone(input.phone)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  let photoUrl;
  try {
    photoUrl = input.photo !== undefined ? validatePhoto(input.photo) : undefined;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const dateEmployed = input.dateEmployed ? parseDate(input.dateEmployed) : undefined;
  if (dateEmployed && Number.isNaN(dateEmployed.getTime())) return NextResponse.json({ error: 'Enter a valid employment date.' }, { status: 400 });
  const password = typeof input.password === 'string' && input.password ? input.password : null;
  if (password && (password.length < 12 || password.length > 200)) return NextResponse.json({ error: 'The new password must be at least 12 characters.' }, { status: 400 });

  const roleKeys = Array.isArray(input.roles) ? [...new Set(input.roles.filter((key) => typeof key === 'string'))] : null;
  let roles = null;
  if (roleKeys) {
    if (!roleKeys.length) return NextResponse.json({ error: 'Keep at least one role assigned.' }, { status: 400 });
    roles = await prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true } });
    if (roles.length !== roleKeys.length) return NextResponse.json({ error: 'One or more selected roles are unavailable.' }, { status: 400 });
  }
  const departmentId = input.departmentId === null || input.departmentId === '' ? null : input.departmentId !== undefined ? optionalString(input.departmentId, 50) : existing.departmentId;
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } });
    if (!department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  }
  const managerId = input.managerId === null || input.managerId === '' ? null : input.managerId !== undefined ? optionalString(input.managerId, 50) : existing.managerId;
  if (managerId === userId) return NextResponse.json({ error: 'A staff member cannot report to themselves.' }, { status: 400 });
  if (managerId) {
    const manager = await prisma.user.findFirst({ where: { id: managerId, status: 'ACTIVE' }, select: { id: true } });
    if (!manager) return NextResponse.json({ error: 'Selected reporting manager is unavailable.' }, { status: 400 });
  }

  const willBeSuperAdmin = roles ? roles.some((role) => role.key === 'SUPER_ADMIN') : existing.roles.some(({ role }) => role.key === 'SUPER_ADMIN');
  const deactivating = input.status === 'DEACTIVATED';
  if ((deactivating || !willBeSuperAdmin) && existing.roles.some(({ role }) => role.key === 'SUPER_ADMIN')) {
    const others = await activeSuperAdmins(prisma, userId);
    if (others < 1) return NextResponse.json({ error: 'Keep at least one active administrator account.' }, { status: 409 });
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const currentKeys = existing.roles.map(({ role }) => role.key);
      if (roles) {
        const nextKeys = roles.map((role) => role.key);
        await tx.userRole.deleteMany({ where: { userId, role: { key: { notIn: nextKeys } } } });
        for (const role of roles) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId, roleId: role.id } },
            update: {},
            create: { userId, roleId: role.id, assignedBy: auth.user.id }
          });
        }
        for (const key of currentKeys.filter((key) => !nextKeys.includes(key))) {
          const role = existing.roles.find((item) => item.role.key === key)?.role;
          await tx.roleChange.create({ data: { userId, roleId: role?.id || null, roleKey: key, action: 'REVOKED', actorId: auth.user.id } });
        }
        for (const key of nextKeys.filter((key) => !currentKeys.includes(key))) {
          await tx.roleChange.create({ data: { userId, roleId: roles.find((role) => role.key === key).id, roleKey: key, action: 'ASSIGNED', actorId: auth.user.id } });
        }
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          slackEmail: input.slackEmail !== undefined ? (slackEmail || null) : undefined,
          phone: input.phone !== undefined ? optionalString(input.phone, 40) : undefined,
          photoUrl,
          jobTitle: input.jobTitle !== undefined ? optionalString(input.jobTitle, 120) : undefined,
          employeeId: input.employeeId !== undefined ? optionalString(input.employeeId, 50) : undefined,
          officeLocation: input.officeLocation !== undefined ? optionalString(input.officeLocation, 150) : undefined,
          dateEmployed,
          emergencyContactName: input.emergencyContactName !== undefined ? optionalString(input.emergencyContactName, 120) : undefined,
          emergencyContactPhone: input.emergencyContactPhone !== undefined ? optionalString(input.emergencyContactPhone, 40) : undefined,
          departmentId,
          managerId,
          status: input.status === 'ACTIVE' || input.status === 'DEACTIVATED' ? input.status : undefined,
          passwordHash: password ? await hash(password, 12) : undefined,
          failedLoginAttempts: password ? 0 : undefined,
          lockoutUntil: password ? null : undefined
        },
        include: USER_INCLUDE
      });
      await recordAudit(tx, auth.user.id, 'staff.updated', 'User', userId, {
        status: updated.status,
        roles: roles ? roles.map((role) => role.key) : undefined,
        slackEmail: updated.slackEmail,
        passwordReset: Boolean(password)
      });
      return serialize(updated);
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'That email address or employee ID is already in use.' }, { status: 409 });
    throw error;
  }
}
