import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL must be configured for the secure office portal.');
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrisma() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrisma();
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({}, {
  get(_target, property) {
    const client = getPrisma();
    const value = client[property];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
