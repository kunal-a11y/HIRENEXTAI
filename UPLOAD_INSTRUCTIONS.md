# HirenextAI Upload Instructions

## Website files

Upload the **contents** of `frontend/dist/` into the website's public web folder
(`public_html`, `htdocs`, or equivalent). Keep the included `.htaccess` file.

## Backend files

Upload `backend/` outside the public web folder, install production dependencies,
and run `node server.js` with Node.js 20 or newer. Configure the web server so
requests to `https://hirenextai.com/api/*` are forwarded to backend port `5000`.

## Required hosting checks

- MySQL must allow connections from the backend server.
- Google OAuth must allow this redirect URI:
  `https://hirenextai.com/api/auth/google/callback`
- The backend must be able to send email through the configured SMTP account.
- Load the `extension/` folder in Chrome. Its stable extension ID is:
  `iehkcenmfjjafddndbmgbkcgomfnkmen`
