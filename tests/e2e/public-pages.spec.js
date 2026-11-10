const { test, expect } = require('@playwright/test');

const PAGES = [
  ['/', /Make your next move/i],
  ['/about', /Dream it/i],
  ['/services', /Good work happens/i],
  ['/shop', /Find the right solution/i],
  ['/gallery', /Ideas made/i],
  ['/case-studies', /Work you can/i],
  ['/blog', /Notes from/i],
  ['/contact', /shape the right solution/i],
  ['/faq', /Frequently asked questions/i],
  ['/how-it-works', /From business need/i],
  ['/legal', /Terms and privacy/i],
  ['/accessibility', /Accessibility at TGNE Solutions/i]
];

for (const [path, heading] of PAGES) {
  test(`${path} renders with a single visible h1`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

    expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page).toHaveTitle(/.+/);
  });
}

test('home page has canonical, Open Graph and Twitter metadata', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /.+/);
});

test('pages do not overflow horizontally', async ({ page }) => {
  for (const [path] of PAGES) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test('header and footer navigation expose the main routes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop navigation is hidden on mobile');

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(mainNav.getByRole('link', { name: 'Services', exact: true })).toHaveCount(0);
  await expect(mainNav.getByRole('link', { name: 'Our Services', exact: true })).toBeVisible();

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Services', exact: true }).first()).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Contact', exact: true }).first()).toBeVisible();
});

test('mobile menu opens and closes on navigation', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile navigation is only shown on mobile');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const toggle = page.getByLabel('Open or close navigation menu');
  await expect(toggle).toBeVisible();
  await toggle.click();

  const mobileNav = page.locator('#land-mobile-nav');
  await expect(mobileNav).toBeVisible();
  const contactLink = mobileNav.getByRole('link', { name: 'Contact Us', exact: true }).first();
  await expect(contactLink).toBeVisible();

  await contactLink.click();
  await expect(page).toHaveURL(/\/contact$/);
});
