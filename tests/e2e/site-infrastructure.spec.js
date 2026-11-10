const { test, expect } = require('@playwright/test');

const SITE_ORIGIN = 'https://www.tgnesolutions.com';

test('sitemap covers static pages, articles and case studies', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();

  expect(body).toContain(`${SITE_ORIGIN}/`);
  expect(body).toContain(`${SITE_ORIGIN}/services`);
  expect(body).toContain(`${SITE_ORIGIN}/accessibility`);
  expect(body).toContain(`${SITE_ORIGIN}/blog/`);
  expect(body).toContain(`${SITE_ORIGIN}/case-studies/`);
});

test('robots points to the sitemap and keeps private areas out of search', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();

  expect(body).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  expect(body).toContain('Disallow: /api/');
  expect(body).toContain('Disallow: /office');
});

test('web manifest is TGNE-specific and has installable icons', async ({ request }) => {
  const response = await request.get('/manifest.json');
  expect(response.status()).toBe(200);
  const manifest = await response.json();

  expect(manifest.name).toContain('TGNE Solutions');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.theme_color).toBe('#0b2527');
  expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true);
  expect(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(true);
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
});

test('icon and security files are reachable', async ({ request }) => {
  for (const path of [
    '/icons/icon-32.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png',
    '/.well-known/security.txt'
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }

  const security = await request.get('/.well-known/security.txt');
  expect(await security.text()).toContain('Contact: mailto:info@tgnesolutions.com');
});

test('security headers are applied to public pages', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['cross-origin-resource-policy']).toBe('same-origin');
  expect(headers['x-permitted-cross-domain-policies']).toBe('none');
});

test('public pages expose canonical URLs on the official domain', async ({ page }) => {
  for (const path of ['/', '/services', '/contact', '/blog', '/accessibility']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical, `canonical on ${path}`).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href, `canonical URL on ${path}`).toMatch(new RegExp(`^${SITE_ORIGIN}`));
  }
});
