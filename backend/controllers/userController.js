const pool = require('../config/db');
const xss = require('xss');

const PROFILE_URL_RULES = {
  githubUrl: { hosts: ['github.com', 'www.github.com'], path: /^\/[a-zA-Z0-9-]+\/?$/, label: 'GitHub' },
  linkedinUrl: {
    hosts: ['linkedin.com', 'www.linkedin.com'],
    path: /^\/in\/[^/?#]+\/?$/i,
    label: 'LinkedIn'
  },
  indeedUrl: {
    hosts: ['indeed.com', 'www.indeed.com', 'profile.indeed.com'],
    path: /^\/.+/i,
    label: 'Indeed'
  },
  naukriUrl: {
    hosts: ['naukri.com', 'www.naukri.com', 'my.naukri.com'],
    path: /^\/.+/i,
    label: 'Naukri'
  }
};

function normalizeProfileUrl(value, field) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  
  const rule = PROFILE_URL_RULES[field];
  if (!trimmed) {
    return null;
  }

  if (!rule) return xss(trimmed);

  // If indeedUrl or naukriUrl, accept email addresses as well
  if (field === 'indeedUrl' || field === 'naukriUrl') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) {
      return xss(trimmed);
    }
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Enter a valid ${rule.label} profile URL or email.`);
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowedHost = rule.hosts.includes(host) || host.endsWith(`.${rule.hosts[0]}`);
  if (trimmed.length > 500 || parsed.username || parsed.password || !['http:', 'https:'].includes(parsed.protocol) || !isAllowedHost || !rule.path.test(parsed.pathname)) {
    throw new Error(`Enter a valid ${rule.label} profile URL.`);
  }

  parsed.hash = '';
  return xss(parsed.toString());
}

exports.updateProfile = async (req, res) => {
  try {
    let { displayName, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl } = req.body;
    const userId = req.user?.id;

    // Fetch existing user to keep displayName or other fields if not passed
    const [existingRows] = await pool.query(
      'SELECT firstName, lastName, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl FROM users WHERE id = ?', 
      [userId]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const existing = existingRows[0];

    let firstName = existing.firstName;
    let lastName = existing.lastName;

    if (displayName !== undefined) {
      if (typeof displayName === 'string') {
        displayName = xss(displayName);
      }
      if (displayName && String(displayName).trim()) {
        const trimmedName = String(displayName).trim();
        const nameParts = trimmedName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
    }

    // Sanitize other inputs
    if (phone !== undefined) phone = phone ? xss(String(phone).trim()) : null;
    try {
      linkedinUrl = normalizeProfileUrl(linkedinUrl, 'linkedinUrl');
      indeedUrl = normalizeProfileUrl(indeedUrl, 'indeedUrl');
      naukriUrl = normalizeProfileUrl(naukriUrl, 'naukriUrl');
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }
    if (githubUrl !== undefined) { try { githubUrl = normalizeProfileUrl(githubUrl, 'githubUrl'); } catch (error) { return res.status(400).json({ error: error.message }); } }

    // Keep existing values for undefined parameters
    const finalPhone = phone !== undefined ? phone : existing.phone;
    const finalLinkedin = linkedinUrl !== undefined ? linkedinUrl : existing.linkedinUrl;
    const finalIndeed = indeedUrl !== undefined ? indeedUrl : existing.indeedUrl;
    const finalNaukri = naukriUrl !== undefined ? naukriUrl : existing.naukriUrl;
    const finalGithub = githubUrl !== undefined ? githubUrl : existing.githubUrl;

    await pool.query(
      `UPDATE users 
       SET firstName = ?, lastName = ?, phone = ?, linkedinUrl = ?, indeedUrl = ?, naukriUrl = ?, githubUrl = ? 
       WHERE id = ?`,
      [firstName, lastName, finalPhone, finalLinkedin, finalIndeed, finalNaukri, finalGithub, userId]
    );

    // Fetch updated user
    const [rows] = await pool.query(
      `SELECT id, firstName, lastName, email, plan, role, isVerified, phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || 'User'),
        email: user.email,
        plan: user.plan || 'free',
        country: 'IN',
        interfaceLanguage: 'English',
        aiLanguage: 'English',
        emailVerified: Boolean(user.isVerified),
        phone: user.phone,
        linkedinUrl: user.linkedinUrl,
        indeedUrl: user.indeedUrl,
        naukriUrl: user.naukriUrl,
        githubUrl: user.githubUrl,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Direct deletions in correct dependency order for the new schema
    await pool.query('DELETE FROM auth_tokens WHERE userId = ?', [userId]);
    await pool.query('DELETE FROM ai_usage WHERE userId = ?', [userId]);
    await pool.query('DELETE FROM interviews WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM files WHERE userId = ?', [userId]);
    await pool.query('DELETE FROM applications WHERE userId = ?', [userId]);
    await pool.query('DELETE FROM messages WHERE chatId IN (SELECT id FROM chats WHERE userId = ?)', [userId]);
    await pool.query('DELETE FROM chats WHERE userId = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Query all tables associated with user in the new schema
    const [users] = await pool.query('SELECT id, firstName, lastName, email, plan, createdAt FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const [applications] = await pool.query(
      `SELECT id, jobTitle, company, location, salary, status, matchScore, appliedAt 
       FROM applications 
       WHERE userId = ?`,
      [userId]
    );

    const [chats] = await pool.query(
      `SELECT c.title, m.content, m.role, m.createdAt 
       FROM messages m
       JOIN chats c ON m.chatId = c.id
       WHERE c.userId = ? 
       ORDER BY m.createdAt ASC`,
      [userId]
    );

    const [files] = await pool.query(
      `SELECT id, type, title, content, jobId, createdAt 
       FROM files 
       WHERE userId = ?`,
      [userId]
    );

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || 'User'),
        email: user.email,
        plan: user.plan,
        country: 'IN',
        createdAt: user.createdAt
      },
      applications: applications,
      chatHistory: chats.map(c => ({
        chatTitle: c.title,
        message: c.content,
        role: c.role,
        createdAt: c.createdAt
      })),
      files: files
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `hirenextai-data-${user.email}-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    console.error('Export data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
