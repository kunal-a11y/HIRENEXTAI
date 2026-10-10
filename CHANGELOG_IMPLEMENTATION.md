# Hirenext refinement delivery

Updated October 10, 2026. Changes are in this local project; nothing was pushed or deployed to the public website.

## Interface

- Preserved the light visual identity, sketch hero and existing fonts. Added restrained blue, teal and amber accents, hero tags, gentle reveals and reduced-motion support.
- Replaced duplicated homepage logo strips with one continuous row. Logos have equal width, equal gaps, identical loop groups, accessible names and a pause button; reduced-motion users get a static scrollable row.
- Added softer feature-card backgrounds and improved body-text size. Replaced unsupported security claims with the safeguards actually implemented.
- Rebuilt pricing cards and the monthly/yearly control. Prices load from the same backend catalog used to create orders. Yearly cards show both the monthly equivalent and full upfront total.
- Enlarged FAQ questions and headings, added accessible expandable answers, and replaced the oversized final section with a compact career banner.
- Rebuilt Updates with search, filters, expandable release details and a timeline whose fill and ticks use actual element positions. Included the owner-supplied 2025 angel-investment milestone without naming an investor or giving an amount.
- Rewrote About around the product's purpose, without invented user counts, founding dates, model provenance or success metrics. Replaced fabricated homepage success stories with preparation guidance.
- Refined Contact form accents, sign-in/sign-up styling, input labels, password-length consistency, mobile auth layout, chat welcome text and quick-action cards.
- Added responsive admin navigation, a dedicated Alerts view with search and pagination, and a concise accessible upgrade dialog leading to the authoritative pricing page.
- Chrome extension source stays removed. Its original website page file remains preserved and its route remains disabled.

## Functional changes

**Subscriptions:** `POST /api/updates/subscribe` normalizes and validates email, rate limits submissions and stores one row per email in `update_subscribers`. Only after a successful save does the UI show exactly **Thank you for subscribing.** It does not send an email. `GET /api/admin/alerts/subscribers` requires verified admin access and the Alerts permission (or owner role).

**Admin login:** `/admin/login` asks for the registered email and password. The backend checks the stored role. An approved admin must complete email verification after password or Google sign-in. A short-lived HttpOnly first-factor challenge is mandatory at OTP endpoints; email alone cannot obtain admin access. Existing verified sessions are checked on refresh, avoiding repeated unsolicited OTP sends. Read-only permission selections remain read-only. The one-time owner helper is documented in `INTEGRATION_SETUP.md`; no default owner or automatic promotion was added.

**Google:** Added provider readiness handling, clear login errors, correct frontend failure redirects, role-based destinations and a single-use browser-bound exchange code. Application tokens are no longer placed in OAuth redirect URLs. Actual Google credentials and account configuration are still required.

**Payments:** Razorpay order creation, verification and signed webhooks share server-controlled plan amounts and billing periods. Purchaser, capture status, amount, currency and signature are checked. Plan activation is transactional and replay-safe. Paid periods are 30/365 days with no automatic renewal. Expired paid access falls back to Free. Different-plan purchases cannot convert a long cheap-plan balance into a long expensive-plan balance. Checkout stays unavailable until provider keys are configured. Real provider payments, capture settings and webhook delivery still need testing.

## Key code

- Shared styling: `frontend/src/refinements.css`
- Logo row, FAQ, CTA, subscription form: `frontend/src/components/marketing/Refinements.jsx`
- Updates timeline: `frontend/src/components/ui/timeline.jsx`
- Subscriber dashboard: `frontend/src/components/admin/AlertsPanel.jsx`
- Billing source: `backend/config/billingCatalog.js`
- Payment service: `backend/services/payments.js`
- Subscription endpoint: `backend/routes/updates.js`
- First-factor proof: `backend/utils/adminChallenge.js`
- OAuth exchange: `backend/utils/oauthExchange.js`

## Verification

- Frontend production build passed. Vite still reports the existing large-bundle warning.
- 16 isolated security regression tests passed.
- 31 local authentication/security integration checks passed.
- 22 subscription/admin/billing/OAuth integration checks passed, including actual database writes, deduplication, restricted subscriber access, successful admin OTP exchange and rejection of reused codes.
- Browser checks covered desktop pricing and the yearly total, successful subscription confirmation, unavailable Google login feedback, mobile pricing/auth/updates/home FAQ/features, and the demo chat workspace.
- At a 375px viewport, checked pages fit without horizontal page overflow. All six brand cells measured 125px wide with the same vertical position. Timeline ticks were inactive before and active after their centers passed the line's viewport midpoint.
- Screenshot: `deliverables/updates-preview.jpg`.

## Still required from the owner

Private configuration for Google OAuth, SMTP and Razorpay. The approved local owner email has now been assigned (see the follow-up delivery below). AI and email remain unconfigured as previously requested. No real Google login, email delivery or charge was claimed as tested. See `INTEGRATION_SETUP.md` for exact setup, and `SECURITY_REVIEW.md` for remaining security limits. The site is not described as unhackable or fully audited.

The source archive excludes environment secrets, database files, dependencies, build output and Git history. It includes this guide, setup instructions and all current application source.


## Follow-up delivery — October 10, 2026

- Assigned the existing local `mindcraftgamer26@gmail.com` account the owner role at the owner's explicit request. Old sessions were revoked. Password and emailed OTP remain mandatory; SMTP is still unconfigured, so admin sign-in deliberately remains unavailable until email delivery is configured. No password or verification state was changed.
- Added Kunal Purohit's founder card with the supplied personal logo and exact Discord, Instagram and GitHub destinations. The original Downloads file was copied, not modified.
- Separated chats, generated files, application drafts, interviews, profile memory and preferences into browser workspaces keyed by account ID. Demo data uses a separate tab session. Previously unscoped browser data is preserved but is not assigned to an arbitrary account. This prevents accidental cross-account display; browser storage is not encryption or separate OS containers, and it is not cloud synchronization.
- Demo messages now produce clearly labelled sample replies, survive reloads in the same tab, retain their three-response counter and ten-minute timer, and never invoke live AI. They do not overwrite a signed-in account's saved data.
- Added visible premium-model locks and guarded both model selectors. Free/Plus use standard models with their existing limits; Pro unlocks the Pro model. The server checks the saved plan and expiry and rejects unknown model identifiers. Checkout refreshes the saved account after verified payment; returning to the tab also refreshes entitlement information.
- Preserved requested destinations when login is required, restricted return destinations to known app routes, removed the legacy token-in-URL login path, fixed chat selection/new-chat redirects, and reset workspace state on identity changes. Another tab's login/logout reloads the workspace instead of keeping stale account state.
- Changed the composer plus icon to a connections icon. Added GitHub to saved professional profiles and a clearer Apps & profiles page. LinkedIn account linking now starts with an authenticated POST and browser-bound state instead of placing the bearer token in a URL. Saving other profile links does not claim a working OAuth integration or automatic synchronization.

### Follow-up verification

Production build passed (existing large-bundle advisory remains). 17 backend regression tests, 3 frontend workspace/redirect/model tests, 11 live access/isolation checks and 22 subscription/admin integration checks passed. Browser checks confirmed the founder links and logo, no overflow at 375px, a saved demo conversation after refresh, the persistent timer/counter, locked Pro model opening pricing, and `/files` redirecting to login with its return destination. No browser console errors were reported. Preview: `deliverables/founder-preview.jpg`.

Google, LinkedIn, AI, SMTP and Razorpay credentials still require configuration for live service use. The local website is not a public deployment.
