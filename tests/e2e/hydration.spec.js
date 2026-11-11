import { test, expect } from '@playwright/test';

const PAGES = ['/', '/blog', '/services', '/about', '/contact', '/login'];

for (const path of PAGES) {
  test(`no hydration or console errors on ${path}`, async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hydrationErrors = errors.filter((text) =>
      /hydrat|did not match|Text content does not match|server rendered HTML/i.test(text)
    );
    expect(hydrationErrors, 'hydration errors: ' + hydrationErrors.join('\n')).toEqual([]);
  });
}
