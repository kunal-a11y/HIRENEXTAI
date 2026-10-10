<div align="center">

# 🚀 HirenextAI

### The AI Career Operating System

**Your intelligent career companion — powered by AI, built for job seekers.**

[![License](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-black.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18-black.svg)](https://reactjs.org)
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-black.svg)](https://developer.chrome.com/docs/extensions/)

[Live Demo](https://hirenextai.com) · [Download Extension](#-browser-extension) · [Report Bug](https://github.com/kunal-a11y/HirenextAI/issues) · [Request Feature](https://github.com/kunal-a11y/HirenextAI/issues)

</div>

---

## What is HirenextAI?

HirenextAI is a full-stack AI-powered career platform that helps job seekers **find, analyze, apply to, and track** job applications — all from a single system. It combines a web application with a Chrome browser extension that acts as your personal AI career assistant across job platforms like LinkedIn, Indeed, Naukri, Glassdoor, Internshala, and more.

Think of it as having a career coach, resume writer, and application assistant that follows you across the web.

---

## ✨ Key Features

### 🧠 AI Career Assistant
- Natural language chat powered by Google Gemini AI
- Ask career questions, get resume advice, prepare for interviews
- Context-aware responses based on your uploaded resume and profile

### 📊 Real Job Intelligence
- Live job search across **4 real providers** — JSearch, Adzuna, Remotive, Arbeitnow
- Automatic failover between providers with health monitoring
- Smart caching (in-memory + database) for fast repeat searches
- Job match scoring against your profile

### 🔌 Browser Extension (The Core Product)
- **Floating sidebar** that appears on supported job websites
- **AI Job Analysis** — analyzes any job listing against your resume with a detailed match score breakdown (skills, experience, location, education, salary)
- **Resume Intelligence** — upload, create with AI, analyze ATS compatibility
- **Document Generator** — cover letters, recruiter messages, and application answers generated in seconds
- **Application Tracker** — automatically logs every application with status tracking
- **Apply with AI** — automated form filling on job application pages

### 🌐 Supported Job Platforms
LinkedIn · Indeed · Naukri · Glassdoor · Internshala · Wellfound · RemoteOK · Remotive · Arbeitnow · Foundit

### 🔐 Enterprise Security
- JWT authentication with encrypted token storage
- API key encryption at rest (AES-256)
- Rate limiting and brute-force protection
- Admin panel with role-based access (Owner → Admin → Moderator)
- CORS protection with extension origin allowlisting

---

## 🏗️ Architecture

```
HirenextAI/
├── backend/                    # Express.js API Server
│   ├── config/                 # Database & environment config
│   ├── controllers/            # Route handlers (auth, chat, jobs, payments)
│   ├── middleware/              # Auth, admin, rate limiting
│   ├── providers/              # Job search provider engine
│   │   ├── ProviderManager.js  # Automatic failover orchestrator
│   │   ├── JSearchProvider.js  # RapidAPI JSearch
│   │   ├── AdzunaProvider.js   # Adzuna job search
│   │   ├── RemotiveProvider.js # Remotive remote jobs
│   │   └── ArbeitnowProvider.js# Arbeitnow EU jobs
│   ├── routes/                 # API route definitions
│   │   ├── extensionRoutes.js  # Extension-specific API (analyze, docs, resume)
│   │   └── jobProviderRoutes.js# Admin provider management
│   ├── services/               # Business logic (AI, email, cache, security)
│   └── server.js               # Main entry point with health checks
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── pages/              # Landing, Auth, Admin, Chat, Applications
│   │   ├── components/         # Reusable UI (chat, modals, layout)
│   │   ├── store/              # Zustand state management
│   │   └── lib/                # API client, utilities
│   └── tailwind.config.js
│
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json           # Permissions & content script config
│   ├── background.js           # Service worker (API proxy, auth)
│   ├── content.js              # Job scraping engine (10+ platforms)
│   ├── overlay.js              # Sidebar toggle & AI apply overlay
│   ├── overlay.css             # Overlay styles
│   ├── sidebar/                # Sidebar UI (injected iframe)
│   │   ├── sidebar.html        # Tab-based dashboard
│   │   ├── sidebar.css         # Premium styling
│   │   └── sidebar.js          # Full application logic
│   └── popup/                  # Extension popup
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
│
└── database/                   # SQL schema & migrations
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 5.7+ or MariaDB 10.5+
- **Google Gemini API Key** (for AI features)
- **Chrome Browser** (for extension)

### 1. Clone the Repository

```bash
git clone https://github.com/kunal-a11y/HirenextAI.git
cd HirenextAI
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=34138
NODE_PORT=34138

# Database
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Authentication
JWT_SECRET=your_strong_jwt_secret

# AI
GEMINI_API_KEY=your_gemini_api_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=your_admin_email@gmail.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:34138/api/auth/google/callback

# Job Search Providers (Optional)
JSEARCH_API_KEY=
ADZUNA_APP_ID=
ADZUNA_API_KEY=

# Payments (Optional)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Frontend URL
FRONTEND_URL=http://localhost:3003
```

Start the backend:

```bash
npm start
```

The server will auto-create all database tables, run health checks, and seed default job providers.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3003`.

### 4. Browser Extension Setup

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Visit any supported job site (LinkedIn, Indeed, Naukri, etc.)
6. Click the HirenextAI toggle button that appears

The extension auto-detects dev mode and connects to `localhost` automatically.

---

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/google` | Google OAuth |

### Extension API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extension/verify` | Verify extension session |
| POST | `/api/extension/analyze-job` | AI job analysis |
| POST | `/api/extension/generate-document` | Generate cover letter / recruiter message |
| GET | `/api/extension/resume` | Get user's resume |
| POST | `/api/extension/resume/upload` | Upload resume text |
| POST | `/api/extension/resume/create` | Create resume with AI |
| POST | `/api/extension/resume/analyze` | Analyze resume ATS score |
| GET | `/api/extension/applications` | List tracked applications |
| POST | `/api/extension/applications` | Track new application |
| GET/POST/PUT/DELETE | `/api/extension/documents` | Document CRUD |

### AI & Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI chat conversation |
| POST | `/api/ai/search-jobs` | Search real jobs |
| GET | `/api/jobs/search` | Job search with caching |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/job-providers` | List job providers |
| PUT | `/api/job-providers/:name` | Update provider config |
| POST | `/api/job-providers/:name/test` | Test provider connectivity |
| GET | `/api/job-providers/stats` | Provider statistics |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Framer Motion |
| **Backend** | Node.js, Express.js, MySQL2, JWT, Nodemailer |
| **AI Engine** | Google Gemini API |
| **Extension** | Chrome Manifest V3, Vanilla JS, Service Workers |
| **Job Providers** | JSearch (RapidAPI), Adzuna, Remotive, Arbeitnow |
| **Payments** | Razorpay |
| **Auth** | JWT, Google OAuth 2.0, LinkedIn OAuth |

---

## 🌍 Deployment

### Backend (Render / Railway / VPS)

```bash
cd backend
npm install --production
NODE_ENV=production node server.js
```

### Frontend (Vercel / Netlify)

```bash
cd frontend
npm run build
# Deploy the dist/ folder
```

Set `VITE_API_URL` to your production backend URL (e.g., `https://api.hirenextai.com`).

### Extension (Chrome Web Store)

1. Remove dev-only permissions from `manifest.json`
2. Zip the `extension/` folder
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Kunal** — [@kunal-a11y](https://github.com/kunal-a11y)

Built with ❤️ and AI.

---

<div align="center">

**⭐ Star this repo if you found it useful!**

</div>
