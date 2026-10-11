# Hirenext public launch settings

**October 11 update:** Oracle/Supabase deployment is paused while the owner
considers Wasmer. Use [BREVO_WASMER_SETUP.md](BREVO_WASMER_SETUP.md) for the current
hosting and email plan. Do not create the Oracle A record described below.

Canonical website: **https://hirenextai.com**. Serve the frontend and Express API
from the same Oracle server, with API requests under `/api`. Redirect
`https://www.hirenextai.com` to the canonical domain, preserving path and query.

## Current status

- The owner has not created the Oracle VM yet. There is no server IP to put in DNS.
- No DNS records, Google Cloud settings or cloud resources were changed.
- Prisma 6 is pinned to match the supplied `url` / `directUrl` schema format and
  the existing CommonJS backend. Use the installed Node 24 runtime, not the old
  bundled Node executable. Prisma 7 uses a different configuration format.
- Prisma configuration is in `backend/prisma/schema.prisma`. Private Supabase
  values are in ignored `backend/.env.local`; an example contains placeholders only.
- The running application still uses MySQL. PostgreSQL models, queries, migrations
  and end-to-end authentication/payment tests must be completed before cutover.
  Installing Prisma does not migrate MySQL SQL, data or owner accounts.
- Do not deploy the application against Supabase yet or run `db push` with the
  empty preparation schema. No Supabase tables have been created by this setup.
- Validation and client generation passed; all 17 backend security tests passed.
  The backend dependency audit reports no known vulnerabilities after applying a
  scoped `deepmerge-ts` patch override for Prisma tooling.
- Both live Supabase connection checks passed on October 10, 2026, with strict
  TLS verification using the owner-supplied `prod-ca-2021.crt`. A private copy is
  stored in `.local/supabase/`; both ignored connection URLs reference it through
  `sslcert`. Only `SELECT 1` was executed; no tables or application data changed.
  On the production host, install the same trusted CA and update the certificate
  path in the private connection URLs for that host.

## 1. Oracle server

1. Create a supported Linux VM in the Oracle tenancy. Verify that the selected
   compute, storage and network resources qualify for that account's free tier
   before provisioning. This project has not provisioned or purchased resources.
2. Record the VM's public IPv4 address. Reserve it if available and appropriate.
3. Allow inbound HTTPS 443 and HTTP 80 in both Oracle networking and the OS
   firewall; restrict SSH 22 to the operator's IP. Keep Node port 5000 and database
   ports private. Run the application as an unprivileged service account.
4. Install a current supported Node runtime and Nginx. Build the frontend and
   have Nginx forward requests to Express at `127.0.0.1:5000`, which serves the
   built frontend and API. Production settings are in `deploy/hirenextai.env.example`.
5. Install a valid origin TLS certificate covering both `hirenextai.com` and
   `www.hirenextai.com` before enabling Cloudflare Full (strict).

## 2. Cloudflare DNS

Create these only after the Oracle server is available:

| Type | Name | Content | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `@` | **Actual Oracle VM public IPv4** | Proxied (orange cloud) | Auto |
| CNAME | `www` | `hirenextai.com` | Proxied (orange cloud) | Auto |

- Never enter the literal placeholder, localhost, a private IP or the Supabase
  database host as the A record's content.
- Review existing records for these names before replacing conflicting website
  records. Preserve mail MX/TXT records and unrelated subdomains. Add AAAA only
  if that VM has working public IPv6 and the service/firewall supports it.
- Use the nameservers assigned to this zone by Cloudflare at the domain registrar.
- Set SSL/TLS encryption to **Full (strict)**. Enable **Always Use HTTPS**.
- Add a Cloudflare redirect rule from `www.hirenextai.com` to
  `https://hirenextai.com`, preserving the request path and query, with HTTP 301.
  A CNAME alone does not redirect the browser's address.
- Do not enable a blanket Cache Everything rule. Bypass caching for `/api/*`,
  authenticated responses and HTML. Cache only versioned public assets.
- When configuring real client IPs in Nginx, trust `CF-Connecting-IP` only from
  Cloudflare's published IP ranges and restrict direct origin access accordingly.
  Never trust a client-supplied forwarded-IP header from arbitrary peers.
- No separate `api` DNS record is needed with this same-origin arrangement.
- SMTP providers will later supply any required SPF, DKIM and DMARC records;
  do not invent their values or proxy mail records.

## 3. Google OAuth — exact values

In Google Auth Platform / Credentials, create an OAuth client of type
**Web application**. This project uses its own Express Google OAuth flow,
not Supabase Auth.

### Authorised JavaScript origins

Production:

```text
https://hirenextai.com
```

Optional local-development client:

```text
http://localhost:3003
```

### Authorised redirect URIs

Production:

```text
https://hirenextai.com/api/auth/google/callback
```

Optional local-development client:

```text
http://localhost:5000/api/auth/google/callback
```

Origins have no path or trailing slash. Redirect URIs must match exactly.
Prefer separate production and development OAuth clients. `www` redirects to
the apex before login, so it does not need its own callback. Do not enter
`/auth/callback` (the frontend's internal callback) or a Supabase `/auth/v1/callback`
for this existing Express implementation.

Configure the consent screen with authorised domain `hirenextai.com`, homepage
`https://hirenextai.com`, privacy URL `https://hirenextai.com/privacy-policy`,
and terms URL `https://hirenextai.com/terms`. Use test users during setup and
publish the OAuth app when ready; finish any verification Google requires.

Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend secrets only.
Set `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, and `BACKEND_URL` to the production
values in the deployment example. Keep frontend API requests relative to `/api`.
Restart the API, then test success, cancellation, expired state, normal user
redirects and admin MFA. An admin still needs a working SMTP provider for OTPs.

## 4. Supabase preparation

Rotate the password shared in chat using the Supabase dashboard and update it
locally in `backend/.env.local`. URL-encode special characters in the password.
Do not post it again. The current preparation uses the supplied transaction
pooler on 6543 and session pooler on 5432. Both require verified TLS. If a custom
CA is necessary, install the provider's trusted CA; do not disable verification.

From `backend`:

```text
npm run db:validate
npm run db:generate
npm run db:check
```

These validate/generate the preparation client and run a read-only connection
check. They do not move application data or switch the API. The scripts explicitly
load `.env.local` because Prisma 6 does not load that filename automatically.

Before PostgreSQL cutover: translate the MySQL schema and queries, preserve
transactional payment/OTP behavior, create reviewed migrations in a separate
staging database, use a restricted application DB role, and test user isolation.
Do not expose backend tables through the Supabase Data API without appropriate
access controls; disable that API if unused or keep app tables in an unexposed
schema. Do not copy demo data or grant admin rights through public signup.

## 5. Remaining configuration

- Oracle public IP and deployment access.
- Rotated Supabase credentials stored locally or in the hosting secret manager.
- Google OAuth client ID and client secret.
- SMTP provider credentials and verified sender, required for admin OTPs.
- An AI provider key to enable real AI responses.
- Razorpay keys and webhook secret when enabling payments. Production webhook:
  `https://hirenextai.com/api/payment/webhook`.

Public founder social links need no API keys. No Supabase anon or service-role
API key is needed for backend-only Prisma database access.

## References

- [Supabase Prisma integration](https://supabase.com/docs/guides/database/prisma)
- [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Cloudflare DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
