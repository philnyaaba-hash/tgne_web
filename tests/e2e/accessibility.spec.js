const fs = require('node:fs');
const nodePath = require('node:path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = ['/', '/services', '/contact', '/shop', '/gallery', '/blog', '/faq', '/case-studies', '/accessibility'];
const STRICT = process.env.A11Y_STRICT === '1';

for (const path of PAGES) {
  test(`accessibility: ${path}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact)
    );

    const summary = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' '))
    }));

    const reportDir = nodePath.join(process.cwd(), 'test-results');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportName = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
    const projectName = testInfo.project.name.replace(/[^a-z0-9]+/gi, '-');
    fs.writeFileSync(
      nodePath.join(reportDir, `a11y-${reportName}-${projectName}.json`),
      JSON.stringify({ url: path, project: testInfo.project.name, violations: results.violations }, null, 2)
    );

    if (summary.length) {
      const details = summary
        .map((violation) => `${violation.id} (${violation.impact}, ${violation.nodes} nodes)`)
        .join('; ');
      console.log(`${path} accessibility findings: ${details}`);
    }

    if (STRICT) {
      expect(summary, `Serious/critical accessibility violations on ${path}`).toEqual([]);
    }
  });
}
