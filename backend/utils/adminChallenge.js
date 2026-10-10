const jwt = require('jsonwebtoken');
const name = 'hn_admin_challenge';
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/admin', maxAge: 10 * 60 * 1000 });
function issue(res, user) {
  const token = jwt.sign({ id: user.id, email: user.email, tokenVersion: user.tokenVersion, purpose: 'admin-otp' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
  res.cookie(name, token, options());
}
function requireChallenge(req, res, next) {
  const token = String(req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(name + '='))?.slice(name.length + 1);
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (claims.purpose !== 'admin-otp' || !Number.isInteger(claims.id) || !Number.isInteger(claims.tokenVersion) || claims.email !== String(req.body?.email || '').trim().toLowerCase()) throw new Error('Invalid challenge');
    req.adminChallenge = claims;
    next();
  } catch { res.status(401).json({ error: 'Please sign in with your password or Google before verifying your admin email.' }); }
}
function clear(res) { res.clearCookie(name, { ...options(), maxAge: undefined }); }
module.exports = { issue, requireChallenge, clear };
