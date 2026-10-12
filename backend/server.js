const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const productionEnvPath = path.join(__dirname, '.env.production');
const defaultEnvPath = path.join(__dirname, '.env');
dotenv.config({
  path: fs.existsSync(productionEnvPath) ? productionEnvPath : defaultEnvPath,
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Validate environments on startup
const { validateEnv } = require('./config/envCheck');
validateEnv();

const { transporter } = require('./services/emailService');

const frontendUrl = (process.env.FRONTEND_URL || 'https://hirenextai.com').replace(/\/$/, '');

const initDB = async () => {
  if (pool.dialect === 'postgres') return pool.verifySchema();
  try {
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

    await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255),
      subject VARCHAR(200),
      message TEXT,
      category VARCHAR(50),
      status VARCHAR(50) DEFAULT 'new',
      repliedAt DATETIME,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS chats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      title VARCHAR(255),
      pinned BOOLEAN DEFAULT false,
      archived BOOLEAN DEFAULT false,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chatId INT,
      role VARCHAR(20),
      content TEXT,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      jobTitle VARCHAR(255),
      company VARCHAR(255),
      location VARCHAR(255),
      salary VARCHAR(100),
      status VARCHAR(50) DEFAULT 'applied',
      matchScore INT,
      appliedAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT,
      jobId INT NULL,
      createdAt DATETIME DEFAULT NOW(),
      INDEX idx_files_user (userId)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      description TEXT,
      url VARCHAR(1000),
      platform VARCHAR(100),
      match_score INT DEFAULT 0,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      price_inr DECIMAL(10,2) DEFAULT 0,
      price_usd DECIMAL(10,2) DEFAULT 0,
      features TEXT,
      limits TEXT,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS interviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role VARCHAR(255) NOT NULL,
      difficulty VARCHAR(50) NOT NULL,
      overall_score DECIMAL(5,2) DEFAULT 0,
      questions_json LONGTEXT,
      answers_json LONGTEXT,
      feedback_json LONGTEXT,
      createdAt DATETIME DEFAULT NOW(),
      INDEX idx_interviews_user (user_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS ai_usage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      createdAt DATETIME DEFAULT NOW(),
      INDEX idx_user_type (userId, type)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      tokenHash CHAR(64) NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT NOW(),
      UNIQUE KEY unique_auth_token (tokenHash),
      INDEX idx_auth_tokens_user_type (userId, type)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS payment_orders (
      orderId VARCHAR(100) PRIMARY KEY,
      userId INT NOT NULL,
      planName VARCHAR(50) NOT NULL,
      amount BIGINT NOT NULL,
      currency VARCHAR(3) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      paymentId VARCHAR(100) UNIQUE,
      createdAt DATETIME DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS update_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(254) NOT NULL UNIQUE,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add admin columns to users table if they do not exist
    const addCol = async (tableName, colName, definition) => {
      try {
        const [existing] = await pool.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [colName]);
        if (existing.length) return;
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${definition}`);
        console.log(`✅ Added ${colName} column to ${tableName} table`);
      } catch (colErr) {
        if (colErr.code !== 'ER_DUP_FIELDNAME' && !colErr.message.includes('Duplicate column')) {
          console.warn(`⚠️ Could not add ${colName} column to ${tableName}:`, colErr.message);
        }
      }
    };

    await addCol('users', 'planExpiresAt', 'DATETIME NULL');
    await addCol('payment_orders', 'billing', "VARCHAR(10) NOT NULL DEFAULT 'monthly'");
    await addCol('users', 'adminNotes', 'TEXT NULL');
    await addCol('users', 'isSuspended', 'BOOLEAN DEFAULT false');
    await addCol('users', 'adminRoleName', 'VARCHAR(100) NULL');
    await addCol('users', 'adminPermissions', 'TEXT NULL');
    await addCol('users', 'otpCode', 'VARCHAR(10) NULL');
    await addCol('users', 'otpExpiresAt', 'DATETIME NULL');
    await addCol('users', 'device', "VARCHAR(50) DEFAULT 'Desktop'");
    await addCol('users', 'createdById', 'INT NULL');
    await addCol('users', 'tokenVersion', 'INT DEFAULT 1');

    // Seed randomized device types for existing database users
    try {
      await pool.query("UPDATE users SET device = 'Desktop' WHERE id % 3 = 0 AND (device IS NULL OR device = 'Desktop' OR device = '')");
      await pool.query("UPDATE users SET device = 'Mobile' WHERE id % 3 = 1 AND (device IS NULL OR device = 'Desktop' OR device = '')");
      await pool.query("UPDATE users SET device = 'Tablet' WHERE id % 3 = 2 AND (device IS NULL OR device = 'Desktop' OR device = '')");
    } catch (seedErr) {
      console.warn('⚠️ Could not seed device types:', seedErr.message);
    }

    // Add support ticket columns if they do not exist
    await addCol('support_tickets', 'assignedAdminId', 'INT NULL');
    await addCol('support_tickets', 'internalNotes', 'TEXT NULL');
    await addCol('support_tickets', 'attachments', 'LONGTEXT NULL');
    await addCol('support_tickets', 'replies', 'LONGTEXT NULL');

    // Create admin_activity_log table
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      adminId INT NOT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      createdAt DATETIME DEFAULT NOW()
    )`);

    // Create payments table
    await pool.query(`CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      orderId VARCHAR(255) NOT NULL,
      paymentId VARCHAR(255) NOT NULL,
      planName VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'success',
      createdAt DATETIME DEFAULT NOW()
    )`);

    // Create company_emails table
    await pool.query(`CREATE TABLE IF NOT EXISTS company_emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      threadId VARCHAR(255) NOT NULL,
      mailbox VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      senderName VARCHAR(100),
      senderEmail VARCHAR(255) NOT NULL,
      recipientEmail VARCHAR(255) NOT NULL,
      body LONGTEXT,
      status VARCHAR(50) DEFAULT 'New',
      assignedAdminId INT NULL,
      direction VARCHAR(20) DEFAULT 'incoming',
      hasAttachments BOOLEAN DEFAULT false,
      createdAt DATETIME DEFAULT NOW()
    )`);


    // Create company_email_attachments table
    await pool.query(`CREATE TABLE IF NOT EXISTS company_email_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      emailId INT NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileType VARCHAR(100),
      fileSize INT,
      fileData LONGTEXT,
      INDEX idx_emailId (emailId)
    )`);

    // Create shared_chats table
    await pool.query(`CREATE TABLE IF NOT EXISTS shared_chats (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255),
      messages LONGTEXT,
      options LONGTEXT,
      createdAt DATETIME DEFAULT NOW()
    )`);

    // Run database migrations to ensure scheduledAt column is added
    try {
      await addCol('company_emails', 'scheduledAt', 'DATETIME NULL');
    } catch (migErr) {
      console.log('Migration info:', migErr.message);
    }

    // Create api_keys table for API pool management
    await pool.query(`CREATE TABLE IF NOT EXISTS api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      provider VARCHAR(50) DEFAULT 'gemini',
      model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
      customEndpoint VARCHAR(255) NULL,
      apiKey TEXT NOT NULL,
      isActive BOOLEAN DEFAULT true,
      isDisabled BOOLEAN DEFAULT false,
      totalRequests INT DEFAULT 0,
      totalTokens BIGINT DEFAULT 0,
      totalErrors INT DEFAULT 0,
      lastUsedAt DATETIME,
      lastErrorAt DATETIME,
      lastErrorMessage TEXT,
      dailyRequests INT DEFAULT 0,
      dailyTokens BIGINT DEFAULT 0,
      dailyResetAt DATETIME DEFAULT NOW(),
      monthlyRequests INT DEFAULT 0,
      monthlyTokens BIGINT DEFAULT 0,
      monthlyResetAt DATETIME DEFAULT NOW(),
      cooldownUntil DATETIME,
      createdAt DATETIME DEFAULT NOW()
    )`);

    // ALTER TABLE safety migrations for existing database setups
    try {
      await addCol('api_keys', 'model', "VARCHAR(100) DEFAULT 'gemini-2.5-flash'");
    } catch (e) {
      // column already exists
    }
    try {
      await addCol('api_keys', 'customEndpoint', 'VARCHAR(255) NULL');
    } catch (e) {
      // column already exists
    }

    // Create api_usage_log table for per-request analytics
    await pool.query(`CREATE TABLE IF NOT EXISTS api_usage_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      apiKeyId INT NOT NULL,
      userId INT,
      endpoint VARCHAR(100),
      inputTokens INT DEFAULT 0,
      outputTokens INT DEFAULT 0,
      responseTimeMs INT DEFAULT 0,
      statusCode INT DEFAULT 200,
      errorMessage TEXT,
      createdAt DATETIME DEFAULT NOW(),
      INDEX idx_apikey_date (apiKeyId, createdAt),
      INDEX idx_user_date (userId, createdAt)
    )`);

    // Seed existing GEMINI_API_KEY from .env into the API pool if no keys exist yet
    try {
      const [existingKeys] = await pool.query('SELECT COUNT(*) as cnt FROM api_keys');
      if (existingKeys[0].cnt === 0 && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
        const { encrypt } = require('./services/apiPoolManager');
        const encryptedKey = encrypt(process.env.GEMINI_API_KEY.trim());
        await pool.query(
          'INSERT INTO api_keys (name, provider, apiKey, isActive) VALUES (?, ?, ?, true)',
          ['Gemini Key 1 (Auto-Imported)', 'gemini', encryptedKey]
        );
        console.log('✅ Auto-imported GEMINI_API_KEY from .env into API pool');
      }
    } catch (seedKeyErr) {
      console.warn('⚠️ Could not seed API key:', seedKeyErr.message);
    }

    // Create job_providers table for multi-provider job search
    await pool.query(`CREATE TABLE IF NOT EXISTS job_providers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      displayName VARCHAR(100) NOT NULL,
      apiKey TEXT NULL,
      appId TEXT NULL,
      priority INT DEFAULT 1,
      status VARCHAR(20) DEFAULT 'disabled',
      latencyMs INT DEFAULT 0,
      errorRate DECIMAL(5,2) DEFAULT 0.00,
      dailyRequests INT DEFAULT 0,
      monthlyRequests INT DEFAULT 0,
      healthScore INT DEFAULT 100,
      lastTestedAt DATETIME NULL,
      updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW(),
      createdAt DATETIME DEFAULT NOW()
    )`);

    // Create job_search_cache table for caching search results
    await pool.query(`CREATE TABLE IF NOT EXISTS job_search_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cacheKey CHAR(64) NOT NULL UNIQUE,
      query VARCHAR(255),
      location VARCHAR(255),
      results LONGTEXT,
      resultCount INT DEFAULT 0,
      createdAt DATETIME DEFAULT NOW()
    )`);

    // Seed default job search providers if empty
    try {
      const [existingProviders] = await pool.query('SELECT COUNT(*) as cnt FROM job_providers');
      if (existingProviders[0].cnt === 0) {
        const { encrypt } = require('./utils/cryptoHelper');

        const providers = [
          { name: 'jsearch', displayName: 'JSearch (RapidAPI)', priority: 1, status: 'disabled' },
          { name: 'adzuna', displayName: 'Adzuna', priority: 2, status: 'disabled' },
          { name: 'remotive', displayName: 'Remotive', priority: 3, status: 'enabled' },
          { name: 'arbeitnow', displayName: 'Arbeitnow', priority: 4, status: 'enabled' }
        ];

        for (const p of providers) {
          let apiKey = null;
          let appId = null;

          if (p.name === 'jsearch' && process.env.JSEARCH_API_KEY) {
            apiKey = encrypt(process.env.JSEARCH_API_KEY);
            p.status = 'enabled';
          }
          if (p.name === 'adzuna') {
            if (process.env.ADZUNA_API_KEY) {
              apiKey = encrypt(process.env.ADZUNA_API_KEY);
              p.status = 'enabled';
            }
            if (process.env.ADZUNA_APP_ID) {
              appId = encrypt(process.env.ADZUNA_APP_ID);
            }
          }

          await pool.query(
            'INSERT INTO job_providers (name, displayName, apiKey, appId, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
            [p.name, p.displayName, apiKey, appId, p.priority, p.status]
          );
        }
        console.log('✅ Seeded default job search providers into job_providers table');
      }
    } catch (seedErr) {
      console.warn('⚠️ Could not seed job providers:', seedErr.message);
    }

    // Admin monitoring and security table upgrades
    try {
      // 1. Create security_logs table
      await pool.query(`CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NULL,
        email VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        ipAddress VARCHAR(100),
        userAgent VARCHAR(500),
        details TEXT,
        createdAt DATETIME DEFAULT NOW()
      )`);

      // 2. Create verification_logs table
      await pool.query(`CREATE TABLE IF NOT EXISTS verification_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NULL,
        email VARCHAR(255) NOT NULL,
        otpCode VARCHAR(10) NOT NULL,
        status VARCHAR(50) NOT NULL,
        ipAddress VARCHAR(100),
        userAgent VARCHAR(500),
        createdAt DATETIME DEFAULT NOW()
      )`);

      // 3. Create email_delivery_logs table
      await pool.query(`CREATE TABLE IF NOT EXISTS email_delivery_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        templateName VARCHAR(100) NOT NULL,
        templateVersion VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL,
        providerResponse TEXT,
        smtpCode VARCHAR(50),
        sendDurationMs INT,
        createdAt DATETIME DEFAULT NOW()
      )`);

      // 4. Create login_audit_logs table
      await pool.query(`CREATE TABLE IF NOT EXISTS login_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        userId INT NULL,
        browser VARCHAR(100),
        os VARCHAR(100),
        device VARCHAR(50),
        ipAddress VARCHAR(100),
        country VARCHAR(100),
        result VARCHAR(20) NOT NULL,
        createdAt DATETIME DEFAULT NOW()
      )`);

      // 5. Create email_queue table
      await pool.query(`CREATE TABLE IF NOT EXISTS email_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        templateName VARCHAR(100) NOT NULL,
        templateVersion VARCHAR(20) NOT NULL,
        payload LONGTEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        lastError TEXT,
        createdAt DATETIME DEFAULT NOW(),
        updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW(),
        INDEX idx_status (status)
      )`);

      // 6. Ensure missing columns are added to users table
      const cols = [
        { name: 'adminNotes', type: 'TEXT DEFAULT NULL' },
        { name: 'isSuspended', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'adminRoleName', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'adminPermissions', type: 'TEXT DEFAULT NULL' },
        { name: 'otpCode', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'otpExpiresAt', type: 'DATETIME DEFAULT NULL' },
        { name: 'device', type: "VARCHAR(50) DEFAULT 'Desktop'" },
        { name: 'createdById', type: 'INT DEFAULT NULL' },
        { name: 'tokenVersion', type: 'INT DEFAULT 1' },
        { name: 'browser', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'ipAddress', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'lastActiveAt', type: 'DATETIME DEFAULT NULL' },
        { name: 'lastAction', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'sessionStatus', type: "VARCHAR(50) DEFAULT 'offline'" },
        { name: 'totalLogins', type: 'INT DEFAULT 0' },
        { name: 'os', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'country', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'city', type: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'verificationStatus', type: "VARCHAR(50) DEFAULT 'Pending Verification'" },
        { name: 'verifiedAt', type: 'DATETIME DEFAULT NULL' }
      ];

      for (const col of cols) {
        const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [col.name]);
        if (rows.length === 0) {
          console.log(`[DB Migration] Adding column ${col.name} to users table...`);
          await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        }
      }

      // Ensure existing otpCode column has sufficient length to hold SHA-256 hashes
      try {
      const [otpColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'otpCode'");
      if (otpColumns[0]?.Type?.toLowerCase() !== 'varchar(255)') {
        await pool.query('ALTER TABLE users MODIFY COLUMN otpCode VARCHAR(255) DEFAULT NULL');
      }
      } catch (colErr) {
        console.warn('⚠️ Could not modify otpCode column size:', colErr.message);
      }

      console.log('✅ Admin verification & monitoring tables schema verified');

    } catch (migErr) {
      console.error('❌ Admin verification & monitoring migration failed:', migErr.message);
    }

    await require('./config/performanceIndexes').ensurePerformanceIndexes(pool);

    // Administrator roles must be provisioned explicitly, never seeded by email.

    return true;
  } catch(e) {
    console.error('❌ DB init error:', e.message);
    return false;
  }
};

const runStartupHealthCheck = async () => {
  console.log('=== STARTING HIRENEXTAI HEALTH CHECK ===');

  // 1. Database Connection & Tables
  let dbOk = false;
  let tablesOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
    console.log('✅ Database connected');
    tablesOk = await initDB();
    if (tablesOk) {
      console.log('✅ All tables created');
    } else {
      console.log('❌ All tables created');
    }
  } catch (err) {
    console.log('❌ Database connected');
    console.log('❌ All tables created');
  }

  if (!dbOk || !tablesOk) throw new Error('Database startup failed');

  // 2. Gemini API Key
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    console.log('✅ Gemini AI key present');
  } else {
    console.log('❌ Gemini AI key present');
  }

  // 3. SMTP Email
  try {
    await transporter.verify();
    console.log('✅ SMTP Email ready');
  } catch (err) {
    console.log('❌ SMTP Email ready');
  }

  // 4. JWT Secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    console.log('✅ JWT Secret strong');
  } else {
    console.log('❌ JWT Secret strong');
  }

  // 5. Google OAuth Keys
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
    console.log('✅ Google OAuth keys');
  } else {
    console.log('⚠️ Google OAuth keys');
  }

  // 6. LinkedIn OAuth Keys
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_CLIENT_ID !== 'your_linkedin_client_id') {
    console.log('✅ LinkedIn OAuth keys');
  } else {
    console.log('⚠️ LinkedIn OAuth keys');
  }

  // 7. Razorpay Keys
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'your_key') {
    console.log('✅ Razorpay keys');
  } else {
    console.log('⚠️ Razorpay keys');
  }

  // 8. Fast2SMS Key
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim() !== '') {
    console.log('✅ Fast2SMS key');
  } else {
    console.log('⚠️ Fast2SMS key');
  }

  // Administrator accounts are provisioned explicitly in this database.
  const [adminCount] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
  console.log(adminCount[0].count ? 'Owner account present' : 'No owner account provisioned');

  console.log('=== HEALTH CHECK COMPLETE ===');
};

