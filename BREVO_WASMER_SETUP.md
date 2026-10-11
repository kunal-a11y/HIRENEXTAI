# Wasmer and Brevo setup — October 11, 2026

The owner is considering Wasmer instead of Oracle/Supabase. The Supabase migration
is paused: no application records were transferred and the local API remains on
MySQL. PostgreSQL migration code is unfinished and inactive; do not deploy it.
The earlier Oracle DNS instructions are not applicable to a Wasmer deployment.

## What is prepared

- Brevo SMTP host, port 587 and sender support@hirenextai.com are set locally.
- SMTP password and login still need to be supplied locally. No email was sent.
- SMTP uses STARTTLS on 587 with certificate verification enabled.
- Transactional email senders now respect SMTP_FROM consistently.
- Google credentials exist privately; local redirect was verified, but a complete
  Google sign-in has not been verified. Public hosting and domain DNS are pending.

## Brevo domain authentication

1. In Brevo: account menu → Settings → Senders, Domains, IPs → Domains.
2. Add hirenextai.com, then select manual authentication to review the DNS records.
3. In Cloudflare: hirenextai.com → DNS → Records, copy the exact records Brevo
   displays. The values are unique to your account; examples must not be guessed.

| Purpose | Type | Name and value |
| --- | --- | --- |
| Ownership (Brevo code) | TXT | Copy both fields from Brevo |
| DKIM | CNAME or TXT, as shown | Copy all DKIM records from Brevo; CNAMEs must be DNS only |
| DMARC | TXT | Use the displayed policy at _dmarc, reviewing any existing policy first |

Keep only one DMARC record for the same name. Do not weaken an existing policy or
delete mail-provider records. Do not add a second SPF record: use only the DNS
instructions required for the actual sender/mail provider. No website A record
or Oracle IP is needed to authenticate email. Wait for DNS propagation, then
click Authenticate in Brevo and confirm the domain shows Authenticated.

4. Under Senders, create sender name HirenextAI with email support@hirenextai.com.
5. Ensure the Brevo transactional email service is activated for the account.

## Brevo SMTP credentials

Open Settings → SMTP & API → SMTP. Copy the SMTP Login shown there and generate
an SMTP key. The SMTP key is not the account password or the API key. Store these
values in the ignored backend/.env on this computer and later in hosting secrets:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR_EXACT_BREVO_SMTP_LOGIN
SMTP_PASSWORD=YOUR_BREVO_SMTP_KEY
SMTP_FROM=support@hirenextai.com
```

The login can end in @smtp-brevo.com; it must not be used as the sender address.
Do not put credentials in frontend code, GitHub, screenshots or chat. After saving,
share only the configuration file path so the backend can be restarted and checked.
Existing Hirenext HTML templates are sent through SMTP; Brevo template IDs are not
needed. Test delivery to an address you control, admin OTP, signup verification,
password reset and a support reply. An SMTP connection test alone does not prove
delivery to an inbox or successful domain authentication.

## Receiving mail

SMTP sending alone does not create a hosted mailbox. You can use a mailbox provider,
or Cloudflare Email Routing to forward support@hirenextai.com to an existing inbox:

1. Open Cloudflare Email Routing for hirenextai.com.
2. Add and verify your destination inbox.
3. If there is no existing mail provider, follow Cloudflare's required MX/TXT setup.
   Replacing existing MX records changes where all incoming domain mail is delivered.
4. Create a rule for support@hirenextai.com → that verified inbox.
5. Send a test message and confirm delivery. Replying directly from Gmail normally
   uses the Gmail sender unless a separate Send mail as configuration is completed.

Forwarding does not automatically import messages into Hirenext's admin inbox.
That needs a separately authenticated inbound-mail integration. Brevo also has
mailbox connection features, but connecting an existing mailbox is separate from
SMTP delivery for this website.

## Wasmer hosting decision and remaining work

Wasmer documents managed MySQL and PostgreSQL. Choose MySQL for this codebase to
avoid the PostgreSQL conversion. Confirm the current plan, database availability,
limits, backup facilities and price in the dashboard before creating resources.

Wasmer's Node support is beta. This repository is not yet tested on its runtime.
Do not assume that importing the React frontend publishes the Express backend.
Before production:

- Test Express, bcrypt, mysql2, TLS and outbound Brevo SMTP on a staging Wasmer app.
- Map the injected DB_USERNAME to the application's DB_USER, or add a tested alias.
  Use the injected DB_PORT; do not assume 3306. Obtain the provider's trusted CA
  for verified database TLS; do not disable verification merely to pass a check.
- Build frontend/dist and serve it with backend/server.js. Configure the assigned
  HTTP port/listen host and same-origin /api routing for Wasmer.
- Move OAuth state/exchange codes and security rate-limit counters from process
  memory into a shared durable store with atomic single-use handling. Otherwise
  autoscaling or idle shutdown can break sign-in and weaken rate limits.
- Move scheduled emails/provider checks to a reliable job mechanism with locking
  and retries. Process timers alone are not reliable in short-lived instances.
- Import approved MySQL data with a backup and validate sessions, permissions,
  account isolation, subscription expiry and idempotent payment handling.
- Keep the existing site local until the staging checks pass.

In the Wasmer app dashboard → Domains, add hirenextai.com and www.hirenextai.com.
Use the exact DNS and verification records displayed there in Cloudflare; their
values cannot be determined before the app is created. Do not use an Oracle IP.
Keep Cloudflare nameservers; do not move the domain's DNS without preserving mail
records. Redirect www to the apex after Wasmer's domain/HTTPS checks pass.

Production backend settings remain:

```dotenv
FRONTEND_URL=https://hirenextai.com
BACKEND_URL=https://hirenextai.com
GOOGLE_CALLBACK_URL=https://hirenextai.com/api/auth/google/callback
```

Google authorised JavaScript origin: https://hirenextai.com

Google authorised redirect URI: https://hirenextai.com/api/auth/google/callback

Still required: chosen Wasmer app/plan, staging deployment access, managed MySQL
configuration, Brevo domain verification and private SMTP credentials, real AI
provider key, and Razorpay credentials/webhook setup if paid plans will launch.
Previously shared credentials should be rotated before public deployment.

## Sources checked

- https://docs.wasmer.io/edge/learn/databases/
- https://docs.wasmer.io/edge/learn/apps/
- https://wasmer.io/posts/nodejs-support-in-wasmer-edge-beta
- https://docs.wasmer.io/edge/learn/custom-domains/
- https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP
- https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC
- https://developers.cloudflare.com/email-service/get-started/route-emails/
