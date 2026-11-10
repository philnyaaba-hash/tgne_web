# Enquiry form runbook

## Architecture

All public enquiries use one flow:

1. `components/land/inquiry-form.jsx` validates the fields in the browser.
2. The form posts JSON to `POST /api/land/inquiries`.
3. The route checks the request origin, applies the IP rate limit, validates the
   payload again on the server, and stores the enquiry with Prisma.
4. The browser shows a success state or a retry message.

The service dialog on `/services` embeds the same form. There is no separate
Formspree submission path.

## Payload

```json
{
  "name": "Ama Mensah",
  "email": "ama@example.com",
  "phone": "+233 55 000 0000",
  "type": "GENERAL",
  "message": "Service of interest: Web & app development\n\nWe need a new site.",
  "listingSlug": ""
}
```

`name` is limited to 120 characters, `email` to 200, `phone` to 40 and
`message` to 2,000. The honeypot field is named `website` and must stay empty.

## Response behaviour

- `201` — stored successfully; show the success state.
- `400` — validation failed; show the field errors and move focus to the first
  invalid field.
- `403` — origin check failed; show the generic retry message.
- `429` — rate limited; ask the visitor to try again shortly.
- `503` — storage unavailable; show the phone and email fallback.

The browser aborts a request after 15 seconds and shows a retry message.

## Local testing

```bash
npm run dev
npm run test:e2e -- tests/e2e/forms.spec.js
```

The form needs a reachable database for a real submission. Playwright routes
can stub the API when testing the UI states.

## Delivery checks

- Confirm the enquiry appears in the office workspace.
- Confirm the public email is `info@tgnesolutions.com`.
- Confirm the privacy link points to `/legal#privacy`.
- Confirm a failed API call shows the fallback phone and email links.

## If enquiries stop arriving

1. Check the hosting logs for `/api/land/inquiries`.
2. Run `npm run check:env` and confirm `DATABASE_URL` is present.
3. Check the database connection and the `LandInquiry` table.
4. Check the rate limiter for a single IP hitting the six-per-ten-minutes limit.
5. If Resend is configured, check the sender verification and delivery logs.
6. Post a temporary notice with the phone and email while the issue is fixed.
