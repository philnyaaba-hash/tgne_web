# TGNE Solutions improvement roadmap

## Overview

This specification turns the 100 agreed improvement suggestions into a staged
delivery plan for the TGNE public site, staff workspace, client portal, APIs,
and production operations. The work is incremental: each batch must preserve
existing records, pass its relevant tests and production build, and be pushed
only after verification. A Git bundle and a patch of the pre-roadmap working
tree are stored in the session snapshot; ignored environment files and secrets
are intentionally excluded.

## Functional requirements

### FR-001: Role-safe workspaces

While a user is authenticated, when the user opens a staff or client workspace
or calls a protected API, the system shall authorize the action against the
user's current database-backed role and permissions.

### FR-002: Persisted service work

While a client or staff member submits or updates a service inquiry, request,
quote, or client record, the system shall persist the change and show an
accurate success or actionable failure state.

### FR-003: Grouped staff navigation

While an authorized staff member uses the admin workspace, when they open a
navigation group, the system shall expose only destinations they are allowed
to access and clearly indicate the current page.

### FR-004: Safe forms and personal data

When a visitor or client submits personal data or an attachment, the system
shall validate the data on the server, apply access and abuse controls, and
provide an accessible confirmation or error.

### FR-005: Durable records and controlled operations

When the system stores, migrates, exports, or retires business records, it
shall preserve required history, enforce authorization, and provide a tested
recovery path.

### FR-006: Accessible and responsive interfaces

While any supported user visits a public or authenticated page, the system
shall provide semantic, keyboard-operable controls, visible focus, readable
contrast, responsive layouts, and reduced-motion behavior.

### FR-007: Verifiable releases

When code is proposed for or pushed to the production branch, automated checks
shall run the relevant tests and build, preserve failure artifacts, and make
deployment health verifiable without exposing secrets.

## Non-functional requirements

- **Security:** All authorization is enforced server-side. Credentials and
  tokens are never committed, logged, copied into snapshots, or returned in
  API responses. Production data is never modified by demo/test seeding.
- **Privacy:** Collect only data necessary for a stated service purpose; apply
  documented retention and ownership rules to client information and uploads.
- **Reliability:** A database or email failure must not be reported as a
  successful submission. Retriable failures must explain the next action.
- **Accessibility:** Target WCAG 2.2 AA for affected interfaces; automation is
  supplemented by keyboard and screen-reader-oriented checks.
- **Performance:** Establish production-mode baselines before setting budgets;
  no change may knowingly regress existing asset budgets or critical flows.
- **Compatibility:** Preserve current TGNE branding, supported browsers,
  database history, and existing public URLs unless a tested redirect is
  explicitly included.
- **Operations:** Backups, migrations, deployment checks, and rollback steps
  must be documented and reproducible.

## Acceptance criteria

### AC-001: Secret-safe snapshot

Given a project snapshot is requested, when it is created, then Git history and
the tracked working-tree delta can be restored and verified, and `.env`,
credentials, dependencies, and generated caches are excluded.

### AC-002: Admin authorization

Given a super administrator and a restricted staff member, when each calls
protected admin APIs, then the administrator receives only authorized
responses, the restricted member receives 403 for forbidden operations, and a
client account cannot gain staff access through wildcard permissions.

### AC-003: Safe demo seeding

Given production environment flags or missing explicit demo-seed opt-in, when
the demo seeder is invoked, then it exits before connecting to or changing the
database and prints no passwords.

### AC-004: Client request persistence

Given a client submits a valid request, when the database accepts it, then the
request is visible to that client and authorized staff; when persistence
fails, then the UI does not claim success.

### AC-005: Accessible navigation and forms

Given a keyboard or assistive-technology user, when they navigate menus and
submit a form at supported viewport sizes, then controls have names, state,
focus visibility, and actionable validation feedback.

### AC-006: Release checks

Given a proposed production change, when CI runs, then tests, secret hygiene,
asset checks, and production compilation run; a failure blocks the green
release state and retains useful test output.

### AC-007: Deployment verification

Given a deployment completes, when smoke checks run against its URL, then
public health, essential pages, authentication boundaries, and core metadata
are checked without printing environment values.

## Error handling

| Error condition | Expected behavior |
|---|---|
| Missing or expired session | Return/redirect to sign-in without exposing account details. |
| Authenticated but forbidden action | Return 403, show an actionable access message, and record a safe audit event. |
| Invalid form input | Return 400 with field-specific guidance; do not persist partial data. |
| Rate limit exceeded | Return 429 with retry timing; avoid revealing whether an account exists. |
| Database unavailable or timed out | Return a service error and keep the UI in an explicit failure state. |
| Attachment invalid or unauthorized | Reject the upload/download and do not expose storage paths. |
| Migration or backup verification fails | Stop the release batch and preserve the last known-good state. |
| CI, browser, or smoke test fails | Block that batch's push and report the failing command and evidence. |

