import { hash } from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { demoAccountsForSeeding, demoSeedConfigurationErrors } from '../lib/demo-accounts.js';

try {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.error('Create .env and configure dedicated non-production test-account credentials before seeding.');
  process.exit(1);
}

const configurationErrors = demoSeedConfigurationErrors(process.env);
if (configurationErrors.length) {
  console.error('Demo account seeding was blocked:');
  for (const error of configurationErrors) console.error('- ' + error);
  process.exit(1);
}

const DEMO_ACCOUNTS = demoAccountsForSeeding(process.env);
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const roles = await prisma.role.findMany({ where: { key: { in: DEMO_ACCOUNTS.map((account) => account.role) } } });
  const roleIds = new Map(roles.map((role) => [role.key, role.id]));

  const missing = DEMO_ACCOUNTS.filter((account) => !roleIds.has(account.role));
  if (missing.length) {
    throw new Error('Missing roles: ' + missing.map((account) => account.role).join(', ') + '. Run npm run db:bootstrap-admin first.');
  }

  // Remove legacy accounts from earlier @landledger.test seeds.
  const legacyEmails = ['demo.admin', 'demo.manager', 'demo.accountant', 'demo.surveyor', 'demo.receptionist', 'demo.visitor', 'demo.client']
    .map((local) => local + '@landledger.test');
  const legacyUsers = await prisma.user.findMany({ where: { email: { in: legacyEmails } }, select: { id: true } });
  if (legacyUsers.length) {
    await prisma.user.deleteMany({ where: { id: { in: legacyUsers.map((user) => user.id) } } });
    console.log('Removed ' + legacyUsers.length + ' legacy landledger.test account(s).');
  }

  for (const account of DEMO_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, passwordHash: await hash(account.password, 10), status: 'ACTIVE' },
      create: {
        email: account.email,
        name: account.name,
        passwordHash: await hash(account.password, 10),
        jobTitle: 'TGNE team account',
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
          clientCode: 'TGNE-CLIENT',
          address: 'TGNE Solutions',
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
            notes: 'TGNE client holding for the client portal account.'
          }
        });
      }
    }

    console.log('Seeded ' + account.role + ' as ' + account.email + '.');
  }
} finally {
  await prisma.$disconnect();
}
