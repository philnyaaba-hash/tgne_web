// Smoke-check a running app: npm run smoke
// Override the target with SMOKE_BASE_URL, e.g. SMOKE_BASE_URL=http://localhost:3001
const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 120_000);

const CHECKS = [
  { path: '/api/health', status: 200, json: (body) => body.status === 'ok' },
  { path: '/', status: 200, html: 'TGNE Solutions' },
  { path: '/shop', status: 200, html: 'TGNE' },
  { path: '/case-studies', status: 200, html: 'Case studies' },
  { path: '/case-studies/client-portal-and-office-workspace', status: 200, html: 'Engagement facts' },
  { path: '/blog', status: 200, html: 'Notes from the' },
  { path: '/blog/what-a-small-business-website-in-ghana-needs', status: 200, html: 'On this page' },
  { path: '/dashboard', status: 200, html: 'Workspace' },
  { path: '/api/auth/session', status: 200, json: (body) => 'user' in body },
  { path: '/api/assistant', status: 200, json: (body) => 'authenticated' in body }
];

async function runCheck(check) {
  const started = Date.now();
  try {
    const response = await fetch(baseUrl + check.path, {
      headers: { accept: check.json ? 'application/json' : 'text/html' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await response.text();
    if (response.status !== check.status) {
      throw new Error(`expected HTTP ${check.status}, received ${response.status}`);
    }
    if (check.json) {
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error('response was not valid JSON');
      }
      if (!check.json(body)) throw new Error('response payload did not match the expected contract');
    }
    if (check.html && !text.includes(check.html)) {
      throw new Error(`page HTML did not contain "${check.html}"`);
    }
    console.log(`PASS ${check.path} (${response.status}, ${Date.now() - started}ms)`);
    return true;
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : error.message;
    console.error(`FAIL ${check.path}: ${reason}`);
    return false;
  }
}

console.log(`Smoke-checking ${baseUrl}`);
let failures = 0;
for (const check of CHECKS) {
  if (!(await runCheck(check))) failures += 1;
}

if (failures) {
  console.error(`\n${failures} of ${CHECKS.length} checks failed.`);
  console.error('Start the app with "npm run dev" and make sure it is ready before running this.');
  process.exit(1);
}

console.log(`\nAll ${CHECKS.length} checks passed.`);