## Delivery plan and status

All suggestions below are planned unless explicitly marked complete. Each batch
is implemented and verified before the next begins.

### Batch 1 — credential and authorization safety (implementation complete; operator action pending)

- [x] Remove plaintext demo passwords from source and browser tests.
- [x] Require distinct, user-provided strong test passwords for local demo seeding.
- [x] Refuse demo seeding in production and require explicit opt-in elsewhere.
- [x] Stop logging seeded passwords.
- [x] Add regression coverage for admin wildcard permissions and client isolation.
- [x] Add a CI check that rejects tracked local environment files.
- [ ] Rotate any credentials that were exposed outside trusted local storage (operator action; not performed by code).

### Batch 2 — client, inquiry, and staff workflows

- [ ] Implement client request timelines, expected response times, and status notifications.
- [ ] Complete request files, client history, request edits/withdrawals, and in-context help.
- [ ] Audit every public form for persistence, server validation, spam controls, duplicate protection, consent, and accessible errors/success.
- [ ] Add inquiry assignment, internal notes, actionable queues, overdue signals, and audited bulk actions.
- [ ] Standardize workflow statuses and add confirmation to sensitive actions.

### Batch 3 — admin workspace and permissions

- [ ] Add consistent navigation icons, counts, current-page state, and preserved open groups.
- [ ] Add breadcrumbs, section search, keyboard navigation, and concise tooltips.
- [ ] Add a roles/permissions matrix, auditable role changes, session revocation, and stale-account review.
- [ ] Add account recovery and multi-factor authentication for administrators.
- [ ] Add filters, saved views, exports, record change history, and informative empty states.

### Batch 4 — public website and accessibility

- [ ] Align service descriptions and calls to action; add outcome-focused case studies and response expectations.
- [ ] Improve remote-image fallbacks, page metadata, social previews, contact visibility, and policy links.
- [ ] Verify layouts at mobile, tablet, and desktop sizes and test menu/form keyboard behavior.
- [ ] Fix contrast, accessible names, form announcements, and reduced-motion behavior to WCAG 2.2 AA.
- [ ] Add public-page performance budgets only after establishing production baselines.

### Batch 5 — data, security, and resilience

- [ ] Review API origin checks, file access, response minimization, logging, headers, scripts, and privacy.
- [ ] Add pagination and review indexes, transaction boundaries, deletion/retention rules, and data ownership.
- [ ] Document and test backup restoration and schema-drift detection.
- [ ] Run dependency/security scans and add an incident-response process.
- [ ] Test database, email, timeout, and recovery failures.

### Batch 6 — release and operations

- [ ] Verify CI covers PRs and pushes, including E2E and artifact retention.
- [ ] Add deployment smoke checks for auth boundaries, forms, metadata, and health.
- [ ] Verify production deploy status and rollback steps for each release.
- [ ] Add structured error monitoring, operational alerts, metrics, and release notes.
- [ ] Complete documentation and establish recurring accessibility/security/production reviews.

## The 100 improvements

### 1–10: Admin workspace and navigation

1. Add consistent icons to each main menu and submenu.
2. Show submenu item counts where they help staff prioritize work.
3. Preserve a user's open menu groups while navigating.
4. Add breadcrumbs for deeply nested admin pages.
5. Provide quick search to jump to admin sections.
6. Make active menu and submenu states unmistakable.
7. Add keyboard support for opening and navigating dropdowns.
8. Ensure navigation remains usable on small screens.
9. Add concise tooltips for less familiar menu labels.
10. Show clear empty states when a section has no records.

### 11–20: Roles, permissions, and accounts

11. Add automated tests for server-side admin permissions.
12. Confirm every admin API enforces authorization independently of the UI.
13. Add a permission matrix to the roles screen.
14. Make role changes auditable, including who changed what and when.
15. Provide a safe account recovery and admin-password reset flow.
16. Add multi-factor authentication for administrators.
17. Add session expiry and session-revocation controls.
18. Alert administrators about repeated failed login attempts.
19. Review seed and demo accounts before production deployment.
20. Ensure secrets and real credentials are never committed to the repository.

### 21–30: Client service portal

21. Let clients track each service request through clear stages.
22. Show expected response times for each request type.
23. Add a request timeline with dated updates and responsible staff.
24. Let clients attach relevant files to a service request.
25. Add clear confirmations after a request is submitted.
26. Let clients update or withdraw requests under appropriate rules.
27. Add client notifications for status changes.
28. Improve the client profile with company and contact details.
29. Give clients a searchable history of requests and quotes.
30. Add a clear help route from every client portal page.

### 31–40: Forms and inquiries

