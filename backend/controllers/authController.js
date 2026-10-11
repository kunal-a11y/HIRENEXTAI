const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { logSecurityEvent, logVerificationEvent } = require('../services/securityLogger');
const { getRealIp } = require('../utils/ipHelper');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function saveAuthToken(userId, type, token, expiresAt) {
  if (pool.dialect !== 'postgres') await pool.query(`CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    tokenHash CHAR(64) NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT NOW(),
    UNIQUE KEY unique_auth_token (tokenHash),
    INDEX idx_auth_tokens_user_type (userId, type)
  )`);
  await pool.query('DELETE FROM auth_tokens WHERE userId = ? AND type = ?', [userId, type]);
  await pool.query(
    'INSERT INTO auth_tokens (userId, type, tokenHash, expiresAt) VALUES (?, ?, ?, ?)',
    [userId, type, hashToken(token), new Date(expiresAt)]
  );
}

async function findAuthToken(type, token) {
  const [rows] = await pool.query(
    `SELECT userId FROM auth_tokens
     WHERE type = ? AND tokenHash = ? AND expiresAt > NOW()
     LIMIT 1`,
    [type, hashToken(token)]
  );
  return rows[0]?.userId || null;
}

async function deleteAuthToken(type, userId) {
  await pool.query('DELETE FROM auth_tokens WHERE type = ? AND userId = ?', [type, userId]);
}

