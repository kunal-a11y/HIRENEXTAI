# Public launch preparation — October 10, 2026

**October 11 update:** The owner paused the Supabase migration and is considering
Wasmer with MySQL and Brevo email. No application data was transferred to Supabase.
See [BREVO_WASMER_SETUP.md](BREVO_WASMER_SETUP.md) for the current plan and blockers.
The Oracle/Supabase deployment instructions below are historical, not active.

The local website is running. The production build and 20 regression tests passed. Built homepage, About and Pricing routes returned 200 with nonced HTML and no-store headers. Founder social buttons include the supplied LinkedIn URL. Production headers now permit the existing Razorpay checkout hosts and same-origin microphone access for the voice feature; live payments and voice-provider operation are not claimed as tested.

## Intended hosting

Oracle Cloud compute for the Node application, Cloudflare for domain/DNS, and Supabase for PostgreSQL, as proposed by the owner. No cloud resources were created, no DNS records changed, and no public deployment was performed.

## Required before publication

1. The owner confirmed **hirenextai.com**; the Oracle VM has not been created yet. Obtain its public IP and deployment access. Select only resources confirmed as Always Free in that tenancy. Free compute availability is not guaranteed. See [DOMAIN_SETUP.md](DOMAIN_SETUP.md) for exact DNS and Google OAuth values.
2. Migrate the MySQL-specific driver, schema, queries, transactions and provisioning workflow to PostgreSQL before using Supabase. The current code cannot use a Supabase connection string as a drop-in replacement. Validate the migration against a separate database and preserve the local database.
3. Prisma preparation is installed under backend/prisma with private URLs in ignored backend/.env.local. Validation, client generation, and read-only connection checks on both Supabase pooler ports pass. Strict TLS verification uses the owner-supplied CA certificate, stored locally in .local/supabase. Install that CA with the correct private path on the production host and complete the application migration before cutover. Use a backend-only connection; no database passwords or service-role credentials belong in the frontend.
4. Configure SMTP (required for admin email verification), AI provider credentials, Google OAuth, and Razorpay credentials/webhook secret if those features will be enabled. LinkedIn OAuth is optional; public founder social links need no API keys.
5. Configure production URLs, HTTPS, trusted reverse proxies and OAuth callbacks for the confirmed domain. Verify DNS, TLS, normal/admin login, email delivery, database isolation, subscription activation/expiry and signed webhooks on the deployed host.

The assigned local owner account does not transfer through the source archive. Public owner provisioning must preserve verified email access and existing-password or provider authentication. Never publish .env files or the local database.

See INTEGRATION_SETUP.md for existing integration settings. Private values should be stored in a local ignored configuration file or the hosting secret manager, not pasted into chat.
