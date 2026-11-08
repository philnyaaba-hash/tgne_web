import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { validatePhoto } from '../../../../lib/media';
import { slackInviteUrl } from '../../../../lib/slack';
import { cleanEmail, isEmail, isPhone, optionalString, parseDate, requiredString, toCsv } from '../../../../lib/validation';

export const runtime = 'nodejs';

const STAFF_SELECT = {
  id: true,
  employeeId: true,
  email: true,
  slackEmail: true,
  name: true,
  phone: true,
  photoUrl: true,
  jobTitle: true,
  officeLocation: true,
  dateEmployed: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
  roles: { select: { role: { select: { id: true, key: true, name: true, isSystem: true } }, assignedAt: true } }
};

function serialize(user) {
  return {
    ...user,
    roles: user.roles.map(({ role, assignedAt }) => ({ ...role, assignedAt }))
  };
}

export async function GET(request) {
  const auth = await requirePermission('staff.view');
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') || '').trim().slice(0, 100);
  const status = params.get('status') || 'ALL';
  const where = {
    ...(status !== 'ALL' ? { status } : {}),
    ...(query ? {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { employeeId: { contains: query, mode: 'insensitive' } },
        { jobTitle: { contains: query, mode: 'insensitive' } },
        { department: { name: { contains: query, mode: 'insensitive' } } }
      ]
    } : {})
  };
  const users = (await prisma.user.findMany({ where, select: STAFF_SELECT, orderBy: { name: 'asc' }, take: 500 })).map(serialize);

  if (params.get('format') === 'csv') {
    if (!auth.user.permissions.includes('staff.export')) {
      return NextResponse.json({ error: 'You do not have permission to export the staff directory.' }, { status: 403 });
    }
    const headers = ['Employee ID', 'Name', 'Email', 'Slack email', 'Phone', 'Job title', 'Department', 'Manager', 'Roles', 'Status', 'Date employed', 'Office'];
    const rows = users.map((user) => [
      user.employeeId, user.name, user.email, user.slackEmail, user.phone, user.jobTitle, user.department?.name,
      user.manager?.name, user.roles.map((role) => role.name).join('; '), user.status,
      user.dateEmployed ? new Date(user.dateEmployed).toISOString().slice(0, 10) : '', user.officeLocation
    ]);
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        'content-type': 'text/csv;charset=utf-8',
        'content-disposition': 'attachment; filename="staff-directory-' + new Date().toISOString().slice(0, 10) + '.csv"'
      }
    });
  }
  const canManage = auth.user.permissions.includes('staff.manage');
  return NextResponse.json({ users, slack: { inviteUrl: canManage ? slackInviteUrl() : null } });
}

export async function POST(request) {
  const auth = await requirePermission('staff.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const email = cleanEmail(input?.email);
  const name = requiredString(input?.name, 150);
  const slackEmail = input?.slackEmail ? cleanEmail(input.slackEmail) : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const roleKeys = Array.isArray(input?.roles) ? [...new Set(input.roles.filter((key) => typeof key === 'string'))] : [];
  if (!name || !isEmail(email) || password.length < 12 || password.length > 200) {
    return NextResponse.json({ error: 'Enter a name, valid email, and a password of at least 12 characters.' }, { status: 400 });
  }
  if (!roleKeys.length) return NextResponse.json({ error: 'Assign at least one role.' }, { status: 400 });
  if (slackEmail && !isEmail(slackEmail)) return NextResponse.json({ error: 'Enter a valid Slack email address, or leave it blank.' }, { status: 400 });
  if (input.phone && !isPhone(input.phone)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  let photoUrl = null;
  try {
    photoUrl = validatePhoto(input.photo);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const dateEmployed = input.dateEmployed ? parseDate(input.dateEmployed) : null;
  if (dateEmployed && Number.isNaN(dateEmployed.getTime())) return NextResponse.json({ error: 'Enter a valid employment date.' }, { status: 400 });

  const [roles, department, manager] = await Promise.all([
    prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true } }),
    input.departmentId ? prisma.department.findFirst({ where: { id: input.departmentId, active: true }, select: { id: true } }) : null,
    input.managerId ? prisma.user.findFirst({ where: { id: input.managerId, status: 'ACTIVE' }, select: { id: true } }) : null
  ]);
  if (roles.length !== roleKeys.length) return NextResponse.json({ error: 'One or more selected roles are unavailable.' }, { status: 400 });
  if (input.departmentId && !department) return NextResponse.json({ error: 'Selected department is unavailable.' }, { status: 400 });
  if (input.managerId && !manager) return NextResponse.json({ error: 'Selected reporting manager is unavailable.' }, { status: 400 });

  try {
    const passwordHash = await hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          slackEmail: slackEmail || null,
          passwordHash,
          phone: optionalString(input.phone, 40),
          photoUrl,
          jobTitle: optionalString(input.jobTitle, 120),
          employeeId: optionalString(input.employeeId, 50),
          officeLocation: optionalString(input.officeLocation, 150),
          dateEmployed,
          emergencyContactName: optionalString(input.emergencyContactName, 120),
          emergencyContactPhone: optionalString(input.emergencyContactPhone, 40),
          departmentId: department?.id || null,
          managerId: manager?.id || auth.user.id,
          roles: { create: roles.map((role) => ({ roleId: role.id, assignedBy: auth.user.id })) }
        },
        select: STAFF_SELECT
      });
      for (const role of roles) {
        await tx.roleChange.create({
          data: { userId: created.id, roleId: role.id, roleKey: role.key, action: 'ASSIGNED', actorId: auth.user.id, note: 'Role assigned at account creation.' }
        });
      }
      await recordAudit(tx, auth.user.id, 'staff.created', 'User', created.id, {
        roles: roles.map((role) => role.key),
        departmentId: department?.id || null,
        slackEmail: slackEmail || null
      });
      return serialize(created);
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'That email address or employee ID is already in use.' }, { status: 409 });
    throw error;
  }
}
