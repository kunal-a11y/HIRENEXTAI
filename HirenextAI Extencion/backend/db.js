const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promisified helper functions
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database schema
async function initDB() {
  // 1. Users Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Profiles Table (Holds structured ATS resume profile)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      skills TEXT,         -- JSON array of strings
      education TEXT,      -- JSON array of objects
      experience TEXT,     -- JSON array of objects
      projects TEXT,       -- JSON array of objects
      certifications TEXT, -- JSON array of strings
      languages TEXT,      -- JSON array of strings
      career_goal TEXT,
      photo_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Resumes Table (Original files uploaded)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Applications Table (Application tracker logs)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      date_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
      resume_version TEXT,
      cover_letter_version TEXT,
      application_notes TEXT,
      status TEXT DEFAULT 'Applied',
      job_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Documents Table (Generated documents library)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      application_id INTEGER,
      title TEXT NOT NULL,
      type TEXT NOT NULL, -- 'resume', 'cover_letter', 'recruiter_message', 'answers'
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'document',
      mime_type TEXT DEFAULT 'text/plain',
      source TEXT DEFAULT 'ai_generated',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // 6. AI Providers Table (For Smart Router & Key Manager)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- 'gemini', 'openai', 'anthropic'
      api_key TEXT,
      priority INTEGER DEFAULT 1,
      status TEXT DEFAULT 'inactive', -- 'active', 'inactive'
      health TEXT DEFAULT 'healthy',  -- 'healthy', 'unhealthy'
      latency INTEGER DEFAULT 0,      -- in ms
      requests INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      last_used DATETIME,
      last_success DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Announcements Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Handoff Tokens Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS handoff_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Sessions Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      ip_address TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add photo_url column if not present in profiles table
  try {
    await dbRun('ALTER TABLE profiles ADD COLUMN photo_url TEXT');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add application_id column if not present in documents table
  try {
    await dbRun('ALTER TABLE documents ADD COLUMN application_id INTEGER');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add job_url column if not present in applications table
  try {
    await dbRun('ALTER TABLE applications ADD COLUMN job_url TEXT');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add content_type column if not present in documents table
  try {
    await dbRun("ALTER TABLE documents ADD COLUMN content_type TEXT DEFAULT 'document'");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add mime_type column if not present in documents table
  try {
    await dbRun("ALTER TABLE documents ADD COLUMN mime_type TEXT DEFAULT 'text/plain'");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add source column if not present in documents table
  try {
    await dbRun("ALTER TABLE documents ADD COLUMN source TEXT DEFAULT 'ai_generated'");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add updated_at column if not present in documents table
  try {
    await dbRun("ALTER TABLE documents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add metadata column if not present in documents table
  try {
    await dbRun("ALTER TABLE documents ADD COLUMN metadata TEXT");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Populate application_id for existing documents if we can match confidently
  try {
    const docs = await dbAll('SELECT * FROM documents WHERE application_id IS NULL');
    for (const doc of docs) {
      const match = doc.title.match(/^[^-]+-\s*(.*?)\s*\((.*?)\)$/);
      if (match) {
        const company = match[1].trim();
        const role = match[2].trim();
        
        // Find if there is a unique matching application
        const apps = await dbAll(
          'SELECT id FROM applications WHERE user_id = ? AND LOWER(company) = ? AND LOWER(role) = ?',
          [doc.user_id, company.toLowerCase(), role.toLowerCase()]
        );
        
        if (apps && apps.length === 1) {
          await dbRun('UPDATE documents SET application_id = ? WHERE id = ?', [apps[0].id, doc.id]);
          console.log(`✓ Confidently migrated document "${doc.title}" to application ID ${apps[0].id}`);
        }
      }
    }
  } catch (e) {
    console.error('Error migrating existing documents:', e);
  }
  // 10. Application Status History Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS application_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      previous_status TEXT,
      new_status TEXT,
      source TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // 11. Notifications Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      application_id INTEGER,
      event TEXT,
      recipient TEXT,
      delivery_status TEXT,
      provider_message_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // 12. Companies Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      domain TEXT,
      logo_url TEXT,
      logo_source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add new application tracking columns
  const appTrackingCols = [
    { name: 'company_id', type: 'INTEGER' },
    { name: 'company_logo', type: 'TEXT' },
    { name: 'job_id', type: 'TEXT' },
    { name: 'company_url', type: 'TEXT' },
    { name: 'platform', type: 'TEXT' },
    { name: 'application_url', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'employment_type', type: 'TEXT' },
    { name: 'work_mode', type: 'TEXT' },
    { name: 'status_last_checked', type: 'DATETIME' },
    { name: 'status_last_changed', type: 'DATETIME' },
    { name: 'source_metadata', type: 'TEXT' },
    { name: 'salary', type: 'TEXT' },
    { name: 'skills', type: 'TEXT' },
    { name: 'description', type: 'TEXT' },
    { name: 'platform_logo', type: 'TEXT' },
    { name: 'platform_url', type: 'TEXT' },
    { name: 'experience', type: 'TEXT' }
  ];

  for (const col of appTrackingCols) {
    try {
      await dbRun(`ALTER TABLE applications ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  // Seed default AI Providers if missing
  const providers = ['gemini', 'openai', 'anthropic'];
  for (const name of providers) {
    const existing = await dbGet('SELECT * FROM ai_providers WHERE name = ?', [name]);
    if (!existing) {
      await dbRun('INSERT INTO ai_providers (name, api_key, priority, status) VALUES (?, ?, ?, ?)', [name, '', 1, 'inactive']);
    }
  }

  // Provision an owner only when private credentials are explicitly configured.
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;
  if ((ownerEmail || ownerPassword) && (!ownerEmail || !ownerPassword || ownerPassword.length < 16)) {
    throw new Error('Owner provisioning requires OWNER_EMAIL and a private OWNER_PASSWORD of at least 16 characters.');
  }
  const ownerUser = ownerEmail ? await dbGet('SELECT * FROM users WHERE email = ?', [ownerEmail]) : null;
  if (ownerEmail && ownerPassword && !ownerUser) {
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const result = await dbRun('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [ownerEmail, passwordHash, 'owner']);
    await dbRun('INSERT INTO profiles (user_id, name, email) VALUES (?, ?, ?)', [result.lastID, 'System Administrator', ownerEmail]);
    console.log('Provisioned the configured owner account.');
  }
}

module.exports = {
  dbRun,
  dbGet,
  dbAll,
  initDB
};
