const { test, expect } = require('@playwright/test');

test('contact form renders its core fields', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'networkidle' });

  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Phone')).toBeVisible();
  await expect(page.getByLabel('Message')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
});

test('contact form responds to an empty submit with feedback', async ({ page }) => {
  await page.route('**/api/land/inquiries', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Please fill in the required fields.' })
    });
  });

  await page.goto('/contact', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Send message' }).click();

  const feedback = page.locator('[role="alert"], .ls-form-success, .ls-field-error');
  await expect(feedback.first()).toBeVisible({ timeout: 20_000 });
});

test('service request dialog opens and closes', async ({ page }) => {
  await page.goto('/services', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: /Request this service/i }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Service request');
  await expect(dialog.getByLabel('Full name')).toBeVisible();

  await page.getByRole('button', { name: 'Close service request' }).click();
  await expect(dialog).toBeHidden();
});

test('shop search and category filters are usable', async ({ page }) => {
  await page.goto('/shop', { waitUntil: 'networkidle' });

  await page.getByLabel('Search shop offerings').fill('website');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page).toHaveURL(/q=website/);
  await expect(page.locator('.tgne-store-results')).toContainText(/offering/i);
});
