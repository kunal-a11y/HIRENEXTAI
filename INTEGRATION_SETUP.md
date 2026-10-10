# Enable Hirenext integrations

The local site is at http://localhost:3003. Email/password registration and login work. AI, Google, SMTP, SMS and Razorpay were intentionally left unconfigured at the owner's request. This work does not include a live charge or a real Google/SMTP sign-in test.

Keep credentials in the ignored `backend/.env`, never in frontend code or chat. Restart the API after editing configuration. Use `backend/.env.example` for variable names.

## Google login

1. Create a **Web application** OAuth client in your Google Cloud project. Configure the consent screen and test users while the app is in testing mode.
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` in the backend environment.
3. For this local setup, register the exact redirect URI `http://localhost:5000/api/auth/google/callback`. Open the frontend using `http://localhost:3003`, consistently using **localhost**, not alternating with 127.0.0.1, so browser-bound cookies remain on the same host.
4. For production, register the exact HTTPS callback on your own API domain and set `FRONTEND_URL` and `BACKEND_URL` accordingly. Keep frontend and API on the same site (a reverse-proxied `/api` is simplest).
5. Test a normal user, an approved admin, cancellation, expired state and repeat callback. Normal users go to the chat workspace; admins must also verify an emailed code.

The callback uses single-use state and returns a short-lived exchange code, bound to an HttpOnly browser cookie. The frontend exchanges this once for the application session. A plain email address never grants administrator access.

Reference: [Google's web-server OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server).

## SMTP and the initial owner

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` for a sender you control. Port 587 uses STARTTLS; port 465 uses TLS. Certificate verification stays enabled.

Register the intended owner email with a password first. After email delivery works, run the local operator helper with the **approved owner email**:

```powershell
node scripts/provision-owner.cjs approved-owner@example.com
```

The helper only runs against a local development database, refuses to replace an existing owner, requires an existing active password account, and invalidates old sessions. Assigning the role does not bypass SMTP verification at sign-in. The requested local owner is now mindcraftgamer26@gmail.com.

Sign in at `/admin/login` with that email and password, then enter the emailed code. Google can be used as the first sign-in step once configured. The owner can grant other admins permissions through Admin Monitoring. Grant **Alerts → View update subscribers** to staff who should see collected emails. Read permissions do not grant write permissions.

For an invited account without a password, use password recovery with the registered email to establish a password, or configured Google login for that exact verified email. Public signup never promotes an account to admin.

## Razorpay

1. Set test `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and a separate `RAZORPAY_WEBHOOK_SECRET` in the backend environment.
2. Review `backend/config/billingCatalog.js`. Current INR totals: Plus ₹149 / 30 days or ₹1,428 / 365 days; Pro ₹299 / 30 days or ₹2,868 / 365 days. Yearly cards show a monthly equivalent and the upfront total. These are one-time payments, **not automatic subscriptions**. No extra tax is silently added by this code; review your invoicing and final customer-facing prices before taking live payments.
3. Enable automatic capture in the Razorpay account, or implement your reviewed capture process. Only captured payments activate plans.
4. Configure the HTTPS webhook `/api/payment/webhook` for `payment.captured` and `order.paid`, using the same webhook secret. Local webhook delivery needs an explicitly configured test tunnel; none was opened by this task.
5. Run provider test transactions for monthly/yearly purchases, cancellation, failed payments, delayed capture, duplicate callbacks and duplicate webhooks. Verify the saved order, user plan and expiry in the database.
6. Enable live credentials only after these tests and the account's required merchant setup are complete.

Orders save the purchaser, plan, amount, currency and billing period. A signature alone is insufficient: the server fetches the provider payment and checks capture status and exact order/amount/currency. Fulfilment is transactional and idempotent. Renewing the same plan extends remaining time; selecting a different plan starts its new period immediately. Refund and chargeback processing still requires an operational workflow; it is not automated here.

References: [Razorpay checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Update subscriptions

`POST /api/updates/subscribe` validates and normalizes the email, applies a rate limit and inserts it once into `update_subscribers`. A successful save displays **Thank you for subscribing.** No outbound email is sent. Authorized admins view/search/paginate subscriptions at **Admin → Alerts**. No fake subscriptions are seeded.

## Run the source on another machine

Install Node.js and MySQL/MariaDB, create a fresh database and a database user scoped to it, install dependencies in `backend` and `frontend`, and create `backend/.env` from the example with new secrets. The backend creates its tables on startup. Start `npm run dev` in each directory. The portable database, existing local credentials, dependencies and data are excluded from the source archive. `scripts/start-local.ps1` is for the already-prepared database on this computer. Do not run the destructive demonstration seed on real data.


### Current local owner assignment (October 10, 2026)

The existing account `mindcraftgamer26@gmail.com` has been assigned owner access at the owner's request. Use `/admin/login` with the account's existing password after configuring SMTP. The helper may assign a role before SMTP is ready, but login still refuses to bypass the emailed verification code. This assignment exists in the local database only; importing the source archive does not transfer accounts or credentials.
