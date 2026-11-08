const fs = require('fs');
const path = require('path');
const { hash } = require('bcryptjs');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');

// Plain Node does not load .env the way Next.js and the Prisma CLI do.
const envFile = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const PERMISSIONS = [
  ['visitors.view', 'Visitors', 'View visitor records, appointments, and live visits'],
  ['visitors.register', 'Visitors', 'Register visitors and appointments'],
  ['visitors.checkin', 'Visitors', 'Check visitors in and notify hosts'],
  ['visitors.checkout', 'Visitors', 'Check visitors out and record card returns'],
  ['visitors.card.print', 'Visitors', 'Issue temporary visitor cards and QR codes'],
  ['visitors.approve', 'Visitors', 'Approve or deny restricted visits'],
  ['visitors.manage', 'Visitors', 'Edit visit details and correct check-out records'],
  ['visitors.export', 'Visitors', 'Export the visitor register'],
  ['staff.view', 'Staff', 'View the staff directory and staff activity'],
  ['staff.manage', 'Staff', 'Create, update, deactivate, and reassign staff roles'],
  ['staff.export', 'Staff', 'Export the staff directory'],
  ['roles.manage', 'Security', 'Manage roles, permissions, and role assignments'],
  ['departments.manage', 'Organization', 'Manage departments and meeting rooms'],
  ['organization.view', 'Organization', 'View departments, staff names, and meeting rooms'],
  ['rooms.manage', 'Organization', 'Manage meeting rooms and assignments'],
  ['cards.configure', 'Visitors', 'Configure visitor ID card templates and print settings'],
  ['audit.view', 'Security', 'View system audit history'],
  ['attendance.view', 'Staff', 'View staff attendance records'],
  ['attendance.manage', 'Staff', 'Record and correct staff attendance'],
  ['finance.view', 'Finance', 'View authorized financial information'],
  ['finance.manage', 'Finance', 'Manage invoices, payments, and expenses'],
  ['finance.approve', 'Finance', 'Approve operational expenses'],
  ['finance.export', 'Finance', 'Export financial reports'],
  ['field.view', 'Surveying', 'View assigned land parcels and field projects'],
  ['field.manage', 'Surveying', 'Submit field work, survey measurements, and reports'],
  ['field.approve', 'Surveying', 'Approve submitted field reports'],
  ['reports.view', 'Reports', 'View operational reports'],
  ['reports.export', 'Reports', 'Export operational reports'],
  ['settings.manage', 'Settings', 'Manage organization and system settings'],
  ['notifications.manage', 'Settings', 'Configure, test, and review notifications'],
  ['compliance.view', 'Compliance', 'View Ghana compliance obligations and filings'],
  ['compliance.manage', 'Compliance', 'Record filings, assign owners, and manage compliance obligations'],
  ['growth.view', 'Growth', 'View prospects and outreach campaigns'],
  ['growth.manage', 'Growth', 'Manage prospects, consent records, and campaign drafts'],
  ['growth.send', 'Growth', 'Approve and send consented outreach campaigns'],
  ['land.view', 'Storefront', 'View the public land storefront and its listings'],
  ['land.manage', 'Storefront', 'Create, publish and manage land listings and reservations'],
  ['client.portal', 'Client portal', 'Open the client workspace with owned land and reservations'],
  ['client.resell', 'Client portal', 'Submit and manage resale requests for owned land'],
  ['client.services', 'Client portal', 'Request and track surveying, construction and land services'],
  ['client.documents', 'Client portal', 'Add and manage personal land documents'],
  ['client.payments', 'Client portal', 'View own invoices, receipts and payment history'],
  ['client.view', 'Clients', 'View client profiles, resale requests and service requests'],
  ['client.manage', 'Clients', 'Review resales, quote services and manage client records']
];

const ALL = PERMISSIONS.map(([key]) => key);

