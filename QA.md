# Quality checks

## One-time setup

```powershell
npm install
npx playwright install chromium
```

## Environment

Copy `.env.example` to `.env` and fill in the required values, then verify:

```powershell
npm run check:env
```

`check:env` prints missing required variables and warns about recommended ones.
It never prints secret values.

The demo seeder requires explicit opt-in, unique test-only passwords, and a
non-production target. Remote test databases require a second explicit opt-in.
Never use demo accounts or the demo seeder with production data.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Node unit tests in `tests/*.test.js` |
| `npm run test:e2e` | Playwright suite, desktop and Pixel 5 |
| `npm run test:e2e:ui` | Playwright interactive UI |
| `npm run test:public` | Public-page smoke tests only |
| `npm run test:a11y` | axe report; writes JSON to `test-results/` |
| `npm run test:a11y:strict` | Fails on serious/critical axe findings |
| `npm run audit:lighthouse` | Lighthouse report for a running site |
| `npm run check:env` | Validate required environment variables |
| `npm run check:secrets` | Reject tracked local environment files and hardcoded demo passwords |
| `npm run smoke` | Existing custom smoke script |

## Playwright

- Starts Next dev automatically on `http://127.0.0.1:3100`.
- Set `PLAYWRIGHT_BASE_URL` to test an already-running site; the web server is
  then skipped.
- Set `PLAYWRIGHT_PORT` to change the local port.
- Projects: `chromium` (desktop Chrome) and `mobile-chrome` (Pixel 5).
- Artifacts: `playwright-report/` (HTML) and `test-results/` (traces,
  screenshots, axe JSON). Both are gitignored.
- Examples:
  - `npx playwright test --project=chromium`
  - `npx playwright test --grep "contact form"`
  - `$env:PLAYWRIGHT_BASE_URL = "https://example.com"; npx playwright test`

## Accessibility

`npm run test:a11y` writes one report per page and project:

```text
test-results/a11y-home-chromium.json
test-results/a11y-home-mobile-chrome.json
```

Current baseline (November 2026): serious `color-contrast` findings across the
public pages and `label-content-name-mismatch` findings on the brand link,
gallery cards and the home review card. Start with:

- brand link accessible names (visible text must be part of the name),
- muted body/footer text colors,
- gallery card button names,
- review card names.

Run `npm run test:a11y:strict` after fixing to keep the gate green.

## Lighthouse

Start the site in one terminal, then run the audit in another:

```powershell
# terminal 1
npm run dev

# terminal 2
npm run audit:lighthouse
```

- Override the target with `LIGHTHOUSE_URL`:
  `$env:LIGHTHOUSE_URL = "http://127.0.0.1:3100"; npm run audit:lighthouse`
- Override the output with `LIGHTHOUSE_OUTPUT`; a `.json` path produces JSON:
  `$env:LIGHTHOUSE_OUTPUT = "lighthouse-report.json"; npm run audit:lighthouse`
- Dev-mode baseline (November 2026): performance 64, accessibility 96,
  best-practices 100, SEO 92. Dev mode is unminified and noisy — audit a
  production build (`npm run build` then `npm start`) for meaningful
  performance numbers.
- Reports are gitignored.

## Dependency advisories

`npm audit` currently reports five advisories:

- `deepmerge-ts` via Prisma,
- `postcss` via Next.

`npm audit fix --force` would upgrade to Prisma 7 and Next 16, both breaking
changes. Plan those upgrades separately rather than forcing them.
