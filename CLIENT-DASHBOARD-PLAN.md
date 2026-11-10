# TGNE Client Dashboard — 100 Improvement Plan

Status key: `[ ]` planned · `[~]` in progress · `[x]` done

## A. Authentication & Access (1–10)
- [ ] 1. Add a dedicated premium login page at `/login` with TGNE branding — **DONE** (`app/login/page.jsx` + `login.module.css`)
- [ ] 2. Add "Remember me" checkbox with persistent session
- [ ] 3. Add "Forgot password" flow with email-based reset (`/forgot-password`)
- [ ] 4. Add magic-link sign-in option (email-only login)
- [ ] 5. Add biometric/passkey support (WebAuthn) for returning users
- [ ] 6. Add two-factor authentication (TOTP) enforcement toggle
- [ ] 7. Add session expiry warnings with extend-session prompt
- [ ] 8. Add single sign-on (SSO) / SAML option for corporate clients
- [ ] 9. Add role-based access (viewer, editor, admin) with permission badges
- [ ] 10. Add idle timeout auto-logout with data save warning

## B. Navigation & Layout (11–20)
- [~] 11. Collapsible sidebar with icon-only mode — **mobile left-pane menu implemented**
- [ ] 12. Global keyboard shortcuts (Cmd/Ctrl+K) command palette
- [ ] 13. Breadcrumb navigation on every page
- [ ] 14. Pinned/favorite navigation items per user
- [ ] 15. Dark mode theme toggle
- [ ] 16. Language switcher (English / French / local languages)
- [ ] 17. Responsive bottom navigation on mobile
- [ ] 18. Skip-to-content link for keyboard users
- [ ] 19. Consistent page titles and browser tab labels
- [ ] 20. Print-friendly stylesheets for orders and invoices

## C. Overview & Metrics (21–30)
- [ ] 21. Role-specific overview (client vs admin vs staff)
- [ ] 22. Customizable dashboard widgets (drag-and-drop)
- [ ] 23. Real-time metric refresh via WebSocket/SSE
- [ ] 24. Order value trends chart (30/90-day view)
- [ ] 25. Service-type breakdown pie chart
- [ ] 26. Upcoming deadlines countdown banner
- [ ] 27. "Needs your attention" priority inbox
- [ ] 28. Recent activity feed with timestamps
- [ ] 29. Export dashboard summary to PDF
- [ ] 30. Goal/target progress trackers

## D. Orders & Service Requests (31–40)
- [ ] 31. Order creation wizard with step-by-step validation
- [ ] 32. File attachment upload for order briefs (max size, type checks)
- [ ] 33. Order duplicate/cloning function
- [ ] 34. Bulk order actions (approve, cancel, archive)
- [ ] 35. Order status timeline with estimated completion dates
- [ ] 36. Priority level selector (Low/Normal/High/Urgent)
- [ ] 37. Internal notes vs client-visible notes toggle
- [ ] 38. Order templates for repeat services
- [ ] 39. Scheduled recurring orders (monthly hosting, quarterly print)
- [ ] 40. Order cancellation with reason capture

## E. Quotes & Invoices (41–50)
- [ ] 41. Quote-to-invoice one-click conversion
- [ ] 42. PDF invoice generation and download
- [ ] 43. Invoice payment status tracking (paid/partial/overdue)
- [ ] 44. Online payment integration (mobile money, card, bank transfer)
- [ ] 45. Payment reminders for overdue invoices
- [ ] 46. Quote validity period countdown
- [ ] 47. Line-item editor for custom quotes
- [ ] 48. Tax calculation (VAT/NHIL) breakdown
- [ ] 49. Multi-currency support (GHS, USD)
- [ ] 50. Invoice history and re-download

## F. Documents & Files (51–60)
- [ ] 51. Central document library with folders
- [ ] 52. File version history
- [ ] 53. Document e-signature requests
- [ ] 54. Shared folders with team members
- [ ] 55. File preview (PDF, images) without download
- [ ] 56. Bulk download as ZIP
- [ ] 57. Document access permissions (view/edit/download)
- [ ] 58. File virus/malware scan on upload
- [ ] 59. Document expiry/retention policies
- [ ] 60. Search within document contents (OCR)

## G. Team & Collaboration (61–70)
- [ ] 61. Team member roster with roles and contact info
- [ ] 62. Assign orders to specific team members
- [ ] 63. @mention notifications in order comments
- [ ] 64. Team availability calendar
- [ ] 65. Client admin: add/remove team users
- [ ] 66. Activity log per team member
- [ ] 67. Order handoff between staff members
- [ ] 68. Client workspace switching (multi-company)
- [ ] 69. Read receipts for messages
- [ ] 70. Team performance metrics

## H. Support & Communication (71–80)
- [ ] 71. In-app chat with TGNE support team
- [ ] 72. Support ticket creation and tracking
- [ ] 73. Knowledge base / help center links
- [ ] 74. Video call scheduling with consultants
- [ ] 75. Notification center (bell icon) with unread badge
- [ ] 76. Email notification preferences toggle
- [ ] 77. SMS/WhatsApp notification opt-in
- [ ] 78. Announcement banner from TGNE
- [ ] 79. Satisfaction survey after order completion
- [ ] 80. Status page for TGNE service incidents

## I. Billing & Payments (81–90)
- [ ] 81. Payment method management (save cards/momo)
- [ ] 82. Auto-pay for recurring invoices
- [ ] 83. Payment receipts auto-emailed
- [ ] 84. Refund request submission
- [ ] 85. Billing contact details editor
- [ ] 86. Tax ID / company registration fields
- [ ] 87. Payment history export (CSV)
- [ ] 88. Installment payment plans for large projects
- [ ] 89. Early-payment discount indicators
- [ ] 90. Currency conversion display

## J. Admin & Operations (91–100)
- [ ] 91. Client user management (invite, deactivate, reset password)
- [ ] 92. Service catalog with pricing and descriptions
- [ ] 93. Staff workload dashboard
- [ ] 94. SLA compliance tracking per order
- [ ] 95. Audit log export for compliance
- [ ] 96. Data backup and restore options
- [ ] 97. GDPR/data deletion request form
- [ ] 98. API access keys for integrations
- [ ] 99. Webhook configuration for order events
- [ ] 100. Changelog / what's new modal on deploy

## Implementation approach
- Work in waves (A→J), one wave at a time.
- Every new feature adds tests (`tests/e2e/` + `tests/*.test.js`).
- Run `npm test`, `npm run test:e2e`, and `npm run build` before closing each wave.
- Keep `.env` out of git; demo mode works without a database.
