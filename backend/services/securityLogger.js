const pool = require('../config/db');

const logSecurityEvent = async (userId, email, action, ipAddress, userAgent, details) => {
  try {
    await pool.query(
      'INSERT INTO security_logs (userId, email, action, ipAddress, userAgent, details) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, email, action, ipAddress || null, userAgent || null, details || null]
    );

    // Alert hooks for security-sensitive events
    if (action === 'FILE_REJECTED') {
      const [rejectCount] = await pool.query(
        "SELECT COUNT(*) as count FROM security_logs WHERE action = 'FILE_REJECTED' AND (userId = ? OR email = ?) AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
        [userId, email]
      );
      if (rejectCount[0].count >= 5) {
        const { alertOwner } = require('./alertService');
        alertOwner(
          'Multiple File Upload Rejections',
          `File rejections threshold breached.\nUser/Email: ID ${userId || 'none'} / ${email || 'unknown'}\nTotal rejections in last 15 minutes: ${rejectCount[0].count}`
        ).catch(err => console.error('Alert failed:', err.message));
      }
    }

    if (action === 'AI_REQUEST_FAILED') {
      const [failCount] = await pool.query(
        "SELECT COUNT(*) as count FROM security_logs WHERE action = 'AI_REQUEST_FAILED' AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
      );
      if (failCount[0].count >= 5) {
        const { alertOwner } = require('./alertService');
        alertOwner(
          'Repeated AI Request Failures',
          `AI request failures threshold breached.\nTotal consecutive failures in last 15 minutes: ${failCount[0].count}`
        ).catch(err => console.error('Alert failed:', err.message));
      }
    }

    if (['ADMIN_CREATED', 'ROLE_UPGRADE', 'PERMISSION_CHANGED', 'API_KEY_ADDED', 'API_KEY_DELETED'].includes(action)) {
      const { alertOwner } = require('./alertService');
      alertOwner(
        `Administrative Event: ${action}`,
        `An administrative security event has occurred.\nAction: ${action}\nDetails: ${details || 'none'}\nUser ID: ${userId || 'none'}`
      ).catch(err => console.error('Alert failed:', err.message));
    }
  } catch (err) {
    console.error('Failed to log security event:', err.message);
  }
};

const logVerificationEvent = async (userId, email, otpCode, status, ipAddress, userAgent) => {
  try {
    await pool.query(
      'INSERT INTO verification_logs (userId, email, otpCode, status, ipAddress, userAgent) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, email, '[REDACTED]', status, ipAddress || null, userAgent || null]
    );

    // Alert hook for excessive OTP requests
    if (status === 'SENT') {
      const [otpCount] = await pool.query(
        "SELECT COUNT(*) as count FROM verification_logs WHERE (email = ? OR ipAddress = ?) AND status = 'SENT' AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
        [email, ipAddress]
      );
      if (otpCount[0].count >= 5) {
        const { alertOwner } = require('./alertService');
        alertOwner(
          'Excessive OTP Requests',
          `OTP requests threshold breached.\nEmail/IP: ${email || 'unknown'} / ${ipAddress || 'unknown'}\nTotal requests in last 15 minutes: ${otpCount[0].count}`
        ).catch(err => console.error('Alert failed:', err.message));
      }
    }
  } catch (err) {
    console.error('Failed to log verification event:', err.message);
  }
};

const logLoginAudit = async ({ email, userId, browser, os, device, ipAddress, country, result }) => {
  try {
    await pool.query(
      'INSERT INTO login_audit_logs (email, userId, browser, os, device, ipAddress, country, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, userId || null, browser || null, os || null, device || null, ipAddress || null, country || null, result]
    );

    // Alert hook for brute force login attempts
    if (result === 'Failed') {
      const [failedCount] = await pool.query(
        "SELECT COUNT(*) as count FROM login_audit_logs WHERE (email = ? OR ipAddress = ?) AND result = 'Failed' AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
        [email, ipAddress]
      );
      if (failedCount[0].count >= 5) {
        const { alertOwner } = require('./alertService');
        alertOwner(
          'Brute Force Login Detected',
          `Failed login threshold breached.\nEmail/IP: ${email || 'unknown'} / ${ipAddress || 'unknown'}\nTotal attempts in last 15 minutes: ${failedCount[0].count}`
        ).catch(err => console.error('Alert failed:', err.message));
      }
    }
  } catch (err) {
    console.error('Failed to log login audit event:', err.message);
  }
};

module.exports = {
  logSecurityEvent,
  logVerificationEvent,
  logLoginAudit
};