31. Review every public form and verify that its submission is persisted.
32. Add server-side validation for all form fields.
33. Provide specific, accessible validation errors beside the relevant field.
34. Prevent duplicate submissions while a request is processing.
35. Add success screens that explain next steps.
36. Add rate limits and spam controls to public forms.
37. Ensure forms work with keyboard and screen-reader navigation.
38. Test uploads for file size, type, and safe storage.
39. Add consent and privacy text where personal data is collected.
40. Give staff a way to find and respond to every inquiry.

### 41–50: Admin workflows

41. Add filters and saved views to large client and inquiry lists.
42. Support bulk actions for repetitive administrative tasks.
43. Add assignment and ownership for incoming inquiries.
44. Add internal notes that are not visible to clients.
45. Add service-level indicators for overdue work.
46. Allow staff to export authorized reports in a controlled way.
47. Add confirmation for irreversible or sensitive actions.
48. Include change history on important client and service records.
49. Make error states actionable, with retry or recovery guidance.
50. Standardize status names and transitions across admin panels.

### 51–60: Database and migrations

51. Test database migrations against a disposable production-like database.
52. Document the required production migration procedure.
53. Add checks that detect schema drift before deployment.
54. Review indexes for commonly filtered and sorted admin tables.
55. Add pagination to endpoints that may return many records.
56. Define retention rules for old inquiries, uploads, and audit events.
57. Add backups and periodically test restoring them.
58. Verify transactions cover multi-step business updates.
59. Review deletion behavior to avoid losing related business history.
60. Add database health checks with clear failure reporting.

### 61–70: Security and privacy

61. Audit API routes for consistent same-origin protections.
62. Review file upload and download access controls.
63. Minimize personal data returned by API responses.
64. Add a privacy review to new features that collect client information.
65. Avoid exposing sensitive details in application logs.
66. Add security headers and verify their production behavior.
67. Review third-party scripts and limit unnecessary tracking.
68. Add a documented process for security incidents.
69. Periodically review staff accounts and remove stale access.
70. Run dependency and secret-scanning checks in CI.

### 71–80: Public website and brand

71. Keep service descriptions consistent between the homepage and portal.
72. Add clear calls to action for each TGNE service.
73. Add credible case studies with measurable outcomes.
74. Improve image loading and fallback behavior for remote assets.
75. Check text contrast and image alternatives across public pages.
76. Verify mobile layout and navigation on common screen sizes.
77. Add metadata and social sharing previews for key pages.
78. Make contact details and response expectations easy to find.
79. Add a clear privacy policy and terms for online inquiries.
80. Review public copy to remove outdated or unrelated business references.

### 81–90: Testing and accessibility

81. Add browser tests for administrator and client login flows.
82. Test admin dropdown behavior with mouse, touch, and keyboard.
83. Add regression tests for permission-denied and unauthorized states.
84. Add end-to-end tests for submitting and processing a client request.
85. Test forms with invalid, missing, and unusually long input.
86. Add automated accessibility checks to CI.
87. Test important pages at mobile, tablet, and desktop sizes.
88. Add tests for database-unavailable and timeout scenarios.
89. Make test accounts isolated from production data.
90. Keep a short release checklist for build, tests, and deployment verification.

### 91–100: Deployment and operations

91. Add a CI workflow that runs tests and production builds on every pull request.
92. Add deployment smoke tests for login, public pages, and health endpoints.
93. Verify Vercel deployment status after each production push.
94. Separate preview and production environment variables carefully.
95. Add structured error monitoring for server and client failures.
96. Track operational metrics such as failed requests and slow endpoints.
97. Document rollback steps for failed deployments.
98. Add alerts for database connectivity and authentication outages.
99. Maintain a release log for user-visible changes.
100. Schedule a recurring review of security, accessibility, and production readiness.

## First-batch acceptance and implementation checklist

- [x] No demo password is embedded in the account catalog or E2E fixtures.
- [x] Every seeded account gets a distinct 12-character-or-longer password from ignored environment configuration.
- [x] Demo seeding fails closed for production, missing opt-in, missing passwords, and unapproved remote database targets.
- [x] The seeder prints account identifiers only, never password values.
- [x] Super-admin wildcard checks and client-role boundaries are covered by unit tests.
- [x] CI fails if a local `.env` file is tracked.
- [x] Existing local `.env` is not read into, copied into, or modified by the snapshot.
- [x] `npm test`, `npm run check:secrets`, and `npm run build` pass before the batch is pushed.

## Out of scope for the first batch

- Changing production credentials or database values automatically.
- Applying migrations or editing production records.
- Claiming all 100 improvements are complete in one release.
- Pushing a batch with failing tests or an unverified build.

## Open operational note

Any credentials that were shared outside trusted local storage should be
rotated in the relevant environment provider before or alongside deployment.
The repository changes cannot revoke credentials in `.env` or Vercel settings.
