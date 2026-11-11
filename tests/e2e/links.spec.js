const { test, expect } = require('@playwright/test');

const PAGES = ['/', '/about', '/services', '/shop', '/gallery', '/case-studies', '/blog', '/contact', '/faq', '/how-it-works', '/legal', '/accessibility'];
const SKIP = [/^\/admin/, /^\/client/, /^\/office/, /^\/dashboard/, /^\/api\//, /^\/login/];

test('public pages only link to reachable internal pages', async ({ page, request }) => {
  test.setTimeout(120_000);
  const links = new Set();

  for (const path of PAGES) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean)
    );
    for (const href of hrefs) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const clean = href.split('#')[0];
      if (!clean || clean === path || SKIP.some((pattern) => pattern.test(clean))) continue;
      links.add(clean);
    }
  }

  const failures = [];
  for (const href of links) {
    const response = await request.get(href, { maxRedirects: 5 });
    if (response.status() >= 400) failures.push(`${href} -> ${response.status()}`);
  }

  expect(failures, `Broken internal links:\n${failures.join('\n')}`).toEqual([]);
});
