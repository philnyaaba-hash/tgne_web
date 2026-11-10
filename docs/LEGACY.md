# Legacy route and content notes

## Redirects

`next.config.mjs` keeps these compatibility redirects:

| Source | Destination |
| --- | --- |
| `/land`, `/land/:path*` | `/` or the matching public page |
| `/listings`, `/listings/:path*` | `/services` |
| `/track` | `/contact` |
| `/orders/:path*` | `/contact` |
| `/reserve/:path*` | `/contact` |

Do not remove a redirect until the old URL has been out of use for a full
campaign cycle and no external link still points at it.

## LandLedger references

The public marketing site should not mention LandLedger, land listings, orders
or reservations. The office workspace still contains land-panel code and the
legacy public scripts under `public/legacy`; those are intentionally isolated
from the marketing pages and are not part of the public navigation.

## Removing legacy files safely

1. Search for the filename or route in `app`, `components`, `lib`, `public/sw.js`
   and `tests`.
2. Update the service worker cache list and smoke checks at the same time.
3. Run `npm test`, `npm run test:e2e` and `npm run build`.
4. Remove the file only after the new route has been verified in production.

## Service worker

`public/sw.js` caches a small shell. Bump its cache version whenever the public
shell changes, and never precache authenticated office/client pages.