let startupComplete = false;
const startDatabase = async () => {
  try {
    await runStartupHealthCheck();
    startupComplete = true;
  } catch (error) {
    console.error('Database startup deferred:', error.message);
    setTimeout(startDatabase, 30000).unref();
  }
};
void startDatabase();

const app = express();
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', (req, res, next) => {
  if (startupComplete) return next();
  res.setHeader('Retry-After', '30');
  return res.status(503).json({ error: 'The service is starting. Please try again shortly.' });
});
let dbConnected = true;

// Session Security and Proxy settings
app.set('trust proxy', process.env.TRUST_PROXY || false);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Only redirect when the proxy explicitly tells us the original request
    // was HTTP. Some shared hosts do not provide this header for HTTPS traffic.
    if (req.header('x-forwarded-proto') === 'http') {
      return res.redirect(301, `${frontendUrl}${req.url}`);
    }
    next();
  });
}

// Hiding server version and infrastructure hardening
app.disable('x-powered-by');

// Reject unsupported HTTP methods
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  next();
});

// Permissions-Policy header
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self), payment=(self)');
  next();
});

// Generate dynamic CSP nonces middleware
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Helmet CSP & Security Headers Hardening
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://hirenextai.com", "https://generativelanguage.googleapis.com", "https://api.anthropic.com", "https://api.openai.com", "https://api.deepseek.com", "https://api.x.ai", "https://openrouter.ai"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin'
  }
}));

