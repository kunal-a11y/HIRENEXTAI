# Local HirenextAI

Configured on 2026-10-09; UI and integration refinements verified on 2026-10-10.

| Service | Address |
| --- | --- |
| Website | http://localhost:3003 |
| API | http://127.0.0.1:5000 |
| API health | http://127.0.0.1:5000/health |
| MariaDB | 127.0.0.1:3307; database `hirenextai_local` |

All three services bind to loopback only. The website proxies `/api` to the local backend; it no longer defaults to the live production API.

## Start and stop

Run from the project folder in PowerShell:

```powershell
.\scripts\start-local.ps1
.\scripts\stop-local.ps1
```

To restart only the API after a backend edit:

```powershell
.\scripts\stop-local.ps1 -Service backend
.\scripts\start-local.ps1
```

The start script leaves existing port listeners alone. The stop script checks the saved process ID, executable and start time before stopping a process; it shuts down MariaDB through SQL so data is preserved. Logs and process records are under `.local/`. These services do not automatically start with Windows.

## Accounts and configuration

Create your own local account using the website's registration page. No shared default account or default owner password is installed. Email verification messages cannot be delivered until SMTP is configured; ordinary local signup and password login work, and the account remains email-unverified.

Random database and JWT secrets were generated and saved in ignored local files. `backend/.env` contains the app configuration; `.local/database-secrets.json` contains the portable database bootstrap credentials. Do not commit or share these files. The application database user is scoped to `hirenextai_local`; it is not the database root account.

AI, email, SMS, Google/LinkedIn OAuth and Razorpay credentials are intentionally absent. Their configuration-dependent operations remain unavailable. Administrator email verification needs a working email service and an explicitly provisioned owner account. The pricing page and payment orders now use backend/config/billingCatalog.js as their shared source. See INTEGRATION_SETUP.md to enable Google, SMTP and Razorpay, and provision the first owner.

`backend/.env.example` lists the configuration names. Vite uses port 3003 and the API uses 5000. Backend changes require restarting the API; frontend changes use Vite's hot reload.

## Portable database

MariaDB 11.8.6 was obtained from the [official MariaDB Windows package listing](https://dlm.mariadb.com/browse/mariadb_server/11.8.6/winx64-packages/). The ZIP's SHA-256 matched the vendor checksum:

```text
98cb8429841fc558fbc48e8c979c3b66c88ac506d7505a589e8ac74a039b0b21
```

The extracted runtime, data, and bootstrap helpers are in `.local/` and are deliberately not included in Git. The start script uses this machine's prepared database; a fresh checkout on another machine needs Node dependencies, a fresh MySQL/MariaDB database and its own `.env` secrets. Do not run `database/seed.js` to initialize real data: it is a destructive demonstration seed guarded behind an explicit local opt-in.

## Checks

```powershell
cd backend
npm test
node tests/updates-smoke.cjs
node tests/local-smoke.cjs
cd ../frontend
npm run build
```

The local smoke test refuses non-local/non-development database settings, creates a temporary account and removes that account afterward. It deliberately exercises login rate limiting; restart the API after running it to clear the test limiter state before using the website.

The Chrome extension source remains removed. The website extension page is preserved with its original disabled route.