async function consumePasswordReset(token, passwordHash) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT id, userId FROM auth_tokens WHERE type = 'password_reset' AND tokenHash = ? AND expiresAt > NOW() FOR UPDATE",
      [hashToken(token)]
    );
    if (!rows.length) { await connection.rollback(); return false; }
    await connection.query('UPDATE users SET passwordHash = ?, tokenVersion = COALESCE(tokenVersion, 1) + 1 WHERE id = ?', [passwordHash, rows[0].userId]);
    await connection.query('DELETE FROM auth_tokens WHERE id = ?', [rows[0].id]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function signToken(userId) {
  const [rows] = await pool.query('SELECT tokenVersion, isSuspended FROM users WHERE id = ?', [userId]);
  if (!rows[0] || rows[0].isSuspended || !Number.isInteger(rows[0].tokenVersion)) throw new Error('Invalid account session');
  const tokenVersion = rows[0].tokenVersion;
  return jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function formatUser(row) {
  return {
    id: row.id,
    name: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : (row.firstName || row.lastName || 'User'),
    email: row.email,
    plan: row.plan || 'free',
    planExpiresAt: row.planExpiresAt || null,
    country: 'IN',
    interfaceLanguage: 'English',
    aiLanguage: 'English',
    emailVerified: Boolean(row.isVerified),
    role: row.role || 'user',
    phone: row.phone || null,
    linkedinUrl: row.linkedinUrl || null,
    indeedUrl: row.indeedUrl || null,
    naukriUrl: row.naukriUrl || null,
    githubUrl: row.githubUrl || null
  };
}

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.length > 200) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!isValidEmail(email) || email.length > 254 || email.trim().toLowerCase().endsWith('@phone.hirenextai.com')) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Password must be between 8 and 72 bytes' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if users table exists, create it if missing
    try {
      await pool.query('SELECT 1 FROM users LIMIT 1');
    } catch (tableErr) {
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.message.includes("doesn't exist")) {
        console.warn('⚠️ users table does not exist on signup request, creating it now...');
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          firstName VARCHAR(100),
          lastName VARCHAR(100),
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20),
          passwordHash VARCHAR(255),
          plan VARCHAR(50) DEFAULT 'free',
          role VARCHAR(50) DEFAULT 'user',
          isVerified BOOLEAN DEFAULT false,
          linkedinUrl VARCHAR(500),
          indeedUrl VARCHAR(500),
          naukriUrl VARCHAR(500),
          githubUrl VARCHAR(500),
          lastLoginAt DATETIME,
          createdAt DATETIME DEFAULT NOW(),
          updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW()
        )`);
      } else {
        throw tableErr;
      }
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nameParts = String(name).trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const [result] = await pool.query(
      `INSERT INTO users (firstName, lastName, email, passwordHash, plan, role, isVerified)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [firstName, lastName, normalizedEmail, hashedPassword, 'free', 'user']
    );

    const userId = result.insertId;

    // Generate email verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 24 * 3600 * 1000;
    await saveAuthToken(userId, 'email_verification', verificationToken, expires);

    Promise.allSettled([
      sendWelcomeEmail({
        firstName,
        email: normalizedEmail,
      }),
      sendVerificationEmail({
        firstName,
        email: normalizedEmail,
        token: verificationToken,
      })
    ]).then((results) => results.forEach((result) => {
      if (result.status === 'rejected') console.error('Signup email failed:', result.reason?.message);
    }));

    const token = await signToken(userId);

    res.status(201).json({
      token,
      user: {
        id: userId,
        name: String(name).trim(),
        email: normalizedEmail,
        plan: 'free',
        emailVerified: false,
        role: 'user'
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Could not create account right now. Please try again shortly.'
        : `Database failed: ${err.message}`
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.query('SELECT id, firstName, lastName, email, passwordHash, plan, planExpiresAt, role, tokenVersion, isVerified, isSuspended, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl, createdAt FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      const ip = getRealIp(req);
      const ua = req.headers['user-agent'] || '';
      await logSecurityEvent(null, normalizedEmail, 'FAILED_LOGIN', ip, ua, 'Email not registered');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.passwordHash) {
      const ip = getRealIp(req);
      const ua = req.headers['user-agent'] || '';
      await logSecurityEvent(user.id, user.email, 'FAILED_LOGIN', ip, ua, 'Google login account, password not set');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const ip = getRealIp(req);
      const ua = req.headers['user-agent'] || '';
      await logSecurityEvent(user.id, user.email, 'FAILED_LOGIN', ip, ua, 'Incorrect password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });

    // Force 2FA OTP verification for admin/owner users
    if (user.role === 'admin' || user.role === 'owner') {
      if (!require('../config/mailTransport').configured) return res.status(503).json({ error: 'Admin email verification is not configured. Please contact the site owner.' });
      const otp = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      const hashed = crypto.createHash('sha256').update(otp).digest('hex');

      // Send email using SMTP Queue
      const emailQueue = require('../services/emailQueue');
      await emailQueue.addJob({
        recipient: normalizedEmail,
        templateName: 'OTP Email',
        payload: { otp }
      });

      // Update in DB
      await pool.query(
        'UPDATE users SET otpCode = ?, otpExpiresAt = ? WHERE id = ?',
        [hashed, expiresAt, user.id]
      );

      // Log security & verification success events
      const ip = getRealIp(req);
      const ua = req.headers['user-agent'] || '';
      await logSecurityEvent(user.id, user.email, 'OTP_REQUEST', ip, ua, 'Requested admin login 2FA OTP');
      await logVerificationEvent(user.id, user.email, otp, 'SENT', ip, ua);

      require('../utils/adminChallenge').issue(res, user);
      return res.json({
        requiresOTP: true,
        email: user.email,
        message: '2FA OTP Verification required. A code has been sent to your email.'
      });
    }

    // Update lastLoginAt
    try {
      await pool.query('UPDATE users SET lastLoginAt = NOW() WHERE id = ?', [user.id]);
    } catch (dbErr) {
      console.warn('Could not update lastLoginAt:', dbErr.message);
    }

    const token = await signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || 'User'),
        email: user.email,
        plan: user.plan || 'free',
        emailVerified: Boolean(user.isVerified),
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const [rows] = await pool.query(
      `SELECT id, firstName, lastName, email, plan, planExpiresAt, isVerified, role, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl
       FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(formatUser(rows[0]));
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const name = payload?.name || payload?.given_name || 'User';

    if (!email || payload.email_verified !== true) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const [rows] = await pool.query('SELECT id, firstName, lastName, email, plan, planExpiresAt, role, isVerified, isSuspended, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl FROM users WHERE email = ?', [email]);
    let user = rows[0];

    if (!user) {
      const nameParts = String(name).trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const [result] = await pool.query(
        `INSERT INTO users (firstName, lastName, email, plan, role, isVerified)
         VALUES (?, ?, ?, 'free', 'user', TRUE)`,
        [firstName, lastName, email]
      );
      user = {
        id: result.insertId,
        firstName,
        lastName,
        email,
        plan: 'free',
        role: 'user',
        isVerified: true
      };
    }

    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });
    if (['admin', 'owner'].includes(user.role)) return res.status(403).json({ error: 'Administrators must sign in with password and email verification.' });
    const token = await signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || 'User'),
        email: user.email,
        plan: user.plan || 'free'
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
};

exports.updateLanguage = async (req, res) => {
  // Gracefully return success as language customization is kept client-side or handled in-memory
  res.json({ message: 'Language updated successfully' });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const [rows] = await pool.query('SELECT passwordHash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Password sign-in not set up for this account' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET passwordHash = ?, tokenVersion = COALESCE(tokenVersion, 1) + 1 WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id, firstName, lastName FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.json({ message: 'Reset link sent to your email' });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour token expiry
    await saveAuthToken(user.id, 'password_reset', token, expires);

    sendPasswordResetEmail({
        firstName: user.firstName || 'there',
        email: normalizedEmail, 
        token: token 
      })
      .then(() => console.log('Password reset email sent to:', normalizedEmail))
      .catch((e) => console.error('Password reset email failed:', e.message));

    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    if (!await consumePasswordReset(token, hashedPassword)) {
      return res.status(400).json({ error: 'Link expired or invalid' });
    }

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const foundUserId = await findAuthToken('email_verification', token);

    if (!foundUserId) {
      return res.status(400).json({ error: 'Verification link expired or invalid' });
    }

    await pool.query(
      'UPDATE users SET isVerified = TRUE, verificationStatus = "Verified", verifiedAt = NOW() WHERE id = ?',
      [foundUserId]
    );

    await deleteAuthToken('email_verification', foundUserId);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const [rows] = await pool.query('SELECT firstName, email, isVerified FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 24 * 3600000;
    await saveAuthToken(userId, 'email_verification', verificationToken, expires);

    sendVerificationEmail({
        firstName: user.firstName || 'there',
        email: user.email, 
        token: verificationToken 
      })
      .then(() => console.log('Verification email sent to:', user.email))
      .catch((e) => console.error('Verification email failed:', e.message));

    res.json({ message: 'Verification email sent successfully' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// In-memory store for OTPs
const phoneOtps = new Map();

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    
    // Hash the OTP before storing it in the map
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    phoneOtps.set(phone, {
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (apiKey) {
      try {
        const cleanPhone = phone.replace(/\D/g, "");
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: cleanPhone
          })
        });
        const responseData = await response.json();
        console.log('Fast2SMS response status:', response.status);
      } catch (smsErr) {
        console.error('Fast2SMS send error:', smsErr.message);
      }
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const record = phoneOtps.get(phone);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > record.expiresAt) {
      phoneOtps.delete(phone);
      return res.status(400).json({ success: false, message: 'OTP expired. Please resend.' });
    }

    const incomingHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (record.otp !== incomingHash) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    phoneOtps.delete(phone);

    let user;
    const email = `${phone.replace(/\D/g, "") || 'phone'}@phone.hirenextai.com`;
    const [rows] = await pool.query('SELECT id, firstName, lastName, email, plan, planExpiresAt, role, isVerified FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      user = formatUser(rows[0]);
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (firstName, lastName, email, plan, role, isVerified)
         VALUES ('Phone', 'User', ?, 'free', 'user', TRUE)`,
        [email]
      );
      user = {
        id: result.insertId,
        name: 'Phone User',
        email,
        plan: 'free',
        role: 'user'
      };
    }

    const token = await signToken(user.id);

    res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