// CORS Configuration (Allow only trusted origins)
const allowedOrigins = [
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'https://hirenextai.com',
  'https://www.hirenextai.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl === '/api/auth/me' || req.originalUrl === '/api/user/me',
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'AI rate limit reached. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl === '/api/auth/me' || req.originalUrl === '/api/auth/resend-verification',
});

// Apply rate limiters
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/chat', aiLimiter);
app.use('/api/interview', aiLimiter);
app.use('/api/ai', aiLimiter);

// Express body parsers
app.use(express.json({ limit: '10mb', verify: (req, res, buffer) => {
  if (req.originalUrl.split('?')[0] === '/api/payment/webhook') req.rawBody = Buffer.from(buffer);
} }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
require('./config/passport');
app.use(passport.initialize());

const oauthState = require('./utils/oauthState');
const oauthExchange = require('./utils/oauthExchange');
app.post('/api/auth/exchange', oauthExchange.exchange);
app.get('/api/auth/providers', (req, res) => res.json({ google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL), linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) }));

// Google OAuth routes
app.get('/api/auth/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.status(503).json({ error: 'Google sign-in is not configured' });
    passport.authenticate('google', { scope: ['profile', 'email'], state: oauthState.begin(req, res, 'google') })(req, res, next);
  }
);

app.get('/api/auth/google/callback',
  (req, res, next) => {
    if (!oauthState.consume(req, res, 'google')) return res.status(400).json({ error: 'Invalid or expired sign-in state' });
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/login?error=google` }),
  async (req, res) => {
    if (req.user.isSuspended) return res.status(403).json({ error: 'Account suspended' });
    // If the logging-in user is an admin or owner, enforce mandatory 2-Step Verification
    if (req.user.role === 'admin' || req.user.role === 'owner') {
      const crypto = require('crypto');
      const otp = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      const { getRealIp, getOSFromUA, getBrowserFromUA, getDeviceFromUA, getGeoLocation } = require('./utils/ipHelper');
      const ip = getRealIp(req);
      const ua = req.headers['user-agent'] || '';
      const browser = getBrowserFromUA(ua);
      const os = getOSFromUA(ua);
      const device = getDeviceFromUA(ua);

      try {
        const geo = await getGeoLocation(ip);
        const country = geo.country || 'Unknown Country';

        // Send OTP email using queue
        const emailQueue = require('./services/emailQueue');
        await emailQueue.addJob({
          recipient: req.user.email,
          templateName: 'OTP Email',
          payload: { otp }
        });

        // Update in DB ONLY AFTER email queue successfully accepted
        const hashed = crypto.createHash('sha256').update(otp).digest('hex');
        await pool.query(
          'UPDATE users SET otpCode = ?, otpExpiresAt = ? WHERE id = ?',
          [hashed, expiresAt, req.user.id]
        );
        console.log(`[Admin Google Login 2FA OTP] Code for ${req.user.email} sent and hashed in DB.`);

        // Log Login Audit Success
        const { logLoginAudit } = require('./services/securityLogger');
        await logLoginAudit({
          email: req.user.email,
          userId: req.user.id,
          browser,
          os,
          device,
          ipAddress: ip,
          country,
          result: 'Success'
        });
      } catch (err) {
        console.error('[Admin 2FA] Failed to queue OTP email or save to DB:', err.message);

        // Log Login Audit Failed
        try {
          const geo = await getGeoLocation(ip);
          const { logLoginAudit } = require('./services/securityLogger');
          await logLoginAudit({
            email: req.user.email,
            userId: req.user.id,
            browser,
            os,
            device,
            ipAddress: ip,
            country: geo.country || 'Unknown Country',
            result: 'Failed'
          });
        } catch (auditErr) {
          console.error('[Admin 2FA] Failed to log audit event:', auditErr.message);
        }
        return res.redirect(`${frontendUrl}/admin/login?error=email_unavailable`);
      }

      require('./utils/adminChallenge').issue(res, req.user);
      // Redirect to frontend admin panel with OTP sent parameter (pre-fills email and triggers OTP screen)
      return res.redirect(`${frontendUrl}/admin?email=${encodeURIComponent(req.user.email)}&otp_sent=true`);
    }

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role, tokenVersion: req.user.tokenVersion || 1 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // Redirect to frontend with token for normal users
    res.redirect(`${frontendUrl}/auth/callback?code=${oauthExchange.issue(res, token)}`);
  }
);

async function signAppToken(userId) {
  const [rows] = await pool.query('SELECT tokenVersion, role, isSuspended FROM users WHERE id = ?', [userId]);
  if (!rows[0] || rows[0].isSuspended || ['admin', 'owner'].includes(rows[0].role)) throw new Error('Use password and email verification for this account');
  return jwt.sign({ id: userId, tokenVersion: rows[0].tokenVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function upsertLinkedInUser(profile, email) {
  const localizedName = profile.localizedFirstName || profile.given_name || profile.name || 'LinkedIn';
  const localizedLast = profile.localizedLastName || profile.family_name || '';
  const profileId = profile.sub || profile.id;
  const linkedinUrl = profile.vanityName
    ? `https://www.linkedin.com/in/${profile.vanityName}`
    : (profile.profile || (profileId ? `https://www.linkedin.com/in/${profileId}` : null));

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('LinkedIn did not return an email address');
  }

  const [rows] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (rows.length > 0) {
    await pool.query(
      'UPDATE users SET linkedinUrl = COALESCE(?, linkedinUrl), isVerified = TRUE, lastLoginAt = NOW() WHERE id = ?',
      [linkedinUrl, rows[0].id]
    );
    return rows[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO users (firstName, lastName, email, plan, role, isVerified, linkedinUrl, lastLoginAt)
     VALUES (?, ?, ?, 'free', 'user', TRUE, ?, NOW())`,
    [localizedName, localizedLast, normalizedEmail, linkedinUrl]
  );
  return result.insertId;
}

// Browser-bound OAuth state; account linking starts through an authenticated POST.
function beginLinkedIn(req, res) {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    if (req.method === 'POST') return res.status(503).json({ error: 'LinkedIn sign-in is not configured yet. You can save your profile link below.' });
    return res.redirect(`${frontendUrl}/auth/callback?error=linkedin_not_configured`);
  }
  const callbackUrl = process.env.LINKEDIN_CALLBACK_URL || `${process.env.BACKEND_URL || 'https://hirenextai.com'}/api/auth/linkedin/callback`;
  const state = oauthState.begin(req, res, 'linkedin', { connectedUserId: req.user?.id || null });
  const params = new URLSearchParams({ response_type: 'code', client_id: process.env.LINKEDIN_CLIENT_ID, redirect_uri: callbackUrl, scope: 'openid profile email', state });
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  if (req.method === 'POST') return res.json({ url });
  res.redirect(url);
}
app.get('/api/auth/linkedin', beginLinkedIn);
app.post('/api/auth/linkedin/connect', require('./middleware/auth'), beginLinkedIn);

app.get('/api/auth/linkedin/callback', async (req, res) => {
  try {
    const oauthSession = oauthState.consume(req, res, 'linkedin');
    if (!oauthSession) return res.status(400).json({ error: 'Invalid or expired sign-in state' });
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`${frontendUrl}/auth/callback?error=linkedin_${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${frontendUrl}/auth/callback?error=linkedin_missing_code`);
    }

    const callbackUrl = process.env.LINKEDIN_CALLBACK_URL || `${process.env.BACKEND_URL || 'https://hirenextai.com'}/api/auth/linkedin/callback`;
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: callbackUrl,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`LinkedIn token exchange failed (${tokenResponse.status})`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      throw new Error(`LinkedIn profile fetch failed (${profileResponse.status})`);
    }

    const profile = await profileResponse.json();
    const connectedUserId = oauthSession.connectedUserId;
    if (connectedUserId) {
      const linkedinUrl = profile.vanityName
        ? `https://www.linkedin.com/in/${profile.vanityName}`
        : (profile.profile || (profile.sub ? `https://www.linkedin.com/in/${profile.sub}` : null));
      await pool.query('UPDATE users SET linkedinUrl = COALESCE(?, linkedinUrl) WHERE id = ?', [linkedinUrl, connectedUserId]);
      return res.redirect(`${frontendUrl}/auth/callback?linkedin=connected`);
    }

    if (profile.email_verified !== true) throw new Error('Verified email required');
    const userId = await upsertLinkedInUser(profile, profile.email);
    const appToken = await signAppToken(userId);
    res.redirect(`${frontendUrl}/auth/callback?code=${oauthExchange.issue(res, appToken)}`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.message);
    res.redirect(`${frontendUrl}/auth/callback?error=linkedin_failed`);
  }
});

