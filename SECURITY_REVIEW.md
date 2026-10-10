# Security changes and verification

Updated: 2026-10-10. Scope: source review, dependency checks, local regression tests, and local startup. This is not a complete penetration test or a guarantee that every vulnerability has been found. No live production system was tested or changed.

## Fixed

- Removed startup creation of a default owner with a hardcoded password hash and removed email-based automatic admin/owner promotion from login and admin OTP routes. Roles now come from explicitly provisioned database records.
- Administrator API access requires a token marked as having completed email verification. Alternative Google token login cannot bypass that requirement. Suspended accounts are rejected.
- JWT verification accepts HS256 only and requires a valid account ID and current token version. Logout, password change and password reset invalidate prior sessions. Password reset and admin OTP consumption are atomic to reject concurrent reuse. Existing versionless/admin-without-MFA sessions must sign in again.
- Added missing application permissions and fail-closed handling for unmapped administrative operations. Normal-user management routes cannot modify or delete privileged accounts.
- Removed the known fallback payment secret from verification. Orders are stored with the authenticated purchaser, server-selected plan, amount and currency. Verification uses constant-time signatures, checks the provider's captured payment, and applies the saved order in a transaction. Replays do not reapply the subscription; a client cannot select a higher plan or reuse another account's order.
- Google and LinkedIn OAuth callbacks now require short-lived, browser-bound, single-use state. Verified provider email is required; LinkedIn tokens include the current account token version.
- Disabled public debug email routes. Removed blanket trust for arbitrary browser-extension origins. Proxy headers are not trusted by default; explicit proxy configuration is required for deployment. IP logging uses Express's resolved client IP.
- Login, AI and administrative OTP rate limits also apply in development. Credit checking rejects requests if its database check fails.
- SMTP transports now verify certificates, require TLS, and do not print SMTP protocol debug output. Missing credentials disable email instead of connecting to a hardcoded external mail host. New verification audit records redact OTPs.
- Tightened signup/password input validation and reserved the phone-login email namespace.
- Updated vulnerable dependencies, including Nodemailer and Google authentication dependencies, and removed the obsolete standalone `crypto` package.
- Local website/API/database bind to loopback, use generated local secrets, and keep database files and credentials out of Git. Startup waits for database initialization.

- Administrator OTP endpoints now require a signed, HttpOnly first-factor challenge for the same account and current token version. Email alone cannot request or verify an admin login. Challenge tokens cannot be used as API sessions.
- Preserved granular admin permissions instead of broadening read-only selections to an entire permission group. Subscriber emails require the Alerts permission.
- Added rate-limited, validated, idempotent update subscriptions. Admin list queries use parameter binding and bounded pagination.
- Added raw-body Razorpay webhook signature checking, captured-payment reconciliation, explicit paid access expiry and a shared server pricing catalog.

## Evidence

- 16 isolated security regression tests pass (`backend/tests/security.test.js`). They cover token revocation, MFA, permissions, OAuth state replay/browser binding, forwarded-IP spoofing, payment ownership/amount/status/plan/replay, former hardcoded admin promotion, and credit-check failures.
- 31 local integration checks pass (`backend/tests/local-smoke.cjs`), including real signup/login, protected routes, origin rejection, unconfigured services, logout/password revocation, suspension, admin restrictions, concurrent reset-token replay and rate limiting.
- Additional update/admin/billing integration checks are in `backend/tests/updates-smoke.cjs`; see CHANGELOG_IMPLEMENTATION.md for the final count.
- Frontend production build succeeds. Vite reports a large bundle warning.
- Homepage rendered in the browser with no captured console errors.
- Backend dependency audit: zero reported vulnerabilities after updates.
- Frontend runtime dependency audit (`npm audit --omit=dev`): zero reported vulnerabilities after updates.
- Full frontend audit still reports seven build-tool advisories (five high, two moderate) through Tailwind 3's brace/glob and PostCSS selector dependencies. The offered Tailwind 4 migration is breaking and was not applied as an automatic fix. The local development server is restricted to loopback. These warnings are not included in the runtime dependency audit, but should be resolved with a separately verified build-tool migration.

## Remaining limits before production

- Actual email, OAuth, AI, SMS and Razorpay interactions are untested because credentials were intentionally omitted. The checkout now uses a shared server catalog and explicit 30/365-day durations; configure and test actual provider capture and webhook delivery before enabling live payments. No real payment was made.
- OAuth redirects now carry a one-time, browser-bound exchange code instead of an application token. Browser bearer-token storage still merits a move to short-lived HttpOnly-cookie sessions. Browser-local chat/files also need a dedicated per-account persistence review.
- Review existing production owners/admins, old OTP logs/email-queue records and any default accounts created by earlier versions. Removing seed logic does not remove historical accounts or invalidate leaked production secrets. This task did not access production data.
- Rate-limit and OAuth-state stores are per process. A multi-instance deployment needs a shared store. Review exact reverse-proxy trust, HTTPS, backups, monitoring and deployment secrets before exposure.
- The broad admin email/attachment features and all remaining routes have not undergone an exhaustive hostile-input or load test. Do not describe the application as unhackable or fully audited.

See `LOCAL_DEVELOPMENT.md` for launch instructions and configuration boundaries.


### Follow-up checks (October 10, 2026)

Browser workspace keys now include the account ID, with separate session-only demo storage and state resets between identities. This is application-level separation, not encryption or protection from someone with access to the browser profile. Unowned legacy keys are not automatically migrated. Profile URLs are validated, including GitHub. LinkedIn linking no longer places session tokens in URLs. Login return paths use a supported-route allowlist. Unknown AI model IDs and expired paid entitlements fail closed; new regression and local integration tests cover these cases. The requested local owner assignment does not bypass password or email-code verification.
