const REQUIRED = [
  ['DATABASE_URL', 'PostgreSQL/Neon connection string used by Prisma'],
  ['AUTH_SECRET', 'Session signing secret (at least 32 bytes)'],
  ['NEXT_PUBLIC_SITE_URL', 'Canonical public URL, e.g. https://tgne-solutions.com'],
  ['NEXT_PUBLIC_TGNE_EMAIL', 'Monitored inbox shown on the contact page and footer']
];

const RECOMMENDED = [
  ['APP_URL', 'Base URL used in emails and server-side links'],
  ['RESEND_API_KEY', 'Transactional email for enquiry notifications and auto-replies'],
  ['EMAIL_FROM', 'Verified sender address/domain in Resend']
];

function present(key) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

const missingRequired = REQUIRED.filter(([key]) => !present(key));
const missingRecommended = RECOMMENDED.filter(([key]) => !present(key));

if (missingRequired.length) {
  console.error('Missing required environment variables:\n');
  for (const [key, why] of missingRequired) console.error(`  - ${key}: ${why}`);
  console.error('\nCreate .env from .env.example and fill these in. Do not commit .env.');
}

if (missingRecommended.length) {
  console.warn('\nRecommended variables not set:');
  for (const [key, why] of missingRecommended) console.warn(`  - ${key}: ${why}`);
}

if (missingRequired.length) process.exit(1);

console.log('Environment looks ready for local development.');