// Register routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/interview', require('./routes/interviewRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/job-providers', require('./routes/jobProviderRoutes'));
app.use('/api/extension', require('./routes/extensionRoutes'));


// Conditionally register debug and test email routes
// Debug email endpoints are intentionally not exposed.

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!startupComplete) return res.status(503).json({ status: 'starting', database: 'initializing' });
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  let smtpReady = false;
  try {
    await transporter.verify();
    smtpReady = true;
  } catch {
    smtpReady = false;
  }

  res.json({
    status: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    email: smtpReady ? 'ready' : 'unavailable',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    googleOAuth: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing',
    linkedinOAuth: process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ? 'configured' : 'missing',
    razorpay: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath, { index: false, setHeaders: require('./config/assetCache').setAssetCacheHeaders }));

let cachedIndexHtml = '';
app.get('/{*splat}', (req, res) => {
  const filePath = path.join(frontendPath, "index.html");
  try {
    if (!cachedIndexHtml || process.env.NODE_ENV !== 'production') {
      if (fs.existsSync(filePath)) {
        cachedIndexHtml = fs.readFileSync(filePath, 'utf8');
      } else {
        return res.status(404).send('Frontend build index.html missing. Run npm run build.');
      }
    }
    const nonce = res.locals.nonce || '';
    // Dynamically insert nonce into script tags: <script -> <script nonce="xyz"
    const htmlWithNonce = cachedIndexHtml.replace(/<script/g, `<script nonce="${nonce}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlWithNonce);
  } catch (err) {
    res.status(500).send('Error rendering application page.');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global production-ready error handler
app.use((err, req, res, next) => {
  const fs = require('fs');
  const errorMsg = `[${new Date().toISOString()}] ${err.stack || err.message || err}\n\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'vps_error.log'), errorMsg);
  } catch (e) {
    console.error('Failed to write to vps_error.log:', e.message);
  }

  console.error('Server error:', err);
  const userMessage = process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again later.'
    : (err.message || 'Something went wrong. Please try again.');
  res.status(err.status || 500).json({ error: userMessage });
});

