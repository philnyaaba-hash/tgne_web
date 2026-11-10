# TGNE Solutions — 100 improvement plan

Status: 91 done ? 2 partial ? 7 planned.

This plan turns the public-site audit into small, verifiable changes. Work is
shipped in priority waves so the site remains usable between batches.

## A. Trust and conversion (1–10)

- [x] 1. Replace the separate Formspree service dialog with the shared DB-backed inquiry form. **(P0)**
- [x] 2. Remove the hard-coded Formspree form ID and dependency. **(P0)**
- [x] 3. Set the public contact email default to info@tgnesolutions.com. **(P0)**
- [x] 4. Add visible email links on contact, footer and legal pages. **(P0)**
- [x] 5. Add privacy/consent microcopy and a legal-page link under every form. **(P0)**
- [x] 6. Add a response-time promise and office-hours note beside forms. **(P1)**
- [x] 7. Add a no-JS/API-failure fallback with phone, email and WhatsApp links. **(P1)**
- [x] 8. Prefill service context when a visitor opens a service enquiry. **(P1)**
- [x] 9. Add success-state focus management and live-region announcements. **(P0)**
- [x] 10. Add duplicate-submit protection and a timeout/error state. **(P1)**

## B. SEO and discovery (11–20)

- [x] 11. Correct the canonical site URL to https://www.tgnesolutions.com. **(P0)**
- [x] 12. Replace the stale LandLedger web manifest with a TGNE manifest. **(P0)**
- [x] 13. Generate 192px, 512px, maskable and Apple touch icons. **(P0)**
- [x] 14. Add a dynamic sitemap covering public pages, posts and case studies. **(P0)**
- [x] 15. Update robots.txt to point at the sitemap and exclude private routes. **(P0)**
- [x] 16. Add Organization/LocalBusiness JSON-LD with contact and address data. **(P0)**
- [~] 17. Add breadcrumb JSON-LD to inner pages. **(P1)**
- [x] 18. Add FAQPage JSON-LD to the FAQ page. **(P1)**
- [~] 19. Add per-page canonical/Open Graph tests. **(P0)**
- [ ] 20. Add a dynamic Open Graph image route for blog and case studies. **(P1)**

## C. Performance and assets (21–30)

- [x] 21. Remove the legacy `auth-locked` body class from the public root layout. **(P1)**
- [x] 22. Compress the seven large land PNGs without changing their URLs. **(P1)**
- [ ] 23. Compress the catalogue background image. **(P2)**
- [x] 24. Bump and simplify the service worker cache; stop precaching legacy scripts. **(P1)**
- [ ] 25. Remove unused legacy public scripts from the deployment. **(P2)**
- [x] 26. Slow the hero carousel and pause it on hover, focus and reduced motion. **(P1)**
- [x] 27. Add reduced-motion CSS for the carousel and offer marquee. **(P1)**
- [x] 28. Audit all `next/image` usage for missing `sizes`/priority. **(P1)**
- [x] 29. Add an image-budget check script. **(P1)**
- [x] 30. Remove or redirect unreachable legacy listing/order/reserve routes. **(P1)**

## D. Accessibility (31–40)

- [x] 31. Fix the brand-link accessible name. **(P0)**
- [x] 32. Fix gallery card accessible names. **(P0)**
- [x] 33. Fix review-card accessible names. **(P0)**
- [~] 34. Fix muted-text color contrast across the public site. **(P0)**
- [x] 35. Add `aria-current` to the active desktop/mobile nav item. **(P1)**
- [x] 36. Add visible focus styles for all interactive elements. **(P1)**
- [x] 37. Make the skip link focus the main content. **(P1)**
- [x] 38. Add `aria-describedby` and focus handling to form errors. **(P0)**
- [~] 39. Add a reduced-motion and high-contrast motion fallback. **(P1)**
- [x] 40. Add an accessibility statement page and footer link. **(P1)**

## E. Content and information architecture (41–50)

- [x] 41. Remove the duplicate “Products & services” block on the homepage. **(P1)**
- [x] 42. Fix footer service links to point at real service anchors. **(P0)**
- [x] 43. Add legal/privacy links to the footer. **(P0)**
- [x] 44. Add stable anchor IDs to every service card. **(P0)**
- [~] 45. Add breadcrumb navigation to inner pages. **(P1)**
- [ ] 46. Add related posts and case studies to editorial pages. **(P2)**
- [x] 47. Add last-updated dates to legal/policy content. **(P1)**
- [x] 48. Add a clear “Start a project” CTA to service pages. **(P1)**
- [~] 49. Remove or rewrite legacy LandLedger copy still visible on public pages. **(P0)**
- [x] 50. Add a public accessibility/help page to the sitemap and footer. **(P1)**

