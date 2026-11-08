import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hash } from 'bcryptjs';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts.js';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]] !== undefined) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[match[1]] = value;
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const roles = await prisma.role.findMany({ where: { key: { in: DEMO_ACCOUNTS.map((account) => account.role) } } });
const roleIds = new Map(roles.map((role) => [role.key, role.id]));

const missing = DEMO_ACCOUNTS.filter((account) => !roleIds.has(account.role));
if (missing.length) {
  console.error('Missing roles: ' + missing.map((account) => account.role).join(', ') + '. Run npm run db:bootstrap-admin first.');
  await prisma.$disconnect();
  process.exit(1);
}

for (const account of DEMO_ACCOUNTS) {
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: { name: account.name, status: 'ACTIVE' },
    create: {
      email: account.email,
      name: account.name,
      passwordHash: await hash(randomUUID(), 10),
      jobTitle: 'Demo account',
      status: 'ACTIVE'
    }
  });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: roleIds.get(account.role) } });

  if (account.role === 'CLIENT') {
    const profile = await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        clientCode: 'DEMO-CLIENT',
        address: 'Demo account',
        region: 'Greater Accra',
        city: 'Accra'
      }
    });
    const holdings = await prisma.landHolding.count({ where: { clientId: profile.id } });
    if (!holdings) {
      await prisma.landHolding.create({
        data: {
          clientId: profile.id,
          title: 'Adenta Ridge residential plots',
          region: 'Greater Accra',
          district: 'Adenta Municipal',
          community: 'Adenta',
          sizeAcres: 0.25,
          acquisitionDate: new Date('2025-03-15'),
          acquisitionPrice: 220000,
          currentValue: 245000,
          titleStatus: 'REGISTERED',
          status: 'ACTIVE',
          notes: 'Demo holding for the quick sign-in client account.'
        }
      });
    }
  }

  console.log('Seeded ' + account.role + ' as ' + account.email);
}

await prisma.$disconnect();