const ROLE_DEFINITIONS = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Admin / Admin',
    description: 'Full system administration, security, finance, operations, and settings.',
    permissions: ALL,
    isSystem: true
  },
  {
    key: 'OFFICE_MANAGER',
    name: 'Office Manager',
    description: 'Daily office operations, staff oversight, visitor lifecycle, rooms, and reports.',
    permissions: [
      'visitors.view', 'visitors.register', 'visitors.checkin', 'visitors.checkout',
      'visitors.card.print', 'visitors.approve', 'visitors.manage', 'visitors.export',
      'staff.view', 'staff.export', 'organization.view', 'rooms.manage', 'cards.configure',
      'attendance.view', 'attendance.manage', 'reports.view', 'reports.export',
      'notifications.manage', 'compliance.view', 'compliance.manage',
      'growth.view', 'growth.manage', 'growth.send',
      'land.view', 'land.manage',
      'client.view', 'client.manage'
    ],
    isSystem: true
  },
  {
    key: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Invoices, payments, expenses, and financial reporting. No visitor or security access.',
    permissions: ['finance.view', 'finance.manage', 'finance.export', 'reports.view', 'reports.export', 'organization.view', 'compliance.view', 'compliance.manage', 'client.view'],
    isSystem: true
  },
  {
    key: 'SURVEYOR',
    name: 'Surveyor',
    description: 'Assigned land parcels, field tasks, survey measurements, and field reports.',
    permissions: ['field.view', 'field.manage', 'organization.view', 'client.view'],
    isSystem: true
  },
  {
    key: 'CLIENT',
    name: 'Land client',
    description: 'Buy, hold, resell and service land from a private client workspace.',
    permissions: ['client.portal', 'client.resell', 'client.services', 'client.documents', 'client.payments'],
    isSystem: true
  },
  {
    key: 'RECEPTIONIST',
    name: 'Receptionist',
    description: 'Front desk visitor registration, check-in, check-out, and temporary cards.',
    permissions: [
      'visitors.view', 'visitors.register', 'visitors.checkin', 'visitors.checkout',
      'visitors.card.print', 'organization.view'
    ],
    isSystem: true
  },
  {
    key: 'VISITOR',
    name: 'Visitor',
    description: 'External visitor account with no office administration access.',
    permissions: [],
    isSystem: true
  }
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!connectionString) throw new Error('Set DATABASE_URL before bootstrapping.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a valid BOOTSTRAP_ADMIN_EMAIL.');
  if (password && password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  if (!password) throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters) for the initial administrator.');
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const [key, module, description] of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: { module, description, action: key.slice(key.indexOf('.') + 1) },
        create: { key, module, description, action: key.slice(key.indexOf('.') + 1) }
      });
    }

    const permissionIds = new Map(
      (await prisma.permission.findMany({ select: { id: true, key: true } })).map((permission) => [permission.key, permission.id])
    );

    for (const definition of ROLE_DEFINITIONS) {
      const role = await prisma.role.upsert({
        where: { key: definition.key },
        update: { name: definition.name, description: definition.description, isSystem: definition.isSystem },
        create: { key: definition.key, name: definition.name, description: definition.description, isSystem: definition.isSystem }
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      const rows = definition.permissions
        .map((permissionKey) => permissionIds.get(permissionKey))
        .filter(Boolean)
        .map((permissionId) => ({ roleId: role.id, permissionId }));
      if (rows.length) await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    }

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' }, select: { id: true } });
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: existing.id, roleId: adminRole.id } },
        update: {},
        create: { userId: existing.id, roleId: adminRole.id }
      });
      console.log('Administrator already exists; system roles and permissions were synchronized.');
    } else {
      const user = await prisma.user.create({
        data: {
          name: process.env.BOOTSTRAP_ADMIN_NAME || 'Workspace Administrator',
          email,
          passwordHash: await hash(password, 12),
          jobTitle: 'System Administrator',
          roles: { create: { roleId: adminRole.id } }
        },
        select: { id: true }
      });
      await prisma.auditEvent.create({
        data: { actorId: user.id, action: 'system.bootstrap_admin_created', entityType: 'User', entityId: user.id }
      });
      console.log('Initial administrator, system roles, and permissions created.');
    }
    console.log('Remove BOOTSTRAP_ADMIN_PASSWORD from the environment after this command.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Administrator bootstrap failed:', error.message);
  process.exitCode = 1;
});
