const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logSecurityEvent } = require('../services/securityLogger');
const { getRealIp, getOSFromUA, getGeoLocation } = require('../utils/ipHelper');

const getBrowserFromUA = (uaString) => {
  if (!uaString) return 'Unknown';
  const ua = uaString.toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('chrome') && !ua.includes('chromium')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge') || ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Chrome';
};

const getActionDescription = (method, path) => {
  const p = path.toLowerCase();
  if (p.includes('/stats')) return 'Viewed Dashboard Stats';
  if (p.includes('/users') && method === 'GET') return 'Viewed Users List';
  if (p.includes('/users') && p.includes('/suspend')) return 'Suspended User';
  if (p.includes('/users') && p.includes('/upgrade')) return 'Upgraded User Plan';
  if (p.includes('/applications') && method === 'GET') return 'Viewed Applications';
  if (p.includes('/applications') && method === 'PUT') return 'Updated Application Status';
  if (p.includes('/messages') && method === 'GET') return 'Viewed Messages';
  if (p.includes('/messages') && p.includes('/reply')) return 'Replied to Message';
  if (p.includes('/emails') && method === 'GET') return 'Viewed Emails';
  if (p.includes('/emails/compose')) return 'Composed Email';
  if (p.includes('/emails/draft')) return 'Saved Email Draft';
  if (p.includes('/emails/schedule')) return 'Scheduled Email';
  if (p.includes('/announcement/send')) return 'Sent Announcement';
  if (p.includes('/activity-log')) return 'Viewed Activity Logs';
  if (p.includes('/admins') && method === 'GET') return 'Viewed Admins List';
  if (p.includes('/create-admin')) return 'Created Administrator';
  if (p.includes('/permissions')) return 'Modified Admin Permissions';
  if (p.includes('/reset-permissions')) return 'Reset Admin Permissions';
  if (p.includes('/suspend') && p.includes('/admins')) return 'Suspended Admin';
  if (p.includes('/force-logout')) return 'Force Logged Out Admin';
  if (p.includes('/api-keys') && method === 'POST') return 'Added AI API Key';
  if (p.includes('/api-keys') && method === 'DELETE') return 'Deleted AI API Key';
  return `${method} ${path}`;
};

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded.user?.id || decoded.id;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Fetch user from DB with ipAddress and device
    const [rows] = await pool.query(
      'SELECT id, firstName, lastName, email, role, isSuspended, adminPermissions, tokenVersion, ipAddress, device FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Access denied. Account is suspended.' });
    }

    // Enforce tokenVersion check for force logout
    if (!Number.isInteger(decoded.tokenVersion) || decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Force logged out by owner.' });
    }

    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    if (decoded.mfa !== true) return res.status(403).json({ error: 'Administrator email verification required' });
    req.user = user;

    // Detect browser, device, IP address and track metrics
    const currentIp = getRealIp(req);
    const currentUa = req.headers['user-agent'] || '';
    const browserName = getBrowserFromUA(currentUa);
    const osName = getOSFromUA(currentUa);
    const lastAction = getActionDescription(req.method, req.path);

    const ua = currentUa.toLowerCase();
    let currentDev = 'Desktop';
    if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
      currentDev = 'Tablet';
    } else if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) {
      currentDev = 'Mobile';
    }

    // IP change audit log
    if (user.ipAddress && user.ipAddress !== currentIp) {
      await logSecurityEvent(user.id, user.email, 'IP_CHANGE', currentIp, currentUa, `IP changed from ${user.ipAddress} to ${currentIp}`);
    }

    // Device change audit log
    if (user.device && user.device !== currentDev) {
      await logSecurityEvent(user.id, user.email, 'NEW_DEVICE', currentIp, currentUa, `Device changed from ${user.device} to ${currentDev}`);
    }

    // Update users table with active status metrics
    await pool.query(
      `UPDATE users 
       SET lastActiveAt = NOW(), 
           lastAction = ?, 
           sessionStatus = 'online', 
           browser = ?, 
           os = ?,
           ipAddress = ?, 
           device = ? 
       WHERE id = ?`,
      [lastAction, browserName, osName, currentIp, currentDev, user.id]
    ).catch(err => console.error('Failed to update admin metrics in middleware:', err.message));

    // Resolve IP geolocation in the background to prevent response blocking
    getGeoLocation(currentIp).then((geo) => {
      pool.query(
        'UPDATE users SET country = ?, city = ? WHERE id = ?',
        [geo.country, geo.city, user.id]
      ).catch(() => {});
    }).catch(() => {});

    // Owner has bypass to everything
    if (req.path === '/session') return next();
    if (user.role === 'owner') {
      return next();
    }

    // Determine required permission based on request path
    const path = req.baseUrl + req.path; // e.g. "/api/admin/stats" or "/api/admin/users"
    const relativePath = req.path.toLowerCase(); // e.g. "/stats" or "/users"
    let requiredPermission = null;

    if (relativePath.startsWith('/alerts')) {
      requiredPermission = 'alerts';
    } else if (relativePath.startsWith('/stats') || relativePath.startsWith('/dashboard')) {
      requiredPermission = 'dashboard';
    } else if (relativePath.startsWith('/users')) {
      requiredPermission = 'users';
    } else if (relativePath.startsWith('/applications')) {
      requiredPermission = 'applications';
    } else if (relativePath.startsWith('/announcement')) {
      requiredPermission = 'announcements';
    } else if (relativePath.startsWith('/analytics')) {
      requiredPermission = 'analytics';
    } else if (relativePath.startsWith('/revenue')) {
      requiredPermission = 'revenue';
    } else if (relativePath.startsWith('/messages')) {
      requiredPermission = 'messages';
    } else if (relativePath.startsWith('/emails')) {
      requiredPermission = 'email_center';
    } else if (relativePath.startsWith('/activity-log') || relativePath.startsWith('/logs')) {
      requiredPermission = 'logs';
    } else if (
      relativePath.startsWith('/admins') ||
      relativePath.startsWith('/create-admin') ||
      relativePath.startsWith('/suspend-admin')
    ) {
      // Admin management is owner-only
      return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
    }

    if (!requiredPermission) return res.status(403).json({ error: 'Owner privileges required for this operation' });
    if (requiredPermission) {
      // Parse adminPermissions JSON array
      let permissions = [];
      try {
        permissions = JSON.parse(user.adminPermissions || '[]');
      } catch (e) {
        permissions = [];
      }

      // Support case insensitivity and mapping array
      const normalizedPermissions = permissions.map(p => String(p).toLowerCase().trim().replace(' ', '_'));
      
      // Match dashboard, applications, users, analytics, revenue, announcements, messages, email_center, logs
      let matchedPerm = requiredPermission;
      if (matchedPerm === 'email_center') matchedPerm = 'email center'; // UI labels might store it as "email center" or "email_center"
      
      let operation = req.method === 'GET' ? (['messages', 'email_center'].includes(requiredPermission) ? 'read' : 'view') : null;
      if (requiredPermission === 'users') operation = req.method === 'GET' ? 'view' : req.method === 'DELETE' ? 'delete' : relativePath.endsWith('/suspend') ? 'suspend' : 'upgrade';
      if (requiredPermission === 'applications' && req.method !== 'GET') operation = req.body?.status === 'approved' ? 'approve' : 'edit';
      if (requiredPermission === 'messages' && req.method !== 'GET') operation = 'reply';
      if (requiredPermission === 'email_center' && req.method !== 'GET') operation = req.method === 'DELETE' ? 'delete' : 'send';
      if (requiredPermission === 'announcements' && req.method !== 'GET') operation = 'send';
      const granular = operation ? `${requiredPermission}_${operation}` : null;
      const hasPermission = permissions.some(p => {
        const norm = String(p).toLowerCase().trim();
        return (granular && norm === granular) || norm === requiredPermission || norm === matchedPerm || norm.replace(' ', '_') === requiredPermission;
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: `Access denied. Missing required permission: ${requiredPermission}`
        });
      }
    }

    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
