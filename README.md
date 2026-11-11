# TGNE Solutions website

Next.js 15 application for the TGNE Solutions public website, client area and
office workspace. The public site lives in `app/(site)` and shares the database,
authentication and API layer under `app/api`.

## Requirements

- Node.js 20.9 or newer (`.nvmrc` pins Node 24 for local work)
- npm 10 or newer
- PostgreSQL for the client/office areas
- A Resend key if transactional email is enabled

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

The public site runs at `http://localhost:3000`. Database-backed pages need a
valid `DATABASE_URL`; the marketing pages can be reviewed without one. Never
commit `.env` or paste secrets into the repository.

Run `npm run check:env` to see which environment variables are present without
printing their values.

The demo role accounts are test fixtures only. Configure unique passwords of
at least 12 characters with the `TEST_<ROLE>_PASSWORD` variables in `.env`.
`npm run seed:demo` is blocked in production and requires `ALLOW_DEMO_SEED=1`;
remote test databases also require `ALLOW_REMOTE_DEMO_SEED=1`. Never use the
demo seeder against production data.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js server. |
| `npm run build` | Generate Prisma client and create a production build. |
| `npm test` | Run the Node unit tests. |
| `npm run check:secrets` | Reject tracked local environment files and hardcoded demo passwords. |
| `npm run test:e2e` | Run all Playwright checks. |
| `npm run test:public` | Public-page rendering and metadata checks. |
| `npm run test:a11y` | Axe accessibility scans (report-only unless `A11Y_STRICT=1`). |
| `npm run test:a11y:strict` | Accessibility scans that fail on critical/serious issues. |
| `npm run check:links` | Crawl public pages and fail on broken internal links. |
| `npm run check:assets` | Enforce the 1 MB per-file and 8 MB total asset budgets. |
| `npm run check` | Unit tests plus the asset budget. |
| `npm run verify` | Full local gate: tests, assets, Playwright and production build. |
| `npm run icons` | Regenerate PWA and Apple icons from the TGNE logo. |
| `npm run assets:optimize` | Recompress the large land PNGs in place. |
| `npm run audit:lighthouse` | Capture a Lighthouse report. |
| `npm run smoke` | Run the deployment smoke checks. |

## Project map

- `app/(site)/` — public marketing pages, blog, case studies and gallery.
- `app/(site)/layout.js` — public header, footer, organization JSON-LD and metadata.
- `app/office/` — staff workspace and office panels.
- `app/client/` — client area.
- `app/api/` — route handlers, including `/api/land/inquiries`.
- `components/land/` — shared public-site components and the enquiry form.
- `lib/tgne-*.js` — typed-by-convention content data for services, shop, blog,
  case studies and gallery.
- `lib/site-metadata.js` — canonical URL and page metadata helpers.
- `public/assets/` — images; `public/icons/` — generated site icons.
- `tests/` — Node unit tests; `tests/e2e/` — Playwright checks.
- `docs/` — deployment, forms, accessibility and legacy notes.

## Content and metadata

Public page metadata is created with `createPageMetadata()` from
`lib/site-metadata.js`. The canonical origin must be
`https://www.tgnesolutions.com`; set `NEXT_PUBLIC_SITE_URL` in production and
leave the fallback in place for local work.

The web manifest, sitemap and robots route are generated from the same origin.
When adding a public page, add it to `app/sitemap.js` and, if it belongs in the
main navigation, update `components/land/site-header.jsx`.

## Quality gates

Before deploying a public-site change:

```bash
npm test
npm run check:assets
npm run test:e2e
npm run test:a11y:strict
npm run build
```

Accessibility, dependency and environment findings are tracked in `QA.md`.
The 100-item improvement plan and its status live in `PLAN.md`.

## Deployment

See `docs/DEPLOYMENT.md`. Do not deploy with a blank public email, a missing
database URL, or a canonical URL that does not match the live domain.
