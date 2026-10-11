# Import Hirenext from GitHub into Wasmer

This repository contains both the React frontend and Express backend, source
assets, dependency lockfiles, tests and database setup code. It does not contain
passwords, API keys, existing accounts/database records or downloaded runtimes.

## Build and start

Import https://github.com/kunal-a11y/HIRENEXTAI- with branch `main` and repository
root `.`. Select a Node/Express application, not a static React-only deployment.
Use Node 24. The root package provides:

| Step | Command |
| --- | --- |
| Install | `npm ci` (installs the backend and frontend via postinstall) |
| Build | `npm run build` |
| Start | `npm start` |

The backend serves `frontend/dist` and the API on the same origin. Supply the
platform's HTTP port and `HOST=0.0.0.0`. This has been prepared and locally built,
but not yet run on Wasmer's beta Node runtime. An import is not a production sign-off.

## Private configuration

In the Wasmer app: Settings → Environment Vars. Add the variables listed in
`deploy/wasmer.env.example` privately; Save and Redeploy applies them. Never upload
backend/.env, backend/.env.local, .local, database dumps or a ZIP containing secrets.

- Enable managed **MySQL**, subject to the plan's availability/price. Its injected
  DB_HOST, DB_PORT, DB_NAME, DB_USERNAME and DB_PASSWORD are supported. Keep those
  values; local MySQL credentials will not connect to Wasmer's database.
- Generate a new JWT_SECRET with at least 32 random characters for production.
- Configure your rotated Google client secret and ID. Retain the callback
  https://hirenextai.com/api/auth/google/callback once the domain is connected.
- Set Brevo's SMTP login and SMTP key after authenticating hirenextai.com.
- Add an AI key and Razorpay credentials only for integrations being enabled.
- The local owner/account data is not transferred by GitHub. Provision or migrate
  the approved owner through a reviewed database operation; email text alone must
  never grant administrator access. Admin email OTP remains mandatory.

## Required before public launch

1. Verify Express, bcrypt, mysql2 and outbound SMTP compatibility on a staging app.
2. Configure verified TLS for the managed MySQL connection after obtaining the
   provider's trusted CA. The existing local MySQL connection is local-only and
   is not a secure remote database template.
3. Replace process-local OAuth state/exchange and rate-limit storage with an
   atomic shared store, or establish and verify a deployment architecture that
   preserves their security guarantees across restarts and multiple instances.
4. Replace timer-only background jobs with durable scheduled jobs and locking.
5. Run login, admin MFA, account isolation, subscription expiry and payment replay
   checks on the target runtime. No live payment or Google login is claimed tested.
6. Add hirenextai.com and www.hirenextai.com in Wasmer Domains; copy the exact DNS
   and verification records it supplies into Cloudflare, preserving email DNS.

The inactive PostgreSQL preparation files are retained for completeness, but
DB_CLIENT must remain mysql. Do not run the paused Supabase migration script.

For Brevo and inbound email details, see BREVO_WASMER_SETUP.md.

Official documentation:
- https://docs.wasmer.io/edge/git/
- https://docs.wasmer.io/edge/learn/secrets/
- https://docs.wasmer.io/edge/learn/databases/
