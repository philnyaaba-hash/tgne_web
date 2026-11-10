# Accessibility maintenance guide

## Standard

The public site targets WCAG 2.2 AA. The accessibility statement is at
`/accessibility` and is linked from the footer.

## Checks

```bash
npm run test:a11y
npm run test:a11y:strict
```

The report-only scan writes JSON reports to `test-results/`. The strict scan
fails on critical or serious violations and is the release gate.

## Rules for new work

- Every page has one visible `h1`.
- Use a visible `<label>` for every form field; do not rely on placeholders.
- Give icon-only controls a meaningful accessible name and a visible focus state.
- Do not put a custom `aria-label` on a link if it would replace the visible
  text. The accessible name must include the visible label.
- Keep body text at 4.5:1 contrast or better; large text and UI boundaries at
  3:1 or better.
- Do not animate content from `opacity: 0` in a way that leaves it unreadable
  before it enters the viewport.
- Respect `prefers-reduced-motion` for carousels, marquees and reveal effects.
- After submitting a form, move focus to the success message or the first error.
- Test with keyboard navigation and at 200% zoom.

## Known limitations

- The Google Map iframe is third-party content; a direct Google Maps link is
  provided as an alternative.
- The strict gate is only meaningful when the development server and database
  are available.

## Reporting a barrier

Email `info@tgnesolutions.com` or call the public number listed on `/contact`.
Include the page URL, the assistive technology you used, and what happened.
