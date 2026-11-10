# Content editing guide

## Public pages

- Marketing pages live in `app/(site)/`.
- Shared content arrays live in `lib/tgne-services.js`, `lib/tgne-shop.js`,
  `lib/tgne-gallery.js`, `lib/tgne-blog.js` and `lib/tgne-case-studies.js`.
- Use British/Ghanaian English and sentence case for headings.
- Keep the official contact email as `info@tgnesolutions.com` and the canonical
  site as `https://www.tgnesolutions.com`.

## Services

Each service needs a stable `id`, a title, a short description and an icon name.
The service card anchor uses the `id`; the footer and homepage link to it.

## Blog posts

Add a post to `POSTS` in `lib/tgne-blog.js` with a unique slug, ISO date,
category, cover, author, dek and body blocks. The sitemap and reading time are
generated automatically. Update the canonical test if the post introduces a new
public route pattern.

## Case studies

Add a case study to `TGNE_CASE_STUDIES` with a unique slug, client, sector,
group, location, year, summary, cover and body sections. Keep client names
accurate and obtain permission before publishing sensitive details.

## Legal and accessibility

Update the "Last updated" date when the terms, privacy note or accessibility
statement changes. The privacy section must keep the `id="privacy"` anchor
because every form links to it.