// Background Scheduler for sending Scheduled Emails
setInterval(async () => {
  try {
    const [scheduled] = await pool.query(
      `SELECT * FROM company_emails
       WHERE status = 'Scheduled' AND direction = 'outgoing' AND scheduledAt <= NOW()`
    );

    if (scheduled.length === 0) return;

    console.log(`[Scheduled Emails] Found ${scheduled.length} email(s) ready to send.`);

    const { transporter } = require('./services/emailService');

    for (const email of scheduled) {
      let attachments = [];
      if (email.hasAttachments) {
        const [attRows] = await pool.query(
          'SELECT fileName, fileType, fileData FROM company_email_attachments WHERE emailId = ?',
          [email.id]
        );
        attachments = attRows.map(att => ({
          filename: att.fileName,
          content: Buffer.from(att.fileData.split(',')[1] || att.fileData, 'base64'),
          contentType: att.fileType
        }));
      }

      const emailHtml = `
        <div style="background-color: #FFFFFF; font-family: 'Outfit', 'Inter', sans-serif; color: #000000; padding: 40px 24px; border: 1px solid #E0E0E0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 32px; text-align: left; border-bottom: 2px solid #000000; padding-bottom: 16px;">
            <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #000000;">Hirenext<span style="font-weight: 300;">AI</span></span>
          </div>

          <p style="font-size: 15px; font-weight: 500; color: #000000; margin-bottom: 16px;">Hello,</p>

          <div style="font-size: 14px; line-height: 1.6; color: #333333; margin-bottom: 32px; white-space: pre-wrap;">${email.body}</div>

          <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 32px 0 24px 0;" />

          <div style="font-size: 12px; color: #777777; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: 700; color: #000000;">Questions?</p>
            <p style="margin: 0 0 16px 0;">Contact Support: <a href="mailto:support@hirenextai.com" style="color: #000000; font-weight: 600; text-decoration: none;">support@hirenextai.com</a></p>
            <p style="margin: 0; font-weight: 800; color: #000000;">HirenextAI Team</p>
          </div>
        </div>
      `;

      let sendSuccess = false;
      try {
        await transporter.sendMail({
          from: `"${email.mailbox.split('@')[0].toUpperCase()} - HirenextAI" <${email.mailbox}>`,
          to: email.recipientEmail,
          subject: email.subject,
          html: emailHtml,
          attachments: attachments
        });
        sendSuccess = true;
        console.log(`[Scheduled Emails] Email #${email.id} sent successfully to ${email.recipientEmail}`);
      } catch (sendErr) {
        console.error(`[Scheduled Emails] Failed to send email #${email.id}:`, sendErr.message);
      }

      if (sendSuccess) {
        await pool.query(
          "UPDATE company_emails SET status = 'Sent', createdAt = NOW() WHERE id = ?",
          [email.id]
        );
      } else {
        await pool.query(
          "UPDATE company_emails SET status = 'Failed' WHERE id = ?",
          [email.id]
        );
      }
    }
  } catch (err) {
    console.error('[Scheduled Emails Background Scheduler Error]:', err.message);
  }
}, 60000);

