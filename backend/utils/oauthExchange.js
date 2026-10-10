const crypto = require('crypto');
const pending = new Map();
const cookieName = 'hn_oauth_exchange';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 60000 });
function issue(res, token) {
  for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
  const code = crypto.randomBytes(32).toString('hex');
  const binding = crypto.randomBytes(32).toString('hex');
  pending.set(code, { token, binding, expires: Date.now() + 60000 });
  res.cookie(cookieName, binding, cookieOptions());
  return code;
}
function exchange(req, res) {
  res.set('Cache-Control', 'no-store');
  const code = req.body?.code;
  const binding = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const entry = typeof code === 'string' ? pending.get(code) : null;
  if (!entry || entry.expires < Date.now() || !binding || binding !== entry.binding) return res.status(400).json({ error: 'Sign-in expired. Please try again.' });
  pending.delete(code);
  res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
  return res.json({ token: entry.token });
}
module.exports = { issue, exchange };
