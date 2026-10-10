# HirenextAI Deployment Guide

## Pre-deploy
- [ ] Set all .env.production values
- [ ] Run: npm run build in frontend/
- [ ] Run: node database/seed.js to init DB
- [ ] Test all API endpoints
- [ ] Verify GEMINI_API_KEY works

## Deploy Steps
1. Upload dist/ folder contents to ReaverHosting File Manager public_html/
2. Upload backend/ to server via SSH/SFTP
3. Run: npm install --production in backend/
4. Set NODE_ENV=production in server environment
5. Start backend: node server.js or use PM2

## Post-deploy verification
- [ ] Visit https://hirenextai.com — landing page loads
- [ ] Register new account — welcome email arrives
- [ ] Login — chat works with Gemini AI
- [ ] Contact form — email arrives at support@hirenextai.com
- [ ] Admin panel — /admin with PIN works
- [ ] Voice features — work on HTTPS
