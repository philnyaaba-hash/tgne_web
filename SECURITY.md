# Security policy

## Reporting a vulnerability

Email `info@tgnesolutions.com` with:

- the affected URL or component;
- a short description of the issue;
- steps to reproduce;
- any relevant screenshots or logs.

Please do not open a public issue for a suspected vulnerability, and do not test
against real client accounts or production data. We will acknowledge a report as
soon as possible and coordinate a fix before public disclosure.

## Scope

The public website, the client area, the office workspace and the enquiry API
are in scope. Third-party services such as Google Maps and the hosting provider
are out of scope; report those to the provider.

## Supported versions

The deployed production branch is supported. Local forks and old branches are
not.

## Secret handling

- Never commit `.env`, database URLs, API keys or session secrets.
- Rotate any credential that may have been exposed.
- Use the hosting provider's environment settings for production secrets.
- Send a test report to `info@tgnesolutions.com`, not to a personal inbox.
