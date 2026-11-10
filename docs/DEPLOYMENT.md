# Deployment and environment checklist

## Prerequisites

- Node.js 20.9+ and npm 10+.
- A PostgreSQL database (Neon in production is supported).
- A monitored inbox for `info@tgnesolutions.com`.
- Resend credentials if transactional email is enabled.
- Access to the hosting project and DNS for `tgnesolutions.com`.

## Environment variables

Set these in the hosting provider, not in Git:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://www.tgnesolutions.com` in production. |
| `NEXT_PUBLIC_TGNE_EMAIL` | Yes | `info@tgnesolutions.com`; confirm the inbox is monitored. |
| `NEXT_PUBLIC_TGNE_PHONE` | Yes | Public sales/WhatsApp number. |
| `NEXT_PUBLIC_TGNE_PHONE_ALT` | No | Alternate public number. |
| `NEXT_PUBLIC_TGNE_OFFICE_PHONE` | Yes | Office line. |
| `NEXT_PUBLIC_TGNE_ADDRESS` | Yes | Public office address. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` | Yes | At least 32 random bytes. |
| `APP_URL` | Yes | Public base URL used in email links. |
| `RESEND_API_KEY` | If email | Keep server-side only. |
| `EMAIL_FROM` | If email | Must be a verified sender. |

Run `npm run check:env` locally to check presence without revealing values.

## Deploy

1. Confirm the working tree is clean and the quality gates pass.
2. Set the production environment variables.
3. Run `npm run build` locally or let the host run it.
4. Deploy the build.
5. Run `npm run smoke` against the deployed URL.
6. Check `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/icons/icon-192.png`
   and `/.well-known/security.txt`.
7. Submit the sitemap in Google Search Console after the domain is verified.

## Post-deploy checks

- The canonical tag points at `https://www.tgnesolutions.com`.
- The contact form shows the official email and privacy note.
- A test enquiry is stored and, if Resend is configured, delivered.
- The site responds over HTTPS and sends the security headers.
- The office and client areas still require authentication.
- No legacy `LandLedger` branding appears on public pages.

## Rollback

Redeploy the previous successful build. Database migrations should be applied
with a backward-compatible step first; never run a destructive migration during
a rollback window. Rotate any secret that may have been exposed.

## Secrets rotation

Rotate `AUTH_SECRET`, `DATABASE_URL`, `RESEND_API_KEY` and any SMTP credentials
after a suspected leak. Update the host environment, redeploy, and invalidate
existing sessions where the auth implementation allows it. Record the rotation
date in the operations log — never in this repository.
