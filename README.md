# LandLedger (Next.js)

```sh
npm install
npm run dev        
npm run build && npm start
npm test          
npm run relay      
```

## How this migration is structured

The app shell is a Next.js App Router project (`app/`, `components/`). The existing
feature code (`public/legacy/*.js`) is loaded in order by `components/LegacyApp.jsx`
and still renders the views, so behaviour and data (`localStorage`) are unchanged.
Migrate one view at a time into React components and delete its legacy script as you go.

## Customer care

The staff workspace includes complaint tracking and printable buyer account statements.
Buyer complaints and transaction records are stored in this browser alongside the rest
of the workspace data. A public buyer portal is not enabled: this local-first app does
not provide server-side buyer authentication or shared data storage.

## Slack notifications

The relay reads configuration from the repository-root `.env` (copied from
`.env.example`) and also supports `relay/.env` for existing local setups. The
`SLACK_API_BASE=https://slack.com/api` setting is already correct for Slack's
Web API; it is not a token or a URL that needs to be pasted into the app.

### Quickest setup: incoming webhook

1. In Slack, create or open a Slack app for your workspace, enable **Incoming
   Webhooks**, and add a webhook to the channel where alerts should appear.
2. Copy the webhook URL. Keep it private; anyone with it can post to that
   channel.
3. Copy `.env.example` to `.env`. Set `WORKSPACE_KEY` to a new random value
   (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   and put the webhook URL in `SLACK_WEBHOOK_URL`. Leave the bot-token fields
   unused. The webhook controls its destination channel.
4. Start the relay in a terminal with `npm run relay`. Check
   `http://127.0.0.1:8787/health`; the response should show `"slack":true`.
5. In LandLedger, open **Settings → Team notifications**. Set the relay
   endpoint to `http://127.0.0.1:8787/notify`, enter the same workspace key,
   enable alerts, choose which events to send, save, then select **Send test**.

### Alternative: bot token

Create a Slack app, add the `chat:write` bot token scope, install/reinstall the
app in your workspace, invite the bot to the destination channel, then put its
`xoxb-...` bot token in `SLACK_BOT_TOKEN` and the channel ID (for example
`C0123456789`) in `SLACK_CHANNEL`. Keep `SLACK_API_BASE` set to
`https://slack.com/api`. Restart `npm run relay` after changing `.env`, then
follow the app configuration and test steps above.

Do not put the Slack token/webhook in the browser settings, commit `.env`, or
paste credentials into chat. Only the relay should hold Slack credentials. For
access from other devices or a hosted app, use a securely hosted relay over
HTTPS and set the app's endpoint to an address reachable by those devices;
`127.0.0.1` only refers to the device running the browser.

## Office and visitor portal

The `/office` portal is a server-rendered, role-based administration system backed
by PostgreSQL. It covers staff, roles and permissions, attendance, organization
departments and rooms, front-desk visitor operations, reporting, audit history,
settings, and email notifications. The legacy browser-local workspace remains
separate and is not automatically migrated into the portal.

### Local setup

For local development, install PostgreSQL and create an empty `landledger`
database, then copy `.env.example` to `.env` and set `DATABASE_URL`. For
deployment, use a persistent Neon PostgreSQL database and set the same
environment variables in Vercel; do not use a local SQLite/file database for a
serverless deployment.

Set these server-only variables locally and in Vercel:

- `DATABASE_URL`: local PostgreSQL connection string or Neon connection string.
- `AUTH_SECRET`: at least 32 random bytes. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`: a unique first
  administrator login; the password must have at least 12 characters.
- `VISITOR_DATA_KEY`: optional base64-encoded 32-byte key used to encrypt
  visitor identification numbers. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  Keep the key stable and backed up securely; losing it makes encrypted IDs
  unreadable.

After setting the local variables, apply the schema and create the initial
administrator:

```sh
npm install
npm run db:migrate
npm run db:bootstrap-admin
npm run dev
```

The bootstrap command is intended to run once per environment. It creates the
system roles and the initial administrator; it will not reset an existing
administrator password. Remove `BOOTSTRAP_ADMIN_PASSWORD` after bootstrapping.
For Vercel, configure the secrets first, run `npm run db:migrate` against the
production database as a deployment step, then run `npm run db:bootstrap-admin`
once against that database. Do not put production credentials in source files
or paste them into chat.

Visit `/office/login` to sign in and `/office` for the role-specific workspace.
Navigation only shows modules the signed-in user may access, and every API route
re-checks the same permissions server-side. System roles are `SUPER_ADMIN`,
`OFFICE_MANAGER`, `ACCOUNTANT`, `SURVEYOR`, `RECEPTIONIST`, and `VISITOR`; custom
roles can be created with per-module `view/create/edit/delete/approve/export/
print` permissions. Role assignments and permission changes are recorded in the
audit history.

### Visitor workflow

1. Register a visitor (new or existing record) with category, purpose, host,
   department, meeting room, expected arrival/departure, photo, and consent.
2. Visits flagged for approval appear as `AWAITING_APPROVAL`; an authorised user
   approves or denies them.
3. Check-in confirms identity, records the host and duration, marks the card as
   issued, and produces a printable visitor card with a signed QR code.
4. The live register shows `EXPECTED`, `AWAITING_APPROVAL`, `CHECKED_IN`,
   `CHECKED_OUT`, `OVERDUE`, `EXPIRED`, `CANCELLED`, and `DENIED`, with filters,
   search, and reporting.
5. Check-out records card return, revokes the QR code immediately, and prevents a
   second check-out. Authorised corrections are audited and never overwrite the
   original event silently.
6. `/api/visitor-access/verify` validates QR access tokens for reception or
   turnstile integration. Visitor identification numbers are encrypted at rest,
   and API responses never expose the ciphertext or photo data.

### Email notifications (Resend)

Notifications use the Resend Node SDK and are entirely environment-driven:

- `RESEND_API_KEY`: server-only API key from https://resend.com/api-keys. The
  masked key displayed in the Resend dashboard is a redaction, not a usable
  credential, so it cannot be copied into the app. Create a key and store its
  full value only in the environment.
- `EMAIL_FROM`: a verified sender or domain in Resend, for example
  `LandLedger <alerts@yourdomain.com>`. The domain must be verified in Resend
  before delivery succeeds.
- `EMAIL_REPLY_TO` (optional): Reply-To address for outgoing mail.
- `APP_URL`: public base URL used for links in notification emails.

Enable and configure notification events in **Settings → Notifications** (host
on registration, visitor confirmation, approval required, decision, arrival, and
check-out). Every attempt is written to the Notification log with `SENT`,
`FAILED`, or `SKIPPED`. When `RESEND_API_KEY` or `EMAIL_FROM` is missing, the
system records `SKIPPED` and the test-email action returns a clear 503 rather
than pretending to deliver. Never hard-code the key in source, commit `.env`, or
paste it into chat or a browser field.

### Layout and printing

The workspace is responsive down to phone widths, with the sidebar becoming an
overlay below 1000px. Visitor cards use dedicated print styles: opening a card
and printing shows only the card, sized for a standard ID card. Card colours,
signature text, and footer content come from Settings.

