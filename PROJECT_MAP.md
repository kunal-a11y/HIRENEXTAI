# HirenextAI project map

Reviewed on 2026-10-09 after importing `kunal-a11y/HirenextAI`, branch `main`, commit `fe01418`.

## Subsequent change

At the user's request, the standalone `extension/` directory (15 files) was removed from the local project. The website's `frontend/src/pages/Extension.jsx` download page and all other website code were preserved. Its route remains disabled as it was at import. Backend extension endpoints were retained. The review below describes the original imported architecture; extension file references are historical and recoverable from Git history.

## Product and architecture

HirenextAI is a career assistant combining a web dashboard, an Express API backed by MySQL, and a Manifest V3 Chrome extension. Its code covers career chat, resume feedback, job discovery, application tracking, document generation, mock interviews, subscriptions, and administration.

| Area | Main entry points | Responsibility |
| --- | --- | --- |
| Web app | `frontend/src/main.jsx`, `frontend/src/App.jsx` | React 19, React Router, Vite, Tailwind, Zustand; public pages, login, dashboard, admin routes |
| API client | `frontend/src/lib/api.js` | Axios, bearer-token injection, authentication error handling |
| API server | `backend/server.js` | Configuration, schema initialization, middleware, route mounting, scheduled work, serving the built frontend |
| Authentication | `backend/controllers/authController.js`, `backend/middleware/auth.js` | Signup/login, verification, password recovery, JWT validation and account checks |
| AI | `backend/routes/ai.js`, `backend/services/geminiService.js` | Career prompts, chat, resume/document tasks, structured responses |
| AI providers | `backend/services/apiPoolManager.js`, `backend/services/aiProviderService.js` | Database-backed encrypted keys, rotation, usage and provider calls |
| Jobs | `backend/providers/ProviderManager.js`, `backend/services/jobCache.js` | Provider priority/failover, normalization and caching |
| Interviews | `backend/routes/interviewRoutes.js`, `frontend/src/lib/interviewService.js` | Question generation, answer evaluation and saved history |
| Payments | `backend/controllers/paymentController.js` | Razorpay order and payment flows |
| Browser extension | `extension/manifest.json`, `background.js`, `content.js`, `overlay.js`, `sidebar/` | Job-page extraction, sidebar, API proxy and application assistance |
| Database | `backend/config/db.js`, `backend/server.js`, `database/` | MySQL pool, tables, schema changes and seed data |

## Main flows

1. **Login:** the frontend authentication store calls `/api/auth/*`, saves the token and user in browser storage, and attaches the token to subsequent API calls. Backend middleware verifies it and checks suspension and token version.
2. **Career chat:** `useChatStore.js` calls `/api/ai/chat` with the selected model and user context. The API applies authentication and credit checks, then calls `geminiService.js`. Despite its name, that service uses the API-key pool and universal provider adapter. The frontend interprets structured JSON response blocks as job cards and resume feedback.
3. **Job search:** provider configuration comes from MySQL. The manager tries JSearch, Adzuna, Remotive or Arbeitnow in priority order and records provider health. Free-provider fallbacks exist when configuration cannot be loaded.
4. **Applications:** the web application fetches `/api/applications`, with a browser-storage fallback. The extension has its own authenticated application endpoints under `/api/extension`.
5. **Documents and resumes:** web-generated files use `useFilesStore.js` and local storage; the extension also has database-backed document and resume endpoints. These are distinct persistence paths and should not be assumed to synchronize automatically.
6. **Extension:** content scripts and the overlay run on supported job sites. The background worker proxies requests using the stored JWT and configured backend URL; the sidebar provides resume, analysis and document tools.

## Important implementation details

- The current dependency manifest uses React **19**, although the README says React 18.
- AI integrations include Gemini, Claude and OpenAI-compatible providers such as OpenAI, DeepSeek, Grok, OpenRouter and custom endpoints. Their presence in source does not establish that live credentials are configured.
- There are two chat API paths: the current frontend uses `/api/ai/chat`; a separate `/api/chat` controller stores messages in MySQL. Web chat history also uses browser storage. Trace the specific path before changing persistence.
- The `/extension` website route is disabled by `ENABLE_EXTENSION = false` in `App.jsx`, while extension source and API routes remain present.
- Several similarly named pages coexist, including JSX/TSX versions. Follow the actual imports and resolver behavior before selecting a file to edit.
- Database initialization in `server.js` contains more tables than `database/schema.sql`; the SQL file alone is not a complete representation of the running schema.
- Server startup includes database changes, initial data updates, and background email/provider work. Use a dedicated development database for local development.

## Local setup gaps to resolve before running

- No backend environment file was included in the clone. Startup validation requires database, JWT, Gemini, SMTP, port, frontend URL and environment values.
- The README shows `SMTP_PASS`, but the validator and email service use `SMTP_PASSWORD`. The validator also requires `SMTP_FROM` or `FROM_EMAIL` and `NODE_ENV`.
- The frontend API client defaults to `https://hirenextai.com/api`. For a local setup, explicitly configure `VITE_API_URL=/api` and align the backend port with Vite's proxy, currently `http://localhost:5000`.
- Vite serves the frontend on port 3003. The README example uses backend port 34138, while the server fallback is 3003. Explicit configuration is necessary to avoid mismatches or collisions.
- The extension development backend defaults to port 3003, and its manifest host permissions do not list localhost. Its development connection needs separate verification.
- The backend `npm test` script is a placeholder that exits with an error. There are standalone test scripts, but they are not an established automated suite and some initialize services.

## Validation performed

- Repository cloned successfully with Git history and origin preserved.
- Source-level review of routing, state/storage, authentication, AI dispatch, provider orchestration, extension communication and startup configuration.
- `node --check` passed for all **62** JavaScript files under `backend`, `extension` and `database`, using Node 24.16.0.
- Dependencies were not installed, and no frontend build or end-to-end execution was performed. Database connectivity, live AI, payments, email and browser-extension behavior remain unverified.
- No application source was changed during this review; this map is the only added document.
