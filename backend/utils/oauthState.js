const crypto = require('crypto');
const pending = new Map();

function begin(req, res, provider, data = {}) {
  for (const [key, item] of pending) if (item.expires < Date.now()) pending.delete(key);
  if (pending.size >= 1000) throw new Error('Too many pending sign-ins');
  const state = crypto.randomBytes(32).toString('hex');
  pending.set(state, { provider, data, expires: Date.now() + 600000 });
  res.cookie(`oauth_${provider}`, state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/api/auth', maxAge: 600000,
  });
  return state;
}

function consume(req, res, provider) {
  const state = req.query.state;
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim())
    .find(v => v.startsWith(`oauth_${provider}=`))?.split('=')[1];
  const item = typeof state === 'string' ? pending.get(state) : null;
  if (!item || item.provider !== provider || item.expires < Date.now() || cookie !== state) return null;
  pending.delete(state);
  res.clearCookie(`oauth_${provider}`, { path: '/api/auth' });
  return item.data;
}

module.exports = { begin, consume };
