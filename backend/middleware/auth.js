const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];



  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.purpose) return res.status(401).json({ error: 'A completed sign-in session is required' });
    req.user = decoded.user || decoded;
    if (!Number.isInteger(req.user?.id) || req.user.id <= 0) return res.status(401).json({ error: 'Invalid token structure' });

    if (req.user && req.user.id) {
      // Retrieve current tokenVersion from DB
      const [userRows] = await pool.query('SELECT tokenVersion, isSuspended FROM users WHERE id = ?', [req.user.id]);
      if (userRows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      const user = userRows[0];
      if (user.isSuspended) {
        return res.status(403).json({ error: 'Access denied. Account is suspended.' });
      }
      
      // Enforce tokenVersion check if present in decoded token
      if (!Number.isInteger(decoded.tokenVersion) || decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({ error: 'Session invalidated. Please login again.' });
      }

      await pool.query("UPDATE users SET plan = 'free', planExpiresAt = NULL WHERE id = ? AND planExpiresAt IS NOT NULL AND planExpiresAt <= NOW()", [req.user.id]);
      const userAgent = req.headers['user-agent'];
      if (userAgent) {
        const ua = String(userAgent).toLowerCase();
        let dev = 'Desktop';
        if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
          dev = 'Tablet';
        } else if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) {
          dev = 'Mobile';
        }
        pool.query('UPDATE users SET device = ? WHERE id = ? AND (device IS NULL OR device != ?)', [dev, req.user.id, dev]).catch(() => {});
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticateToken;