## F. Security and privacy (51–60)

- [x] 51. Add `Cross-Origin-Resource-Policy` and `X-Permitted-Cross-Domain-Policies`. **(P1)**
- [x] 52. Tighten CSP after removing Formspree; keep only required origins. **(P0)**
- [x] 53. Add `/.well-known/security.txt`. **(P1)**
- [x] 54. Add server-side max lengths and tests for inquiry fields. **(P0)**
- [~] 55. Add tests for rate limiting, honeypot and same-origin checks. **(P1)**
- [x] 56. Add privacy notice near data collection points. **(P0)**
- [~] 57. Add noindex to private and legacy routes. **(P1)**
- [ ] 58. Remove legacy redirects that point to the wrong destination. **(P1)**
- [x] 59. Add a documented secret/env rotation checklist. **(P2)**
- [~] 60. Add a security-headers regression test. **(P1)**

## G. Forms and API reliability (61–70)

- [x] 61. Add client-side validation to the shared inquiry form. **(P1)**
- [x] 62. Add field-level errors and `aria-invalid`. **(P1)**
- [x] 63. Add a form submission timeout and retry message. **(P1)**
- [ ] 64. Add an API health/readiness check for forms. **(P2)**
- [~] 65. Add a test that the service dialog uses the shared API. **(P0)**
- [ ] 66. Add a test for the success state. **(P1)**
- [ ] 67. Add a test for API failure copy. **(P1)**
- [ ] 68. Add a test for duplicate-submit protection. **(P2)**
- [ ] 69. Add a test for the privacy link near forms. **(P2)**
- [x] 70. Document the form architecture and fallback behaviour. **(P1)**

## H. QA and CI (71–80)

- [x] 71. Add sitemap/robots/manifest tests. **(P0)**
- [x] 72. Add an internal link checker. **(P1)**
- [x] 73. Add an asset-size budget check. **(P1)**
- [x] 74. Add a CSP/header E2E test. **(P1)**
- [x] 75. Add a manifest/icon E2E test. **(P1)**
- [x] 76. Add an `npm run check` aggregate command. **(P1)**
- [x] 77. Add an `npm run verify` full-pass command. **(P1)**
- [ ] 78. Add Lighthouse CI thresholds. **(P2)**
- [~] 79. Add a strict accessibility gate once violations are zero. **(P1)**
- [x] 80. Add test artifacts and reports to CI. **(P1)**

## I. Design and mobile polish (81–90)

- [x] 81. Add `scroll-margin-top` for anchor links. **(P1)**
- [ ] 82. Prevent the WhatsApp float from covering mobile CTAs. **(P2)**
- [ ] 83. Add print styles for legal and service pages. **(P2)**
- [x] 84. Normalise focus/hover styles across buttons and links. **(P1)**
- [~] 85. Add a visible breadcrumb treatment. **(P1)**
- [x] 86. Improve footer hierarchy and grouping. **(P1)**
- [~] 87. Add loading states to the carousel and form. **(P2)**
- [x] 88. Add empty states for shop/gallery filters. **(P2)**
- [~] 89. Add responsive type and spacing checks. **(P2)**
- [x] 90. Add a “back to top” affordance on long pages. **(P2)**

## J. Documentation and operations (91–100)

- [x] 91. Fill the README with setup, scripts and architecture. **(P1)**
- [x] 92. Add a deployment and environment checklist. **(P1)**
- [x] 93. Add a content editing guide. **(P2)**
- [x] 94. Add a forms/delivery runbook. **(P1)**
- [x] 95. Add an accessibility maintenance guide. **(P2)**
- [x] 96. Add an asset/image guide. **(P2)**
- [x] 97. Add a legacy-removal guide. **(P2)**
- [x] 98. Add a security policy. **(P2)**
- [x] 99. Add `.nvmrc` and `engines` for Node. **(P1)**
- [x] 100. Add a CHANGELOG/PLAN status file. **(P1)**

## Working rules

- Keep the marketing site in `app/(site)` and preserve current uncommitted work.
- Every copy change uses British/Ghanaian English.
- Run `npm test`, `npm run test:public`, and `npm run test:a11y:strict` before closing a wave.
- Do not commit `.env`, credentials, or generated test artifacts.
