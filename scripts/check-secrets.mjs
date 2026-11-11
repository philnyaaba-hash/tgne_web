import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let trackedFiles;
try {
  trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
} catch (error) {
  console.error('Cannot verify tracked secrets because Git could not list repository files.');
  process.exit(1);
}

const violations = [];
for (const file of trackedFiles) {
  if (/(^|[\\/])\.env(?:\..*)?$/i.test(file) && file.toLowerCase() !== '.env.example') {
    violations.push(`${file}: local environment files must not be tracked.`);
  }
}

for (const file of ['lib/demo-accounts.js', 'tests/e2e/auth-redirect.spec.js', 'scripts/seed-demo-accounts.mjs']) {
  const source = readFileSync(resolve(root, file), 'utf8');
  if (/\bpassword\s*:\s*(['"`])[^'"`]+\1/i.test(source)) {
    violations.push(`${file}: test-account passwords must come from environment variables.`);
  }
  if (file.endsWith('seed-demo-accounts.mjs') && /console\.(?:log|info|debug)\([^)]*password/i.test(source)) {
    violations.push(`${file}: seeded passwords must never be logged.`);
  }
}

if (violations.length) {
  console.error('Secret hygiene check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Secret hygiene check passed: no tracked local environment files or hardcoded demo passwords.');
