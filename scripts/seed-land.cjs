const fs = require('fs');
const path = require('path');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');

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

const listings = require('../lib/land-demo.json');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Set DATABASE_URL before seeding the storefront.');

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    let created = 0;
    for (const listing of listings) {
      const existing = await prisma.landListing.findUnique({ where: { slug: listing.slug }, select: { id: true } });
      if (existing) continue;
      await prisma.landListing.create({
        data: {
          ...listing,
          sellerEmail: process.env.NEXT_PUBLIC_LAND_EMAIL || null,
          publishedAt: new Date(listing.publishedAt)
        }
      });
      created += 1;
    }
    console.log('Land storefront seed complete: ' + created + ' created, ' + (listings.length - created) + ' already present.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Land storefront seed failed:', error.message);
  process.exitCode = 1;
});
