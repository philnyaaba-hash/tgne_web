import { test, expect } from '@playwright/test';

// These checks need the seeded role accounts (npm run seed:demo). They are
// skipped when the database is unavailable so the public suite still runs.
const ACCOUNTS = [
  { email: 'admin@tgnesolutions.com', password: 'Admin123!', path: '/admin' },
  { email: 'manager@tgnesolutions.com', password: 'Manager123!', path: '/admin' },
  { email: 'client@tgnesolutions.com', password: 'Client123!', path: '/client' }
];

const ACCOUNT_SWITCHING = [
  ACCOUNTS[0],
  {
    email: process.env.E2E_CLIENT_A_EMAIL || ACCOUNTS[2].email,
    password: process.env.E2E_CLIENT_A_PASSWORD || ACCOUNTS[2].password
  },
  {
    email: process.env.E2E_CLIENT_B_EMAIL || '',
    password: process.env.E2E_CLIENT_B_PASSWORD || ''
  }
];

async function signIn(page, account) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email', account.email);
  await page.fill('#login-password', account.password);
  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return button && !button.disabled;
  }, null, { timeout: 30_000 });
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45_000 });
}

for (const account of ACCOUNTS) {
  test(`sign-in routes ${account.email} to ${account.path}`, async ({ page, request }) => {
    const probe = await request.post('/api/auth/login', {
      data: { email: account.email, password: account.password },
      headers: { origin: 'http://localhost:3000' },
      failOnStatusCode: false
    });
    test.skip(probe.status() !== 200, 'role account not seeded (npm run seed:demo)');

    await signIn(page, account);
    await page.waitForTimeout(1000);
    expect(new URL(page.url()).pathname).toBe(account.path);
  });
}

test('signed-in staff see their profile in the header', async ({ page, request }) => {
  const account = ACCOUNTS[0];
  const probe = await request.post('/api/auth/login', {
    data: { email: account.email, password: account.password },
    headers: { origin: 'http://localhost:3000' },
    failOnStatusCode: false
  });
  test.skip(probe.status() !== 200, 'role account not seeded (npm run seed:demo)');

  await signIn(page, account);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const chip = page.locator('.ls-user-chip');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('TGNE Admin');
  await expect(chip).toHaveAttribute('href', '/admin');
});

test('canonical admin and client URLs enforce role-based redirects', async ({ page, request }) => {
  const adminProbe = await request.post('/api/auth/login', {
    data: { email: ACCOUNTS[0].email, password: ACCOUNTS[0].password },
    headers: { origin: 'http://localhost:3000' },
    failOnStatusCode: false
  });
  const clientProbe = await request.post('/api/auth/login', {
    data: { email: ACCOUNTS[2].email, password: ACCOUNTS[2].password },
    headers: { origin: 'http://localhost:3000' },
    failOnStatusCode: false
  });
  test.skip(adminProbe.status() !== 200 || clientProbe.status() !== 200, 'role accounts not seeded (npm run seed:demo)');

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login(?:$|\?)/);
  await page.goto('/client/profile');
  await expect(page).toHaveURL(/\/login(?:$|\?)/);

  await signIn(page, ACCOUNTS[0]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/admin(?:$|\?)/);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/users(?:$|\?)/);
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/admin\/settings(?:$|\?)/);
  await page.goto('/client');
  await expect(page).toHaveURL(/\/admin(?:$|\?)/);

  await page.locator('.dashboard-logout-btn').click();
  await page.waitForURL('**/login');
  await signIn(page, ACCOUNTS[2]);
  await page.goto('/client/profile');
  await expect(page).toHaveURL(/\/client\/profile(?:$|\?)/);
  await expect(page.getByRole('heading', { name: 'Profile information' })).toBeVisible();
  await page.goto('/client/settings');
  await expect(page).toHaveURL(/\/client\/settings(?:$|\?)/);
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/client(?:$|\?)/);
});

test('switches admin and two separate client accounts without clearing browser storage', async ({ page, request }) => {
  test.skip(!ACCOUNT_SWITCHING[2].email || !ACCOUNT_SWITCHING[2].password, 'Set E2E_CLIENT_B_EMAIL and E2E_CLIENT_B_PASSWORD to enable two-client isolation coverage.');
  const probes = await Promise.all(ACCOUNT_SWITCHING.map((account) => request.post('/api/auth/login', {
    data: { email: account.email, password: account.password },
    headers: { origin: 'http://localhost:3000' },
    failOnStatusCode: false
  })));
  test.skip(probes.some((response) => response.status() !== 200), 'Account-switching test accounts are not available.');

  await signIn(page, ACCOUNT_SWITCHING[0]);
  expect(new URL(page.url()).pathname).toBe('/admin');
  const adminId = await page.evaluate(async () => (await (await fetch('/api/auth/session', { cache: 'no-store' })).json()).user.id);
  await page.goto('/client');
  await expect(page).toHaveURL(/\/admin(?:\/|$)/);

  await page.locator('.dashboard-logout-btn').click();
  await page.waitForURL('**/login');

  await signIn(page, ACCOUNT_SWITCHING[1]);
  expect(new URL(page.url()).pathname).toBe('/client');
  const clientA = await page.evaluate(async () => (await (await fetch('/api/auth/session', { cache: 'no-store' })).json()).user);
  await page.getByRole('button', { name: 'New order' }).click();
  const marker = `isolation-${Date.now()}`;
  await page.getByLabel('Order title').fill(marker);
  await page.getByLabel('What do you need?').fill(`Client A private request ${marker}`);
  await page.getByLabel('Needed by').fill('2026-12-31');
  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.getByText(marker)).toBeVisible();

  await page.locator('.topbarActions button.logoutButton').click();
  await page.waitForURL('**/login');
  await signIn(page, ACCOUNT_SWITCHING[2]);
  expect(new URL(page.url()).pathname).toBe('/client');
  const clientB = await page.evaluate(async () => (await (await fetch('/api/auth/session', { cache: 'no-store' })).json()).user);
  expect(clientB.id).not.toBe(clientA.id);
  await page.getByRole('button', { name: 'My orders' }).click();
  await expect(page.getByText(marker)).toHaveCount(0);

  await page.locator('.topbarActions button.logoutButton').click();
  await page.waitForURL('**/login');
  await signIn(page, ACCOUNT_SWITCHING[0]);
  expect(new URL(page.url()).pathname).toBe('/admin');
  const restoredAdminId = await page.evaluate(async () => (await (await fetch('/api/auth/session', { cache: 'no-store' })).json()).user.id);
  expect(restoredAdminId).toBe(adminId);
});
