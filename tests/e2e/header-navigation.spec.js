import { test, expect } from '@playwright/test';

test('mobile header shows the menu toggle and opens the drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const toggle = page.locator('.ls-mobile-menu > summary');
  await expect(toggle).toBeVisible();

  await toggle.click();
  await expect(page.locator('#land-mobile-nav')).toBeVisible();
  await expect(page.locator('#land-mobile-nav a[href="/login"]')).toBeVisible();
  await page.locator('.ls-mobile-submenu-summary').first().click();
  await expect(page.locator('#land-mobile-nav a[href="/about"]')).toBeVisible();
});

test('desktop header shows the client login link when signed out', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ls-header-actions a[href="/login"]').first()).toBeVisible();
  await expect(page.locator('.ls-user-chip')).toHaveCount(0);
});
