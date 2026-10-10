const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const base = 'http://127.0.0.1:5000/api';
const email = `updates-test-${crypto.randomBytes(6).toString('hex')}@example.invalid`;
let userId; let count = 0;
const check = (actual, expected) => { assert.equal(actual, expected); count++; };
async function request(route, method = 'GET', body, token, cookie) {
  const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, data: await res.json() };
}
(async () => {
  if (process.env.NODE_ENV !== 'development' || process.env.DB_NAME !== 'hirenextai_local' || !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)) throw new Error('Only run against the disposable local development database.');
  check((await request('/updates/subscribe', 'POST', { email: '<bad>' })).status, 400);
  const saved = await request('/updates/subscribe', 'POST', { email: '  ' + email.toUpperCase() + '  ' });
  check(saved.status, 200); check(saved.data.message, 'Thank you for subscribing.');
  check((await request('/updates/subscribe', 'POST', { email })).status, 200);
  const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM update_subscribers WHERE email = ?', [email]); check(row.n, 1);
  check((await request('/admin/alerts/subscribers')).status, 401);
  const [insert] = await pool.query("INSERT INTO users (firstName, lastName, email, role, tokenVersion, adminPermissions) VALUES ('Test', 'Disposable', ?, 'user', 1, '[]')", [email]);
  userId = insert.insertId;
  const token = mfa => jwt.sign({ id: userId, tokenVersion: 1, mfa }, process.env.JWT_SECRET, { expiresIn: '5m' });
  check((await request('/admin/alerts/subscribers', 'GET', null, token(true))).status, 403);
  await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
  check((await request('/admin/alerts/subscribers', 'GET', null, token(false))).status, 403);
  check((await request('/admin/alerts/subscribers', 'GET', null, token(true))).status, 403);
  await pool.query("UPDATE users SET adminPermissions = '[\"alerts_view\"]' WHERE id = ?", [userId]);
  const list = await request('/admin/alerts/subscribers?search=' + encodeURIComponent(email), 'GET', null, token(true));
  check(list.status, 200); check(list.data.total, 1); check(list.data.subscribers[0].email, email);
  check((await request('/admin/session', 'GET', null, token(true))).data.user.role, 'admin');
  const catalog = await request('/payment/catalog'); check(catalog.status, 200); check(catalog.data.plans[1].annual, 142800);
  check((await request('/auth/exchange', 'POST', { code: 'forged' })).status, 400);
  check((await request('/admin/send-otp', 'POST', { email })).status, 401);
  check((await request('/admin/verify-otp', 'POST', { email, otp: '123456' })).status, 401);
  const challenge = jwt.sign({ id: userId, email, tokenVersion: 1, purpose: 'admin-otp' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  await pool.query('UPDATE users SET otpCode = ?, otpExpiresAt = ? WHERE id = ?', [crypto.createHash('sha256').update('123456').digest('hex'), new Date(Date.now() + 60000), userId]);
  const verified = await request('/admin/verify-otp', 'POST', { email, otp: '123456' }, null, `hn_admin_challenge=${challenge}`);
  check(verified.status, 200); check(jwt.verify(verified.data.token, process.env.JWT_SECRET).mfa, true);
  check((await request('/admin/verify-otp', 'POST', { email, otp: '123456' }, null, `hn_admin_challenge=${challenge}`)).status, 400);
  check((await request('/payment/webhook', 'POST', { event: 'payment.captured' })).status, 503);
  console.log(`${count} update, admin, billing and OAuth integration checks passed.`);
})().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => {
  if (userId) { await pool.query('DELETE FROM security_logs WHERE userId = ?', [userId]).catch(() => {}); await pool.query('DELETE FROM users WHERE id = ?', [userId]); }
  await pool.query('DELETE FROM update_subscribers WHERE email = ?', [email]);
  await pool.end();
});
