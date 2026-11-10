---
name: tgne-website
description: Use for work on the TGNE Solutions website and portals in this repository — brand rules, route map, commands, and definition of done.
---

# TGNE Solutions website

This repository contains the TGNE Solutions marketing site plus the office and
client portals. The marketing site lives in `app/(site)` and is the primary
surface for public improvements.

## Brand

- Clear, capable, trustworthy. Direct and calm; no decorative effects that
  compete with the work information.
- Technology, design, print, hosting and ICT education for organisations in
  Tema and across Ghana.
- Use British/Ghanaian English (organisation, colour, programme).
- Existing palette and type live in `app/(site)/land.css`,
  `app/(site)/tgne-premium.css`, and `app/(site)/editorial.css`.

## Stack

- Next.js App Router (Next 15), React 19, plain CSS files.
- Prisma 6 with PostgreSQL/Neon for portals and enquiries.
- Resend for transactional email; public enquiry forms post to `/api/land/inquiries`.
- Tests: Node's built-in runner (`npm test`) plus Playwright in `tests/e2e`.

## Key paths

- Marketing pages: `app/(site)/**/page.js`
- Site shell: `components/land/site-header.jsx`, `site-footer.jsx`
- Site data/config: `lib/land-site.js`, `lib/site-metadata.js`
- Content: `lib/tgne-blog.js`, `lib/tgne-case-studies.js`,
  `lib/tgne-gallery.js`, `lib/tgne-shop.js`, `lib/tgne-services.js`
- Shared components: `components/tgne/*`, `components/land/*`
- Portals: `app/office`, `app/client`, `app/dashboard` — do not redesign these
  while working on the marketing site.

## Commands

- `npm run dev` — local site on http://127.0.0.1:3000
- `npm test` — Node unit tests in `tests/*.test.js`
- `npm run test:e2e` — Playwright public-site tests
- `npm run test:a11y` — axe accessibility report (set `A11Y_STRICT=1` to gate;
  per-page JSON lands in `test-results/a11y-*.json`)
- `npm run test:a11y:strict` — fail on serious/critical axe findings
- `npm run audit:lighthouse` — Lighthouse report (dev server must be running;
  override the target with `LIGHTHOUSE_URL`, e.g. `http://127.0.0.1:3001`).
  Audit a production build (`npm run build` + `npm start`) for meaningful
  performance numbers; dev mode is unminified.
- `npm run check:env` — verify required environment variables
- `npm run build` — Prisma generate + production build

## Definition of done

- `npm test` passes.
- `npm run test:e2e` passes on desktop and mobile projects.
- No new serious/critical axe findings (run `npm run test:a11y:strict`).
- Metadata, canonical URL and social preview are correct for new pages.
- Images use `next/image` with appropriate `sizes`; no multi-megabyte assets.
- Forms have labels, error text, focus handling and a success state.
- Changes are consistent with existing CSS and component patterns.

## Guardrails

- Never commit `.env`, API keys, passwords or tokens.
- Do not delete or rewrite unrelated user changes in the working tree.
- Prefer small, reviewable edits; keep legacy land routes and portals untouched
  unless the task explicitly targets them.
- Known P0 issues to keep in mind: stale LandLedger manifest remains in legacy areas,
  empty `NEXT_PUBLIC_TGNE_EMAIL`, duplicate enquiry pipelines, and legacy
  land routes still present in the build.