// =============================================
// JOB PROVIDER HEALTH MONITOR (Every 10 minutes)
// =============================================
setInterval(async () => {
  try {
    const ProviderManager = require('./providers/ProviderManager');
    const [providers] = await pool.query('SELECT * FROM job_providers WHERE status != "disabled"');

    for (const dbConfig of providers) {
      try {
        const provider = ProviderManager.createProviderInstance(dbConfig);
        if (!provider) continue;

        const report = await provider.healthCheck();
        const newHealth = report.success
          ? Math.min(100, (dbConfig.healthScore || 100) + 5)
          : Math.max(0, (dbConfig.healthScore || 100) - 20);
        const newStatus = report.success ? 'enabled' : 'offline';

        await pool.query(
          'UPDATE job_providers SET latencyMs = ?, healthScore = ?, status = ?, lastTestedAt = NOW() WHERE id = ?',
          [report.latencyMs || 0, newHealth, newStatus, dbConfig.id]
        );
      } catch (providerErr) {
        console.warn(`[Health Monitor] ${dbConfig.displayName} check failed:`, providerErr.message);
        await pool.query(
          'UPDATE job_providers SET healthScore = GREATEST(0, healthScore - 20), status = "offline", lastTestedAt = NOW() WHERE id = ?',
          [dbConfig.id]
        ).catch(() => {});
      }
    }

    console.log(`[Health Monitor] Checked ${providers.length} job providers`);
  } catch (err) {
    console.warn('[Health Monitor] Error:', err.message);
  }
}, 10 * 60 * 1000); // Every 10 minutes

// Reset daily request counters at midnight
setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    try {
      await pool.query('UPDATE job_providers SET dailyRequests = 0');
      console.log('[Health Monitor] Daily request counters reset');
    } catch (e) {
      console.warn('[Health Monitor] Daily reset failed:', e.message);
    }
  }
}, 60 * 1000); // Check every minute

const PORT = process.env.PORT || process.env.NODE_PORT || 3003;
app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
