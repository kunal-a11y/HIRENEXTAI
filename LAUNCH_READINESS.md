# Public launch preparation — October 10, 2026

The local website is running. The production build and 20 regression tests passed. Built homepage, About and Pricing routes returned 200 with nonced HTML and no-store headers. Founder social buttons include the supplied LinkedIn URL. Production headers now permit the existing Razorpay checkout hosts and same-origin microphone access for the voice feature; live payments and voice-provider operation are not claimed as tested.

## Intended hosting

Oracle Cloud compute for the Node application, Cloudflare for domain/DNS, and Supabase for PostgreSQL, as proposed by the owner. No cloud resources were created, no DNS records changed, and no public deployment was performed.

## Required before publication

1. Confirm the actual domain and available Oracle VM/region and deployment access. Select only resources confirmed as Always Free in that tenancy. Free compute availability is not guaranteed.
2. Migrate the MySQL-specific driver, schema, queries, transactions and provisioning workflow to PostgreSQL before using Supabase. The current code cannot use a Supabase connection string as a drop-in replacement. Validate the migration against a separate database and preserve the local database.
3. Configure the Supabase Postgres connection with certificate verification. Use a backend-only connection; no database passwords or service-role credentials belong in the frontend.
4. Configure SMTP (required for admin email verification), AI provider credentials, Google OAuth, and Razorpay credentials/webhook secret if those features will be enabled. LinkedIn OAuth is optional; public founder social links need no API keys.
5. Configure production URLs, HTTPS, trusted reverse proxies and OAuth callbacks for the confirmed domain. Verify DNS, TLS, normal/admin login, email delivery, database isolation, subscription activation/expiry and signed webhooks on the deployed host.

The assigned local owner account does not transfer through the source archive. Public owner provisioning must preserve verified email access and existing-password or provider authentication. Never publish .env files or the local database.

See INTEGRATION_SETUP.md for existing integration settings. Private values should be stored in a local ignored configuration file or the hosting secret manager, not pasted into chat.
