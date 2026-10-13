const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { jsPDF } = require('jspdf');
const crypto = require('crypto');

const db = require('./db');
const { executeAIRequest, parseAIJSON } = require('./ai');
const { parseResumePDF } = require('./parser');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a private random value of at least 32 characters before starting the extension backend.');
}

// IP extraction helper
const getClientIp = (req) => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip;
};

// Middleware
app.use(cors());
app.use(express.json());

// Setup upload folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadSingleResume = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large — please upload a resume under 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    
    try {
      let session = await db.dbGet('SELECT * FROM sessions WHERE token = ?', [token]);
      
      if (!session) {
        // Fallback for direct token logins/legacy tokens: dynamically register it with current client IP
        const clientIp = getClientIp(req);
        await db.dbRun(
          'INSERT INTO sessions (token, user_id, ip_address, status) VALUES (?, ?, ?, ?)',
          [token, user.id, clientIp, 'active']
        );
        session = { token, user_id: user.id, ip_address: clientIp, status: 'active' };
      }

      if (session.status !== 'active') {
        return res.status(401).json({ error: 'Session is no longer active', code: 'SESSION_EXPIRED' });
      }

      // Validate IP matches
      const currentIp = getClientIp(req);
      if (session.ip_address !== currentIp) {
        // Invalidate session immediately
        await db.dbRun("UPDATE sessions SET status = 'invalidated' WHERE token = ?", [token]);
        return res.status(401).json({ 
          error: 'Session expired due to IP address mismatch', 
          code: 'IP_MISMATCH' 
        });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      return res.status(500).json({ error: dbErr.message });
    }
  });
}

// Owner Verification Middleware
function requireOwner(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access restricted to administrators' });
  }
  next();
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await db.dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.dbRun(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, 'user']
    );

    const userId = result.lastID;
    
    // Seed blank profile
    await db.dbRun(
      'INSERT INTO profiles (user_id, email, skills, education, experience, projects, certifications, languages) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, '[]', '[]', '[]', '[]', '[]', '[]']
    );

    // Create JWT
    const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    
    // Register active session
    const clientIp = getClientIp(req);
    await db.dbRun(
      'INSERT INTO sessions (token, user_id, ip_address, status) VALUES (?, ?, ?, ?)',
      [token, userId, clientIp, 'active']
    );

    res.status(201).json({ token, role: 'user', email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Register active session
    const clientIp = getClientIp(req);
    await db.dbRun(
      'INSERT INTO sessions (token, user_id, ip_address, status) VALUES (?, ?, ?, ?)',
      [token, user.id, clientIp, 'active']
    );

    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const profile = await db.dbGet('SELECT name FROM profiles WHERE user_id = ?', [req.user.id]);
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      hasProfile: !!(profile && profile.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/handoff-token', authenticateToken, async (req, res) => {
  try {
    const handoffToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes validity
    await db.dbRun(
      'INSERT INTO handoff_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
      [handoffToken, req.user.id, expiresAt]
    );
    res.json({ handoffToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/consume-handoff', async (req, res) => {
  const { handoffToken } = req.body;
  if (!handoffToken) {
    return res.status(400).json({ error: 'Handoff token is required' });
  }

  try {
    const record = await db.dbGet(
      'SELECT * FROM handoff_tokens WHERE token = ? AND used = 0',
      [handoffToken]
    );
    if (!record) {
      return res.status(400).json({ error: 'Invalid or already consumed handoff token' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Handoff token has expired' });
    }

    // Mark as used
    await db.dbRun('UPDATE handoff_tokens SET used = 1 WHERE token = ?', [handoffToken]);

    const user = await db.dbGet('SELECT * FROM users WHERE id = ?', [record.user_id]);
    if (!user) {
      return res.status(404).json({ error: 'Associated user not found' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Register dynamic IP-bound session
    const clientIp = getClientIp(req);
    await db.dbRun(
      'INSERT INTO sessions (token, user_id, ip_address, status) VALUES (?, ?, ?, ?)',
      [token, user.id, clientIp, 'active']
    );

    res.json({ token, id: user.id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ONBOARDING & PROFILE ENDPOINTS
// ----------------------------------------------------

app.post('/api/profile/upload', authenticateToken, uploadSingleResume, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No resume PDF file uploaded' });
  }

  // 1. Verify PDF Magic Bytes (%PDF- is 25 50 44 46 2d in hex)
  const magic = req.file.buffer.slice(0, 5).toString('ascii');
  if (magic !== '%PDF-') {
    return res.status(400).json({ error: 'Invalid file format. The uploaded file is not a valid PDF document.' });
  }

  try {
    // 2. Parse using AI with timeout & page limit guards inside parser
    const structuredProfile = await parseResumePDF(req.file.buffer);

    // 3. Sanitize original filename (prevent path traversal / directory injection)
    const sanitizedOriginalName = req.file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.\.+/g, '.');

    // 4. Save original uploaded file reference
    const filename = `${req.user.id}_${Date.now()}_${sanitizedOriginalName}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    await db.dbRun(
      'INSERT INTO resumes (user_id, name, original_name, file_path, is_default) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'Original Resume', sanitizedOriginalName, filePath, 1]
    );

    // 3. Save profile to DB
    await db.dbRun(`
      UPDATE profiles
      SET name = ?, phone = ?, skills = ?, education = ?, experience = ?, projects = ?, certifications = ?, languages = ?, career_goal = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [
      structuredProfile.name,
      structuredProfile.phone,
      JSON.stringify(structuredProfile.skills || []),
      JSON.stringify(structuredProfile.education || []),
      JSON.stringify(structuredProfile.experience || []),
      JSON.stringify(structuredProfile.projects || []),
      JSON.stringify(structuredProfile.certifications || []),
      JSON.stringify(structuredProfile.languages || []),
      structuredProfile.career_goal,
      req.user.id
    ]);

    res.json({ success: true, profile: structuredProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/build', authenticateToken, async (req, res) => {
  const { answers } = req.body;
  if (!answers) {
    return res.status(400).json({ error: 'Onboarding answers are required' });
  }

  try {
    // Generate styled structured resume using the AI router
    const systemPrompt = `You are a professional resume writer. Look at the client's raw interview answers and formulate an outstanding ATS-optimized resume profile JSON.
Ensure descriptions of experience are clean, detailed, and results-oriented.
Fill in all arrays properly. 

Return EXACTLY a JSON structure matching:
{
  "name": "Full Name",
  "phone": "Phone or null",
  "skills": ["Skill1", ...],
  "education": [{"degree": "...", "school": "...", "graduation_year": "..."}],
  "experience": [{"company": "...", "role": "...", "dates": "...", "description": "..."}],
  "projects": [{"name": "...", "description": "...", "link": "..."}],
  "certifications": ["Cert1", ...],
  "languages": ["Lang1", ...],
  "career_goal": "Professional ATS career goal outline"
}`;

    const prompt = `Here are the builder interview questions and user answers:
${JSON.stringify(answers, null, 2)}`;

    const aiRes = await executeAIRequest(prompt, systemPrompt, true);
    const structuredProfile = parseAIJSON(aiRes);

    if (!structuredProfile) {
      throw new Error('AI Router returned empty structured resume data');
    }

    // Save profile to DB
    await db.dbRun(`
      UPDATE profiles
      SET name = ?, phone = ?, skills = ?, education = ?, experience = ?, projects = ?, certifications = ?, languages = ?, career_goal = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [
      structuredProfile.name || answers.name,
      structuredProfile.phone || answers.phone || '',
      JSON.stringify(structuredProfile.skills || []),
      JSON.stringify(structuredProfile.education || []),
      JSON.stringify(structuredProfile.experience || []),
      JSON.stringify(structuredProfile.projects || []),
      JSON.stringify(structuredProfile.certifications || []),
      JSON.stringify(structuredProfile.languages || []),
      structuredProfile.career_goal || answers.career_goal || '',
      req.user.id
    ]);

    res.json({ success: true, profile: structuredProfile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await db.dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    // Parse JSON columns
    profile.skills = JSON.parse(profile.skills || '[]');
    profile.education = JSON.parse(profile.education || '[]');
    profile.experience = JSON.parse(profile.experience || '[]');
    profile.projects = JSON.parse(profile.projects || '[]');
    profile.certifications = JSON.parse(profile.certifications || '[]');
    profile.languages = JSON.parse(profile.languages || '[]');

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/update', authenticateToken, async (req, res) => {
  const { name, phone, skills, education, experience, projects, certifications, languages, career_goal, photo_url } = req.body;
  try {
    await db.dbRun(`
      UPDATE profiles
      SET name = ?, phone = ?, skills = ?, education = ?, experience = ?, projects = ?, certifications = ?, languages = ?, career_goal = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [
      name,
      phone,
      JSON.stringify(skills || []),
      JSON.stringify(education || []),
      JSON.stringify(experience || []),
      JSON.stringify(projects || []),
      JSON.stringify(certifications || []),
      JSON.stringify(languages || []),
      career_goal,
      photo_url,
      req.user.id
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// JOB ANALYSIS & MATCHING
// ----------------------------------------------------

app.post('/api/jobs/analyze', authenticateToken, async (req, res) => {
  const { title, company, description, responsibilities, requirements } = req.body;
  try {
    const profile = await db.dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (!profile || !profile.name) {
      return res.status(400).json({ error: 'Please set up your profile/resume first' });
    }

    const systemPrompt = `You are a recruitment screening AI. Match the user's resume profile to the job description.
Return a structured JSON output with exact percentages (integers 0 to 100) and actionable missing skills / tips.

You MUST respond with a single valid JSON object following this schema:
{
  "overallMatch": 85,
  "resumeMatch": 90,
  "skillMatch": 80,
  "experienceMatch": 85,
  "educationMatch": 95,
  "missingSkills": ["React Native", "Docker", ...],
  "suggestions": ["Highlight your project X", "Emphasize management skills", ...]
}`;

    const prompt = `
Job Title: ${title}
Company: ${company}
Job Description: ${description}
Responsibilities: ${responsibilities || ''}
Requirements: ${requirements || ''}

User Profile:
${JSON.stringify(profile)}
`;

    const aiRes = await executeAIRequest(prompt, systemPrompt, true);
    const analysis = parseAIJSON(aiRes);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/match-score', authenticateToken, async (req, res) => {
  const { jobs } = req.body;
  if (!jobs || !Array.isArray(jobs)) {
    return res.status(400).json({ error: 'Jobs parameter is required and must be an array' });
  }

  try {
    const resumesCount = await db.dbGet('SELECT COUNT(*) as count FROM resumes WHERE user_id = ?', [req.user.id]);
    const profile = await db.dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);

    if (!resumesCount || resumesCount.count === 0 || !profile || !profile.name) {
      const response = {};
      jobs.forEach(job => {
        response[job.id] = 0;
      });
      return res.json(response);
    }

    const systemPrompt = `You are a recruitment screening AI. Your task is to match the user's resume profile to a list of jobs and calculate a match score (0 to 100) for each.
Ensure you return a single valid JSON object where keys are the job IDs provided in the request, and values are the integer match scores (0 to 100). Do not include any extra commentary, markdown format ticks, or wrapper objects.

Example JSON output schema:
{
  "job-id-123": 85,
  "job-id-456": 42
}`;

    const prompt = `
User Resume Profile:
Name: ${profile.name}
Career Goal: ${profile.career_goal || ''}
Skills: ${profile.skills || '[]'}
Experience: ${profile.experience || '[]'}
Education: ${profile.education || '[]'}
Projects: ${profile.projects || '[]'}

Jobs to match:
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company, description: j.description || '' })))}
`;

    const aiRes = await executeAIRequest(prompt, systemPrompt, true);
    const scores = parseAIJSON(aiRes);

    if (!scores) {
      throw new Error('AI Router returned empty structured scoring data');
    }

    res.json(scores);
  } catch (err) {
    console.error('Error in batch match score endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DOCUMENT GENERATION
// ----------------------------------------------------

app.post('/api/documents/generate', authenticateToken, async (req, res) => {
  const { type, jobTitle, company, jobDescription, customQuestions } = req.body;
  if (!type || !jobTitle || !company) {
    return res.status(400).json({ error: 'Document type, job title, and company are required' });
  }

  try {
    const profile = await db.dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (!profile || !profile.name) {
      return res.status(400).json({ error: 'Profile not found. Please complete onboarding first.' });
    }

    let systemPrompt = '';
    let prompt = `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription || ''}\nUser Profile: ${JSON.stringify(profile)}`;

    if (type === 'resume') {
      systemPrompt = `You are an expert resume writer. Generate an optimized version of the user's resume tailored specifically for this job description. Keep the format raw text structured clearly. Optimize bullet points with active verbs and quantitative results where possible.`;
    } else if (type === 'cover_letter') {
      systemPrompt = `You are an expert career assistant. Write a professional, highly engaging Cover Letter tailored to this job description. Use the user's name, experience, and skills. Use standard corporate correspondence formatting.`;
    } else if (type === 'recruiter_message') {
      systemPrompt = `Write a short, professional LinkedIn cold outreach message to a recruiter at the company for this role. Maximize reply rate by keeping it brief, highlighting a matching credential, and asking for a brief conversation.`;
    } else if (type === 'answers') {
      systemPrompt = `Generate structured question-answer pairs for the application questions using the candidate profile. Do not invent facts. Return answers as plain text explanation.`;
      prompt += `\nApplication Questions: ${JSON.stringify(customQuestions || [])}`;
    }

    const content = await executeAIRequest(prompt, systemPrompt, false);
    
    // Save to documents library
    let app = await db.dbGet(
      'SELECT id FROM applications WHERE user_id = ? AND LOWER(company) = ? AND LOWER(role) = ?',
      [req.user.id, company.toLowerCase().trim(), jobTitle.toLowerCase().trim()]
    );

    let appId;
    if (app) {
      appId = app.id;
    } else {
      // Create a draft (Not Applied) application record - do NOT fabricate dates
      const newApp = await db.dbRun(
        'INSERT INTO applications (user_id, company, role, status, date_applied, application_notes) VALUES (?, ?, ?, ?, NULL, ?)',
        [req.user.id, company.trim(), jobTitle.trim(), 'Not Applied', `Documents created for ${company.trim()} - ${jobTitle.trim()}.`]
      );
      appId = newApp.lastID;
    }

    const title = `${type.toUpperCase()} - ${company} (${jobTitle})`;
    const result = await db.dbRun(
      'INSERT INTO documents (user_id, application_id, title, type, content) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, appId, title, type, content]
    );

    res.json({
      id: result.lastID,
      application_id: appId,
      title,
      type,
      content
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
  const { search } = req.query;
  try {
    let sql = 'SELECT * FROM documents WHERE user_id = ?';
    let params = [req.user.id];
    if (search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const docs = await db.dbAll(sql, params);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  const { title, type, content } = req.body;
  if (!title || !type || !content) {
    return res.status(400).json({ error: 'Missing title, type, or content' });
  }
  try {
    let company = 'General';
    let jobTitle = 'Document';
    const match = title.match(/^[^-]+-\s*(.*?)\s*\((.*?)\)$/);
    if (match) {
      company = match[1].trim();
      jobTitle = match[2].trim();
    }

    let app = await db.dbGet(
      'SELECT id FROM applications WHERE user_id = ? AND LOWER(company) = ? AND LOWER(role) = ?',
      [req.user.id, company.toLowerCase(), jobTitle.toLowerCase()]
    );

    let appId;
    if (app) {
      appId = app.id;
    } else {
      const newApp = await db.dbRun(
        'INSERT INTO applications (user_id, company, role, status, date_applied, application_notes) VALUES (?, ?, ?, ?, NULL, ?)',
        [req.user.id, company, jobTitle, 'Not Applied', `Auto-created on document upload of ${title}.`]
      );
      appId = newApp.lastID;
    }

    const result = await db.dbRun(
      'INSERT INTO documents (user_id, application_id, title, type, content) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, appId, title, type, content]
    );
    res.json({ id: result.lastID, application_id: appId, title, type, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    await db.dbRun('DELETE FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Exporter
app.get('/api/documents/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const docRow = await db.dbGet('SELECT * FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!docRow) return res.status(404).json({ error: 'Document not found' });

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(docRow.title, 20, 20);
    doc.line(20, 22, 190, 22);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(docRow.content, 170);
    
    let y = 30;
    splitText.forEach(line => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 5;
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${docRow.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const docRow = await db.dbGet('SELECT * FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!docRow) return res.status(404).json({ error: 'Document not found' });
    res.json(docRow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications/:id/documents', authenticateToken, async (req, res) => {
  try {
    const docs = await db.dbAll(
      'SELECT * FROM documents WHERE user_id = ? AND application_id = ? ORDER BY created_at DESC',
      [req.user.id, req.params.id]
    );
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// APPLICATION HISTORY ENDPOINTS
// ----------------------------------------------------

app.post('/api/applications', authenticateToken, async (req, res) => {
  const {
    company, role, status, notes, resume_version, cover_letter_version, job_url,
    company_logo, job_id, company_url, platform, application_url, location,
    employment_type, work_mode, source_metadata, salary, skills, description, experience
  } = req.body;

  if (!company || !role) {
    return res.status(400).json({ error: 'Company and Role are required' });
  }

  try {
    // 1. Deduplication strategy
    let existingApp = null;
    if (job_id) {
      existingApp = await db.dbGet(
        'SELECT * FROM applications WHERE user_id = ? AND job_id = ? AND company = ?',
        [req.user.id, job_id, company]
      );
    }
    
    if (!existingApp && (job_url || application_url)) {
      existingApp = await db.dbGet(
        `SELECT * FROM applications WHERE user_id = ? AND company = ? AND role = ? 
         AND (job_url = ? OR application_url = ?)`,
        [req.user.id, company, role, job_url || null, application_url || null]
      );
    }

    if (existingApp) {
      return res.json({ ...existingApp, already_exists: true });
    }

    // 2. Resolve company logo and store/cache inside companies table
    const logoResult = await resolveCompanyLogo(company, company_logo, company_url, job_url);
    
    let companyId = null;
    const cleanCompany = company.trim();
    if (cleanCompany) {
      let companyRow = await db.dbGet('SELECT * FROM companies WHERE LOWER(name) = ?', [cleanCompany.toLowerCase()]);
      if (!companyRow) {
        const insertRes = await db.dbRun(
          'INSERT INTO companies (name, domain, logo_url, logo_source) VALUES (?, ?, ?, ?)',
          [cleanCompany, logoResult.domain || null, logoResult.logoUrl || null, logoResult.source || 'None']
        );
        companyId = insertRes.lastID;
      } else {
        companyId = companyRow.id;
        if (!companyRow.logo_url && logoResult.logoUrl) {
          await db.dbRun(
            'UPDATE companies SET logo_url = ?, logo_source = ?, domain = COALESCE(domain, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [logoResult.logoUrl, logoResult.source, logoResult.domain, companyId]
          );
        }
      }
    }

    // 3. Real Platform Detection
    const detectedPlatformInfo = detectPlatform(job_url || application_url, platform);

    // 4. Normalized initial status
    const initialStatus = status || 'Applied';

    // 5. Save application record
    const result = await db.dbRun(`
      INSERT INTO applications (
        user_id, company, role, status, application_notes, resume_version, cover_letter_version,
        job_url, company_logo, job_id, company_url, platform, application_url, location,
        employment_type, work_mode, status_last_checked, status_last_changed, source_metadata,
        salary, skills, description, platform_logo, platform_url, experience, company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      company,
      role,
      initialStatus,
      notes || '',
      resume_version || '',
      cover_letter_version || '',
      job_url || null,
      logoResult.logoUrl || null,
      job_id || null,
      company_url || null,
      detectedPlatformInfo.name,
      application_url || null,
      location || null,
      employment_type || null,
      work_mode || null,
      source_metadata ? JSON.stringify(source_metadata) : null,
      salary || null,
      skills || null,
      description || null,
      detectedPlatformInfo.logo,
      detectedPlatformInfo.url,
      experience || null,
      companyId
    ]);

    const appId = result.lastID;

    // 6. Create initial status-history record
    await db.dbRun(`
      INSERT INTO application_status_history (application_id, previous_status, new_status, source, metadata)
      VALUES (?, NULL, ?, ?, ?)
    `, [
      appId,
      initialStatus,
      detectedPlatformInfo.name || 'Direct',
      JSON.stringify({ note: 'Initial application submission logged' })
    ]);

    // 7. Associate documents automatically by matching company/role inside title or content
    await db.dbRun(`
      UPDATE documents 
      SET application_id = ? 
      WHERE user_id = ? 
        AND application_id IS NULL 
        AND (LOWER(title) LIKE ? AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?))
    `, [
      appId,
      req.user.id,
      `%${company.toLowerCase()}%`,
      `%${role.toLowerCase()}%`,
      `%${role.toLowerCase()}%`
    ]);

    // Retrieve full newly created application
    const newApp = await db.dbGet('SELECT * FROM applications WHERE id = ?', [appId]);
    res.json(newApp);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const https = require('https');
const http = require('http');

function checkUrlExists(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 1500 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

function extractDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname;
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    return host;
  } catch (e) {
    return null;
  }
}

async function resolveCompanyLogo(companyName, clientSuppliedLogo, companyUrl, jobUrl) {
  // 1. Logo URL supplied by the job API/source
  if (clientSuppliedLogo && clientSuppliedLogo.trim().length > 0) {
    return { logoUrl: clientSuppliedLogo, source: 'API/Source' };
  }

  // Extract domain from companyUrl or jobUrl if possible
  let domain = null;
  if (companyUrl) {
    domain = extractDomain(companyUrl);
  }
  if (!domain && jobUrl) {
    const d = extractDomain(jobUrl);
    if (d && !['linkedin.com', 'naukri.com', 'indeed.com', 'glassdoor.com', 'foundit.in', 'foundit.com', 'internshala.com', 'wellfound.com'].some(p => d.includes(p))) {
      domain = d;
    }
  }

  // 2. Existing cached company-logo record
  const cleanName = (companyName || '').trim();
  if (cleanName) {
    const cached = await db.dbGet(
      'SELECT logo_url, logo_source, domain FROM companies WHERE LOWER(name) = ? AND logo_url IS NOT NULL LIMIT 1',
      [cleanName.toLowerCase()]
    );
    if (cached) {
      return { logoUrl: cached.logo_url, source: cached.logo_source || 'Cache', domain: cached.domain || domain };
    }
  }

  // Try to determine domain if still missing
  if (!domain && cleanName) {
    const nameOnly = cleanName.toLowerCase()
      .replace(/\b(inc|co|ltd|corporation|corp|gmbh|llc|limited|pvt|private)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    if (nameOnly) {
      domain = `${nameOnly}.com`;
    }
  }

  if (domain) {
    // 3. Clearbit Logo
    const clearbitUrl = `https://logo.clearbit.com/\${domain}`;
    const exists = await checkUrlExists(clearbitUrl);
    if (exists) {
      return { logoUrl: clearbitUrl, source: 'Clearbit Favicon', domain };
    }

    // 4. Google Favicon
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=\${domain}&sz=128`;
    return { logoUrl: googleFaviconUrl, source: 'Google Favicon', domain };
  }

  return { logoUrl: null, source: 'None', domain: null };
}

// Real Platform Detection Helper
function detectPlatform(url, providedPlatform) {
  let name = providedPlatform || 'Direct';
  let domainUrl = 'https://hirenext.ai';
  let logo = null;

  const testUrl = (url || '').toLowerCase();
  
  if (testUrl.includes('linkedin.com')) {
    name = 'LinkedIn';
    domainUrl = 'https://linkedin.com';
  } else if (testUrl.includes('naukri.com')) {
    name = 'Naukri';
    domainUrl = 'https://naukri.com';
  } else if (testUrl.includes('indeed.com')) {
    name = 'Indeed';
    domainUrl = 'https://indeed.com';
  } else if (testUrl.includes('foundit.in') || testUrl.includes('foundit.com')) {
    name = 'Foundit';
    domainUrl = 'https://foundit.in';
  } else if (testUrl.includes('glassdoor.com') || testUrl.includes('glassdoor.co.in')) {
    name = 'Glassdoor';
    domainUrl = 'https://glassdoor.com';
  } else if (testUrl.includes('careers.google') || testUrl.includes('google.com/about/careers')) {
    name = 'Google Careers';
    domainUrl = 'https://careers.google';
  } else if (testUrl.includes('careers.microsoft') || testUrl.includes('microsoft.com/careers')) {
    name = 'Microsoft Careers';
    domainUrl = 'https://careers.microsoft.com';
  } else if (testUrl.includes('amazon.jobs')) {
    name = 'Amazon Jobs';
    domainUrl = 'https://amazon.jobs';
  } else if (testUrl.includes('metacareers.com') || testUrl.includes('careers.meta.com')) {
    name = 'Meta Careers';
    domainUrl = 'https://careers.meta.com';
  } else if (testUrl.includes('careers.apple')) {
    name = 'Apple Careers';
    domainUrl = 'https://careers.apple.com';
  } else if (testUrl.includes('wellfound.com') || testUrl.includes('angel.co')) {
    name = 'Wellfound';
    domainUrl = 'https://wellfound.com';
  } else if (testUrl.includes('internshala.com')) {
    name = 'Internshala';
    domainUrl = 'https://internshala.com';
  } else if (testUrl.includes('hirenext.ai')) {
    name = 'HireNextAI AI Apply';
    domainUrl = 'https://hirenext.ai';
  } else if (testUrl.includes('careers') || testUrl.includes('job')) {
    name = 'Company Careers';
    try {
      const parsed = new URL(url);
      domainUrl = parsed.protocol + '//' + parsed.hostname;
    } catch(e) {}
  } else if (url) {
    try {
      const parsed = new URL(url);
      name = parsed.hostname.replace('www.', '');
      domainUrl = parsed.protocol + '//' + parsed.hostname;
    } catch(e) {}
  }
  
  return { name, logo, url: domainUrl };
}

app.get('/api/applications', authenticateToken, async (req, res) => {
  const { search, status, sort } = req.query;
  try {
    // 1. Build dynamic sort order query block
    let orderBy = 'ORDER BY COALESCE(a.status_last_changed, a.date_applied, a.created_at) DESC, a.id DESC';
    if (sort === 'Newest') {
      orderBy = 'ORDER BY a.date_applied DESC, a.id DESC';
    } else if (sort === 'Oldest') {
      orderBy = 'ORDER BY a.date_applied ASC, a.id ASC';
    } else if (sort === 'Status') {
      orderBy = 'ORDER BY a.status ASC, a.id DESC';
    } else if (sort === 'Company') {
      orderBy = 'ORDER BY LOWER(a.company) ASC, a.role ASC';
    }

    // 2. Fetch applications for the authenticated user (left joining companies cache)
    const list = await db.dbAll(
      `SELECT a.*, c.logo_url AS cached_logo, c.domain AS company_domain
       FROM applications a
       LEFT JOIN companies c ON a.company_id = c.id
       WHERE a.user_id = ? ${orderBy}`,
      [req.user.id]
    );
    
    // 3. Fetch all documents for this user
    const userDocs = await db.dbAll(
      'SELECT id, application_id, title, type, content, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Group documents by application_id
    const docsByApp = {};
    userDocs.forEach(doc => {
      if (doc.application_id) {
        if (!docsByApp[doc.application_id]) {
          docsByApp[doc.application_id] = [];
        }
        docsByApp[doc.application_id].push(doc);
      }
    });

    // 4. Fetch status history records for this user's applications
    const userHistory = await db.dbAll(
      `SELECT h.* 
       FROM application_status_history h
       JOIN applications a ON h.application_id = a.id
       WHERE a.user_id = ?
       ORDER BY h.detected_at ASC, h.id ASC`,
      [req.user.id]
    );

    // Group status history by application_id
    const historyByApp = {};
    userHistory.forEach(hist => {
      if (!historyByApp[hist.application_id]) {
        historyByApp[hist.application_id] = [];
      }
      historyByApp[hist.application_id].push(hist);
    });

    // 5. Embed documents & status history into application records
    list.forEach(app => {
      if (app.cached_logo) {
        app.company_logo = app.cached_logo;
      }
      app.documents = docsByApp[app.id] || [];
      app.status_history = historyByApp[app.id] || [];
    });

    // 6. Perform live search and status filters
    let filteredList = list;

    // Filter by status if query parameter present and not 'All'
    if (status && status !== 'All') {
      const targetStatus = status.toLowerCase().trim();
      filteredList = filteredList.filter(app => 
        app.status && app.status.toLowerCase().trim() === targetStatus
      );
    }

    // Filter by search terms
    if (search) {
      const q = search.toLowerCase().trim();
      filteredList = filteredList.filter(app => {
        const companyMatch = app.company && app.company.toLowerCase().includes(q);
        const roleMatch = app.role && app.role.toLowerCase().includes(q);
        const notesMatch = app.application_notes && app.application_notes.toLowerCase().includes(q);
        const platformMatch = app.platform && app.platform.toLowerCase().includes(q);
        const locationMatch = app.location && app.location.toLowerCase().includes(q);
        const statusMatch = app.status && app.status.toLowerCase().includes(q);
        const skillsMatch = app.skills && app.skills.toLowerCase().includes(q);
        const docMatch = app.documents.some(doc => 
          (doc.title && doc.title.toLowerCase().includes(q)) || 
          (doc.type && doc.type.toLowerCase().includes(q))
        );
        return companyMatch || roleMatch || notesMatch || platformMatch || locationMatch || statusMatch || skillsMatch || docMatch;
      });
    }

    res.json(filteredList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function sendStatusChangeEmail(to, app, oldStatus, newStatus) {
  const appName = process.env.APP_NAME || 'HireNextAI';
  const appUrl = process.env.APP_URL || 'http://localhost:5000';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@hirenext.ai';
  const privacyUrl = process.env.PRIVACY_URL || 'https://hirenext.ai/privacy';
  const fromName = process.env.EMAIL_FROM_NAME || 'HireNextAI';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'notifications@hirenext.ai';

  const subject = `Your ${app.company} application moved to ${newStatus}`;
  
  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #111111; padding: 40px 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ECECEC; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px; margin: 0 auto; display: block;">
          <circle cx="50" cy="50" r="7" fill="#111111"/>
          <path d="M 50 50 V 25 H 35" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 50 38 H 63" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="34" cy="25" r="3.5" fill="#111111"/>
          <circle cx="63" cy="38" r="3.5" fill="#111111"/>
          <path d="M 50 50 H 75 V 35" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 62 50 V 63" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="75" cy="35" r="3.5" fill="#111111"/>
          <circle cx="62" cy="63" r="3.5" fill="#111111"/>
          <path d="M 50 50 V 75 H 65" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 50 62 H 37" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="65" cy="75" r="3.5" fill="#111111"/>
          <circle cx="37" cy="62" r="3.5" fill="#111111"/>
          <path d="M 50 50 H 25 V 65" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 38 50 V 37" fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="25" cy="65" r="3.5" fill="#111111"/>
          <circle cx="38" cy="37" r="3.5" fill="#111111"/>
        </svg>
      </div>

      <h2 style="font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 24px; letter-spacing: -0.02em;">Application Update</h2>
      
      <div style="border: 1px solid #ECECEC; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 18px; font-weight: 700; color: #111111; margin-bottom: 4px;">${app.company}</div>
        <div style="font-size: 15px; color: #666666; margin-bottom: 12px;">${app.role}</div>
        <p style="font-size: 14px; color: #333333; margin: 0 0 16px 0; line-height: 1.5;">Your application status has changed.</p>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; border-top: 1px solid #ECECEC; padding-top: 12px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999999; font-weight: 600;">Previous</div>
            <div style="font-size: 14px; font-weight: 600; color: #666666; text-decoration: line-through;">${oldStatus}</div>
          </div>
          <div style="font-size: 20px; color: #CCCCCC; padding: 0 10px;">&rarr;</div>
          <div style="flex: 1;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999999; font-weight: 600;">New</div>
            <div style="font-size: 14px; font-weight: 600; color: #111111;">${newStatus}</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${appUrl}/profile/${app.user_id}/applications" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">View Application</a>
      </div>

      <div style="border-top: 1px solid #ECECEC; padding-top: 20px; text-align: center; font-size: 12px; color: #999999; line-height: 1.6;">
        <div style="margin-bottom: 8px;">Applied via ${app.platform || 'Direct'} &bull; Last updated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</div>
        <div>Support: <a href="mailto:${supportEmail}" style="color: #666666; text-decoration: underline;">${supportEmail}</a> &bull; <a href="${privacyUrl}" style="color: #666666; text-decoration: underline;">Privacy Policy</a></div>
      </div>
    </div>
  `;

  console.log(`[Email SMTP Dispatched] From: ${fromName} <${fromAddress}> | To: ${to} | Subject: ${subject}`);
  console.log(`HTML Body:\n${bodyHtml}`);

  db.dbRun(`
    INSERT INTO notifications (user_id, application_id, event, recipient, delivery_status, provider_message_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [app.user_id, app.id, 'status_change', to, 'delivered', 'msg_' + crypto.randomBytes(8).toString('hex')]).catch(err => {
    console.error('Error logging notification in DB:', err);
  });
}

app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  const { status, notes } = req.body;
  try {
    const existing = await db.dbGet(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const oldStatus = existing.status;
    const isStatusChanged = status && status !== oldStatus;

    if (isStatusChanged) {
      // 1. Update current application status and change timestamp
      await db.dbRun(
        `UPDATE applications 
         SET status = ?, 
             application_notes = ?, 
             status_last_changed = CURRENT_TIMESTAMP, 
             status_last_checked = CURRENT_TIMESTAMP 
         WHERE id = ? AND user_id = ?`,
        [status, notes !== undefined ? notes : existing.application_notes, req.params.id, req.user.id]
      );

      // 2. Insert status-history record
      await db.dbRun(
        `INSERT INTO application_status_history (application_id, previous_status, new_status, source, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, oldStatus, status, 'User/API', JSON.stringify({ note: 'Status manually updated or synchronized' })]
      );

      // 3. Trigger branded transaction email
      const user = await db.dbGet('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (user && user.email) {
        sendStatusChangeEmail(user.email, { ...existing, id: req.params.id }, oldStatus, status);
      }
    } else {
      // Just update notes and last_checked
      await db.dbRun(
        `UPDATE applications 
         SET application_notes = ?, 
             status_last_checked = CURRENT_TIMESTAMP 
         WHERE id = ? AND user_id = ?`,
        [notes !== undefined ? notes : existing.application_notes, req.params.id, req.user.id]
      );
    }

    const updatedApp = await db.dbGet('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json(updatedApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
  try {
    await db.dbRun('DELETE FROM applications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SETTINGS ENDPOINTS
// ----------------------------------------------------

app.post('/api/settings/delete-account', authenticateToken, async (req, res) => {
  try {
    await db.dbRun('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const list = await db.dbAll('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EXTENSION V1 HELPERS & ENGINES
// ----------------------------------------------------

// Email confirmation sender (SMTP Mockup)
function sendEmailNotification(to, company, role) {
  console.log(`[Email SMTP Dispatched] To: ${to} | Subject: HirenextAI Confirmation - Applied to ${role} at ${company}`);
  console.log(`Body: Hi there, this is to confirm we successfully logged your application for the ${role} position at ${company}. Keep track of your progress directly from the HirenextAI Extension dashboard!`);
}

// WhatsApp notification stub
function notifyWhatsApp(phone, company, role) {
  console.log(`[WhatsApp API Stub] Dispatching notification message to ${phone}: "Your application for ${role} at ${company} has been logged!"`);
  // TODO: Integrate WhatsApp Business API in future sprint.
}

app.post('/api/extension/session', authenticateToken, (req, res) => {
  res.json({
    loggedIn: true,
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
});

app.get('/api/user/resume-status', authenticateToken, async (req, res) => {
  try {
    const profile = await db.dbGet('SELECT name FROM profiles WHERE user_id = ?', [req.user.id]);
    res.json({
      hasResume: !!(profile && profile.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/extension/map-fields', authenticateToken, async (req, res) => {
  const { fieldsSchema } = req.body;
  if (!fieldsSchema || !Array.isArray(fieldsSchema)) {
    return res.status(400).json({ error: 'fieldsSchema must be an array of fields' });
  }

  try {
    const profile = await db.dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (!profile || !profile.name) {
      return res.status(400).json({ error: 'Profile not found. Please upload or build your resume first.' });
    }

    const systemPrompt = `You are a recruitment screening AI. Match the user's resume data with a set of form questions from an online application.
Task: For each form field in the schema, resolve its best matching value based on the user profile.
If a field cannot be confidently resolved (e.g. custom situational question, or missing profile details), return null for that field.

You MUST respond with a single valid JSON object following this schema exactly:
{
  "mapping": {
    "Field Label or ID": "Resolved Value",
    "Another Label": null
  },
  "confidence": {
    "Field Label or ID": "high" | "medium" | "low"
  }
}`;

    const prompt = `
User Profile:
- Name: ${profile.name}
- Email: ${profile.email || ''}
- Phone: ${profile.phone || ''}
- Skills: ${profile.skills || '[]'}
- Education: ${profile.education || '[]'}
- Experience: ${profile.experience || '[]'}
- Projects: ${profile.projects || '[]'}
- Certifications: ${profile.certifications || '[]'}
- Languages: ${profile.languages || '[]'}
- Career Goal: ${profile.career_goal || ''}

Application Form Fields:
${JSON.stringify(fieldsSchema, null, 2)}
`;

    const aiRes = await executeAIRequest(prompt, systemPrompt, true);
    const result = parseAIJSON(aiRes);

    if (!result || !result.mapping) {
      throw new Error('AI Router failed to return expected field mapping structure');
    }

    // Identify low confidence fields to return to the extension
    const lowConfidenceFields = [];
    if (result.confidence) {
      Object.keys(result.confidence).forEach(key => {
        if (result.confidence[key] === 'low' || result.mapping[key] === null) {
          lowConfidenceFields.push(key);
        }
      });
    }

    res.json({
      mapping: result.mapping,
      lowConfidenceFields
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/extension/log-application', authenticateToken, async (req, res) => {
  const {
    company, role, status, notes,
    company_logo, job_id, company_url, platform, application_url, location,
    employment_type, work_mode, source_metadata, job_url, salary, skills, description, experience
  } = req.body;

  if (!company || !role) {
    return res.status(400).json({ error: 'Company and Role are required' });
  }

  try {
    // 1. Deduplication strategy
    let existingApp = null;
    const cleanCompany = company.trim();
    const cleanRole = role.trim();

    if (job_id) {
      existingApp = await db.dbGet(
        'SELECT * FROM applications WHERE user_id = ? AND job_id = ? AND company = ?',
        [req.user.id, job_id, cleanCompany]
      );
    }
    
    if (!existingApp && (job_url || application_url)) {
      existingApp = await db.dbGet(
        `SELECT * FROM applications WHERE user_id = ? AND company = ? AND role = ? 
         AND (job_url = ? OR application_url = ?)`,
        [req.user.id, cleanCompany, cleanRole, job_url || null, application_url || null]
      );
    }

    // Fallback: check matching not-applied state
    if (!existingApp) {
      existingApp = await db.dbGet(
        'SELECT * FROM applications WHERE user_id = ? AND LOWER(company) = ? AND LOWER(role) = ? AND status = ?',
        [req.user.id, cleanCompany.toLowerCase(), cleanRole.toLowerCase(), 'Not Applied']
      );
    }

    // Logo Cache and Domain Resolution
    const logoResult = await resolveCompanyLogo(cleanCompany, company_logo, company_url, job_url);
    
    let companyId = null;
    if (cleanCompany) {
      let companyRow = await db.dbGet('SELECT * FROM companies WHERE LOWER(name) = ?', [cleanCompany.toLowerCase()]);
      if (!companyRow) {
        const insertRes = await db.dbRun(
          'INSERT INTO companies (name, domain, logo_url, logo_source) VALUES (?, ?, ?, ?)',
          [cleanCompany, logoResult.domain || null, logoResult.logoUrl || null, logoResult.source || 'None']
        );
        companyId = insertRes.lastID;
      } else {
        companyId = companyRow.id;
        if (!companyRow.logo_url && logoResult.logoUrl) {
          await db.dbRun(
            'UPDATE companies SET logo_url = ?, logo_source = ?, domain = COALESCE(domain, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [logoResult.logoUrl, logoResult.source, logoResult.domain, companyId]
          );
        }
      }
    }

    // Real Platform Detection
    const detectedPlatformInfo = detectPlatform(job_url || application_url, platform);

    let lastID;
    const finalStatus = status || 'Applied';

    if (existingApp) {
      // Update existing
      await db.dbRun(
        `UPDATE applications 
         SET status = ?, 
              date_applied = CURRENT_TIMESTAMP, 
              application_notes = ?,
              company_logo = COALESCE(company_logo, ?),
              job_id = COALESCE(job_id, ?),
              company_url = COALESCE(company_url, ?),
              platform = COALESCE(platform, ?),
              application_url = COALESCE(application_url, ?),
              location = COALESCE(location, ?),
              employment_type = COALESCE(employment_type, ?),
              work_mode = COALESCE(work_mode, ?),
              status_last_checked = CURRENT_TIMESTAMP,
              status_last_changed = CURRENT_TIMESTAMP,
              salary = COALESCE(salary, ?),
              skills = COALESCE(skills, ?),
              description = COALESCE(description, ?),
              platform_logo = COALESCE(platform_logo, ?),
              platform_url = COALESCE(platform_url, ?),
              experience = COALESCE(experience, ?),
              company_id = COALESCE(company_id, ?)
         WHERE id = ?`,
        [
          finalStatus,
          notes || existingApp.application_notes || 'Submitted via Chrome Extension.',
          logoResult.logoUrl || null,
          job_id || null,
          company_url || null,
          detectedPlatformInfo.name,
          application_url || null,
          location || null,
          employment_type || null,
          work_mode || null,
          salary || null,
          skills || null,
          description || null,
          detectedPlatformInfo.logo,
          detectedPlatformInfo.url,
          experience || null,
          companyId,
          existingApp.id
        ]
      );
      lastID = existingApp.id;

      // Add status history entry
      await db.dbRun(`
        INSERT INTO application_status_history (application_id, previous_status, new_status, source, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [
        lastID,
        existingApp.status,
        finalStatus,
        detectedPlatformInfo.name || 'Chrome Extension',
        JSON.stringify({ note: 'Application updated via Chrome Extension tracker' })
      ]);

    } else {
      // Create new
      const result = await db.dbRun(`
        INSERT INTO applications (
          user_id, company, role, status, date_applied, application_notes,
          company_logo, job_id, company_url, platform, application_url, location,
          employment_type, work_mode, status_last_checked, status_last_changed, source_metadata, job_url,
          salary, skills, description, platform_logo, platform_url, experience, company_id
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        cleanCompany,
        cleanRole,
        finalStatus,
        notes || '',
        logoResult.logoUrl || null,
        job_id || null,
        company_url || null,
        detectedPlatformInfo.name,
        application_url || null,
        location || null,
        employment_type || null,
        work_mode || null,
        source_metadata ? JSON.stringify(source_metadata) : null,
        job_url || null,
        salary || null,
        skills || null,
        description || null,
        detectedPlatformInfo.logo,
        detectedPlatformInfo.url,
        experience || null,
        companyId
      ]);
      lastID = result.lastID;

      // Add status history entry
      await db.dbRun(`
        INSERT INTO application_status_history (application_id, previous_status, new_status, source, metadata)
        VALUES (?, NULL, ?, ?, ?)
      `, [
        lastID,
        finalStatus,
        detectedPlatformInfo.name || 'Chrome Extension',
        JSON.stringify({ note: 'Application created via Chrome Extension tracker' })
      ]);
    }

    // Associate documents automatically by matching company/role
    await db.dbRun(`
      UPDATE documents 
      SET application_id = ? 
      WHERE user_id = ? 
        AND application_id IS NULL 
        AND (LOWER(title) LIKE ? AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?))
    `, [
      lastID,
      req.user.id,
      `%${cleanCompany.toLowerCase()}%`,
      `%${cleanRole.toLowerCase()}%`,
      `%${cleanRole.toLowerCase()}%`
    ]);

    const profile = await db.dbGet('SELECT email, phone FROM profiles WHERE user_id = ?', [req.user.id]);
    
    // Email updates
    const userEmail = profile?.email || req.user.email;
    sendEmailNotification(userEmail, cleanCompany, cleanRole);

    // WhatsApp updates
    const phone = profile?.phone || '';
    if (phone) {
      notifyWhatsApp(phone, cleanCompany, cleanRole);
    }

    res.json({ id: lastID, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// OWNER COMMAND PANEL ENDPOINTS
// ----------------------------------------------------

app.get('/api/owner/stats', authenticateToken, requireOwner, async (req, res) => {
  try {
    const usersCount = await db.dbGet('SELECT count(*) as total FROM users WHERE role = "user"');
    const providers = await db.dbAll('SELECT id, name, priority, status, health, latency, requests, errors FROM ai_providers');
    
    // Aggregate request metrics
    let totalRequests = 0;
    let totalErrors = 0;
    providers.forEach(p => {
      totalRequests += p.requests;
      totalErrors += p.errors;
    });

    res.json({
      totalUsers: usersCount.total,
      totalRequests,
      totalErrors,
      providers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/owner/users', authenticateToken, requireOwner, async (req, res) => {
  try {
    const list = await db.dbAll('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/owner/providers', authenticateToken, requireOwner, async (req, res) => {
  try {
    const list = await db.dbAll('SELECT id, name, priority, status, health, latency, requests, errors, last_used, last_success FROM ai_providers');
    // Hide actual keys for UI listing, but return indicator if present
    const maskedList = list.map(p => ({
      ...p,
      hasKey: !!p.api_key
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/owner/providers', authenticateToken, requireOwner, async (req, res) => {
  const { id, api_key, priority, status } = req.body;
  if (!id) return res.status(400).json({ error: 'Provider ID is required' });

  try {
    // If api_key is provided, update it. Otherwise keep existing.
    if (api_key !== undefined) {
      await db.dbRun(
        'UPDATE ai_providers SET api_key = ?, priority = ?, status = ?, health = "healthy" WHERE id = ?',
        [api_key, priority, status, id]
      );
    } else {
      await db.dbRun(
        'UPDATE ai_providers SET priority = ?, status = ? WHERE id = ?',
        [priority, status, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/owner/providers/test', authenticateToken, requireOwner, async (req, res) => {
  const { id } = req.body;
  try {
    const provider = await db.dbGet('SELECT * FROM ai_providers WHERE id = ?', [id]);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (!provider.api_key) return res.status(400).json({ error: 'No API Key configured' });

    // Temporarily make a simple request to verify the key
    const testPrompt = "Return the word SUCCESS.";
    const startTime = Date.now();
    
    // We execute AI directly with this specific provider logic to verify
    const { executeAIRequest } = require('./ai');
    // Save current active key status in DB for testing, trigger run
    const resultText = await executeAIRequest(testPrompt, "You are a test runner.");
    const latency = Date.now() - startTime;

    if (resultText && resultText.includes('SUCCESS')) {
      await db.dbRun(
        'UPDATE ai_providers SET health = "healthy", latency = ?, last_success = CURRENT_TIMESTAMP WHERE id = ?',
        [latency, id]
      );
      res.json({ success: true, latency });
    } else {
      throw new Error('Verification failed. Unexpected AI output.');
    }
  } catch (err) {
    await db.dbRun('UPDATE ai_providers SET health = "unhealthy" WHERE id = ?', [id]);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/owner/announcements', authenticateToken, requireOwner, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Announcement message is required' });

  try {
    await db.dbRun('INSERT INTO announcements (message) VALUES (?)', [message]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resumes/default/raw', authenticateToken, async (req, res) => {
  try {
    const resume = await db.dbGet('SELECT file_path FROM resumes WHERE user_id = ? AND is_default = 1', [req.user.id]);
    if (!resume) {
      const latest = await db.dbGet('SELECT file_path FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
      if (!latest) return res.status(404).json({ error: 'No resume uploaded yet' });
      return res.sendFile(latest.file_path);
    }
    return res.sendFile(resume.file_path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/profile/:userId/documents', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HirenextAI - Applications & Documents</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #ffffff;
          --bg-card: rgba(255, 255, 255, 0.7);
          --card-border: #e5e7eb;
          --accent-primary: #0a0a0a;
          --accent-glow: #f5f5f5;
          --text-main: #111111;
          --text-muted: #6b7280;
          --text-secondary: #6b7280;
          --status-applied: #16a34a;
          --status-interviewing: #2563eb;
          --status-rejected: #dc2626;
          --status-draft: #6b7280;
        }

        .preview-badge {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #111111;
          background: #f5f5f5;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 2px 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 12px;
          vertical-align: middle;
          animation: pulse-badge 2s infinite ease-in-out;
        }
        @keyframes pulse-badge {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; transform: scale(1.02); }
        }

        body {
          margin: 0;
          padding: 0;
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Layout Structure */
        #dashboard-layout {
          display: flex;
          flex: 1;
          min-height: 100vh;
        }

        /* Sidebar styles */
        /* Sidebar styles */
        .sidebar {
          width: 300px;
          min-width: 300px;
          background: #ffffff;
          border-right: 1px solid #ECECEC;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          box-sizing: border-box;
          transition: width 340ms cubic-bezier(0.22, 1, 0.36, 1), min-width 340ms cubic-bezier(0.22, 1, 0.36, 1), padding 340ms cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
          z-index: 200;
        }

        .sidebar.collapsed {
          width: 72px;
          min-width: 72px;
          padding: 24px 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 0 8px;
          box-sizing: border-box;
          transition: flex-direction 0.22s ease, gap 0.22s ease;
        }

        .sidebar.collapsed .sidebar-header {
          flex-direction: column;
          gap: 16px;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
          width: 100%;
        }

        .sidebar.collapsed .sidebar-brand {
          justify-content: center;
        }

        .sidebar-brand-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-brand-left {
          gap: 0;
          justify-content: center;
          overflow: visible;
        }

        /* Sidebar Logo Container & Interactive Elements */
        .sidebar-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          cursor: default;
          pointer-events: none;
          background: transparent;
          border: none;
          box-shadow: none;
          transition: background-color 180ms ease, transform 180ms ease;
          user-select: none;
          -webkit-user-select: none;
          flex-shrink: 0;
        }

        /* ONLY interactive when collapsed */
        .sidebar.collapsed .sidebar-logo-container {
          cursor: pointer;
          pointer-events: auto;
        }

        .sidebar.collapsed .sidebar-logo-container:hover {
          background-color: rgba(0, 0, 0, 0.035);
          transform: scale(1.04);
        }

        /* Logo Click Feedback Press Animation */
        @keyframes logoPress {
          0% { transform: scale(1); }
          40% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }

        .logo-pressing {
          animation: logoPress 100ms ease-in-out 1;
        }

        /* Close Button Styling */
        .sidebar-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          min-width: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }

        .sidebar-close-btn:hover {
          background-color: #F5F5F5;
          color: var(--text-main);
        }

        .sidebar.collapsed .sidebar-close-btn {
          display: none !important;
        }

        .logo-svg {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          transition: transform 0.2s ease;
          overflow: visible;
        }

        .logo-svg .center-dot {
          fill: #111111;
          stroke: none;
          transform-origin: 50px 50px;
          transition: transform 0.2s ease;
        }

        .logo-svg .line {
          fill: none;
          stroke: #111111;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 50;
          stroke-dashoffset: 0;
          opacity: 1;
        }

        .logo-svg .dot {
          fill: #111111;
          stroke: none;
          transform-origin: center;
          opacity: 1;
          transition: transform 0.2s ease;
        }

        /* Logo Network Animation Transitions */
        @keyframes centerPop {
          0% { transform: scale(0.5); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes lineDraw {
          0% { stroke-dashoffset: 50; opacity: 0; }
          15% { opacity: 1; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes dotPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .logo-interacting .center-dot {
          animation: centerPop 750ms cubic-bezier(0.22, 1, 0.36, 1) 1;
        }

        /* Staggered Line Sweeps */
        .logo-interacting .line {
          animation: lineDraw 600ms cubic-bezier(0.22, 1, 0.36, 1) 1;
        }
        .logo-interacting .line-top { animation-delay: 0ms; }
        .logo-interacting .line-right { animation-delay: 35ms; }
        .logo-interacting .line-bottom { animation-delay: 70ms; }
        .logo-interacting .line-left { animation-delay: 105ms; }

        /* Staggered Dot Pops */
        .logo-interacting .dot {
          animation: dotPop 400ms cubic-bezier(0.22, 1, 0.36, 1) 1;
        }
        .logo-interacting .dot-t1 { transform-origin: 63px 38px; animation-delay: 300ms; }
        .logo-interacting .dot-t2 { transform-origin: 35px 25px; animation-delay: 300ms; }
        .logo-interacting .dot-r1 { transform-origin: 62px 63px; animation-delay: 335ms; }
        .logo-interacting .dot-r2 { transform-origin: 75px 35px; animation-delay: 335ms; }
        .logo-interacting .dot-b1 { transform-origin: 37px 62px; animation-delay: 370ms; }
        .logo-interacting .dot-b2 { transform-origin: 65px 75px; animation-delay: 370ms; }
        .logo-interacting .dot-l1 { transform-origin: 38px 37px; animation-delay: 405ms; }
        .logo-interacting .dot-l2 { transform-origin: 25px 65px; animation-delay: 405ms; }

        /* Reduced Motion Rules */
        @media (prefers-reduced-motion: reduce) {
          .sidebar {
            transition: none !important;
          }
          .sidebar-logo-container,
          .sidebar-logo-container:hover .logo-svg,
          .sidebar-logo-container:active {
            transform: none !important;
            transition: none !important;
          }
          .logo-interacting * {
            animation: none !important;
          }
          .sidebar-brand-text,
          .sidebar-menu-item span {
            transition: none !important;
            transform: none !important;
          }
        }

        .sidebar-brand-text {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-main);
          opacity: 1;
          transform: translateX(0);
          transition: opacity 220ms ease, transform 220ms ease;
          transition-delay: 150ms;
          width: auto;
          white-space: nowrap;
        }

        .sidebar.collapsed-text .sidebar-brand-text {
          opacity: 0;
          transform: translateX(-8px);
          transition-delay: 0s;
          width: 0;
          pointer-events: none;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-menu-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
          white-space: nowrap;
        }

        .sidebar-menu-item svg {
          min-width: 18px;
        }

        .sidebar-menu-item span {
          margin-left: 12px;
          transform: translateX(0);
          opacity: 1;
          display: inline-block;
          transition: opacity 220ms ease, transform 220ms ease, width 220ms ease, margin-left 220ms ease;
          transition-delay: 190ms;
          white-space: nowrap;
        }

        .sidebar-menu-item:hover {
          color: var(--text-main);
          background: rgba(0, 0, 0, 0.02);
        }

        .sidebar-menu-item.active {
          color: var(--accent-primary);
          background: var(--accent-glow);
          border-left: 3px solid var(--accent-primary);
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }

        .sidebar.collapsed .sidebar-menu-item {
          padding: 12px;
          justify-content: center;
        }

        .sidebar.collapsed-menu .sidebar-menu-item span {
          opacity: 0;
          transform: translateX(-6px);
          width: 0;
          margin-left: 0;
          transition-delay: 0s;
          pointer-events: none;
          visibility: hidden;
        }

        .sidebar-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-toggle-btn:hover {
          background: rgba(0, 0, 0, 0.02);
          color: var(--text-main);
        }

        /* Tooltip styles */
        [data-tooltip] {
          position: relative;
        }

        [data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 110%;
          top: 50%;
          transform: translateY(-50%) scale(0.9);
          background: #111111;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        [data-tooltip]:hover::after {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }

        /* Only show Documents tooltip when collapsed */
        .sidebar:not(.collapsed) .sidebar-menu-item[data-tooltip]::after {
          display: none !important;
        }

        .sidebar.collapsed .toggle-icon-close {
          display: none !important;
        }
        .sidebar.collapsed .toggle-icon-open {
          display: block !important;
        }
        .sidebar:not(.collapsed) .toggle-icon-close {
          display: block !important;
        }
        .sidebar:not(.collapsed) .toggle-icon-open {
          display: none !important;
        }

        /* Main panel styles */
        .main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        /* Header section */
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 40px;
          height: 48px;
          border-bottom: 1px solid var(--card-border);
          background: #ffffff;
          z-index: 100;
          box-sizing: border-box;
        }

        .user-profile-widget {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid var(--card-border);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--accent-primary);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .user-name-text {
          font-size: 13px;
          font-weight: 600;
        }

        .logout-link {
          font-size: 10px;
          color: var(--text-muted);
          text-decoration: none;
          cursor: pointer;
        }

        .logout-link:hover {
          color: var(--status-rejected);
        }

        /* Keyframes for entrance and empty float animations */
        @keyframes headingFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInOnly {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes toolbarFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes iconFloat {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
          100% {
            transform: translateY(0);
          }
        }

        /* Container & Toolbar */
        main {
          flex: 1;
          max-width: 1200px;
          width: 100%;
          margin: 24px auto;
          padding: 0 40px;
          box-sizing: border-box;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .dashboard-title h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 700;
          color: #111111;
          letter-spacing: -0.5px;
          opacity: 0;
          animation: headingFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .dashboard-title p {
          margin: 8px 0 0 0;
          color: #555555;
          font-size: 16px;
          opacity: 0;
          animation: fadeInOnly 0.4s ease-out forwards;
          animation-delay: 0.1s;
        }

        /* Toolbar Search and Filters */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
          opacity: 0;
          animation: toolbarFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.16s;
        }

        /* Animated Search Bar Container */
        .search-bar-container {
          position: relative;
          z-index: 50;
          border-radius: 32px;
          height: 40px;
          width: 420px; /* Always open */
          max-width: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: transparent;
          cursor: default;
          border: none;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
        }

        /* Traveling Border Line CSS - Colorful Rotating Line */
        .border-animation-line {
          position: absolute;
          inset: -150%;
          border-radius: 32px;
          background: conic-gradient(from 0deg, #FF7F50, #FF3366, #9933FF, #00C9FF, #FF7F50);
          opacity: 1; /* Always visible */
          z-index: 0;
          pointer-events: none;
          animation: rotateBorder 3s linear infinite; /* Always running */
        }

        @keyframes rotateBorder {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Inner Search Background */
        .search-inner-bg {
          position: absolute;
          inset: 2px; /* 2px gap to show the gradient border line */
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 30px;
          z-index: 1;
        }

        /* Content Container */
        .search-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0;
        }

        .search-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-main);
          position: relative;
          cursor: pointer;
        }

        .search-icon-svg {
          transition: opacity 250ms ease, transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes scanIcon {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(0.8) rotate(-15deg); }
          70% { transform: scale(1.15) rotate(15deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .search-icon-svg.scanning {
          animation: scanIcon 600ms ease-in-out;
        }

        /* Input field styles */
        .animated-search-input {
          border: none;
          background: transparent;
          height: 100%;
          width: calc(100% - 40px);
          opacity: 1;
          padding: 0 14px 0 0;
          outline: none;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-main);
          box-sizing: border-box;
        }

        /* Card Stagger Entrance override with spring jump animation */
        @keyframes cardJump {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.90);
            filter: blur(4px);
          }
          50% {
            opacity: 1;
            transform: translateY(2px) scale(1.05); /* overshoot */
            filter: blur(0);
          }
          75% {
            transform: translateY(-1px) scale(0.98); /* rebound */
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1.00); /* settle */
            filter: blur(0);
          }
        }

        .app-card {
          opacity: 0;
          transform: translateY(-20px) scale(0.90);
          filter: blur(4px);
          animation: none !important;
          will-change: opacity, transform, filter;
        }

        .app-card.emerged {
          animation: cardJump 550ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .app-card.settled {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
          filter: none !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease !important;
        }

        .app-card.settled:hover {
          transform: translateY(-3px) scale(1.01) !important;
        }

        .toolbar-filters {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Reusable Animated Border Dropdown Container */
        .animated-select-container {
          position: relative;
          z-index: 40;
          border-radius: 10px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          background: transparent;
          cursor: pointer;
          border: none;
          min-width: 170px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
          transition: box-shadow 0.2s ease;
        }

        .animated-select-container:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .select-inner-bg {
          position: absolute;
          inset: 2px;
          background: #ffffff;
          border-radius: 8px;
          z-index: 1;
          pointer-events: none;
          transition: background 0.2s ease;
        }

        .animated-select-container:hover .select-inner-bg {
          background: #f8f8f8;
        }

        .custom-dropdown {
          position: relative;
          display: inline-block;
        }

        .select-trigger-content {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
          user-select: none;
          gap: 8px;
        }

        .dropdown-chevron {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
          color: #71717a;
          flex-shrink: 0;
        }

        .custom-dropdown.open .dropdown-chevron {
          transform: rotate(180deg);
        }

        /* Floating Premium Dropdown Menu */
        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 100;
          background: #ffffff;
          border: 1px solid var(--card-border);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          min-width: 190px;
          padding: 6px 0;
          margin: 0;
          opacity: 0;
          transform: scale(0.97) translateY(-4px);
          pointer-events: none;
          visibility: hidden;
          display: none;
          transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                      visibility 180ms cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }

        .custom-dropdown-menu.show {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
          visibility: visible;
        }

        .custom-dropdown-menu.hiding {
          opacity: 0;
          transform: scale(0.98) translateY(-3px);
          pointer-events: none;
          visibility: hidden;
          transition: opacity 150ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 150ms cubic-bezier(0.22, 1, 0.36, 1),
                      visibility 150ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Dropdown Option Items */
        .custom-dropdown-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          user-select: none;
          gap: 8px;
          outline: none;
        }

        .custom-dropdown-item:hover, .custom-dropdown-item:focus {
          background: #f4f4f5;
          color: var(--text-main);
        }

        .custom-dropdown-item.selected {
          background: #f5f5f5;
          color: #111111;
          font-weight: 600;
        }

        .custom-dropdown-item-checkmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          font-size: 11px;
          font-weight: 700;
          color: #111111;
          opacity: 0;
        }

        .custom-dropdown-item.selected .custom-dropdown-item-checkmark {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .border-animation-line {
            animation: none !important;
            background: var(--card-border) !important;
          }
        }

        /* Job Cards Grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 32px;
        }

        /* Premium Glass Document Card */
        .app-card {
          background: transparent;
          border: none;
          cursor: pointer;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          animation: cardFadeIn 0.35s ease-out forwards;
        }

        .app-card:hover {
          transform: translateY(-3px);
        }

        /* Document Paper Sheets Stack */
        .paper-stack {
          height: 180px;
          position: relative;
          margin-bottom: -20px;
          z-index: 1;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: stackRise 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.12s;
        }

        @keyframes cardFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes stackRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-card {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          .paper-stack {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
          .sheet {
            transition: none !important;
            transform: none !important;
          }
          .app-card:hover {
            transform: none !important;
          }
          .app-card:hover .sheet {
            transform: none !important;
          }
          .glass-holder::after {
            display: none !important;
            transition: none !important;
          }
        }

        .sheet {
          width: 120px;
          height: 160px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01);
          padding: 12px 8px;
          box-sizing: border-box;
          position: absolute;
          bottom: 10px;
          transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease, bottom 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 5px;
          color: #1a1a2e;
          transform-origin: bottom center;
          pointer-events: none;
        }

        /* Paper Overlap States */
        .stack-1 .sheet-0 { transform: rotate(0deg); z-index: 5; }
        
        .stack-2 .sheet-0 { transform: translate(-15px, 0px) rotate(-3deg); z-index: 4; }
        .stack-2 .sheet-1 { transform: translate(15px, -3px) rotate(2deg); z-index: 5; }
        
        .stack-3 .sheet-0 { transform: translate(-25px, -2px) rotate(-4deg); z-index: 3; }
        .stack-3 .sheet-1 { transform: translate(0px, 0px) rotate(1deg); z-index: 5; }
        .stack-3 .sheet-2 { transform: translate(25px, -4px) rotate(3deg); z-index: 4; }
        
        .stack-4 .sheet-0 { transform: translate(-35px, -4px) rotate(-5deg); z-index: 2; }
        .stack-4 .sheet-1 { transform: translate(-12px, -2px) rotate(-2deg); z-index: 4; }
        .stack-4 .sheet-2 { transform: translate(12px, 0px) rotate(2deg); z-index: 5; }
        .stack-4 .sheet-3 { transform: translate(35px, -6px) rotate(4deg); z-index: 3; }

        .stack-5 .sheet-0 { transform: translate(-45px, -6px) rotate(-6deg); z-index: 1; opacity: 0.7; }
        .stack-5 .sheet-1 { transform: translate(-22px, -3px) rotate(-3deg); z-index: 3; }
        .stack-5 .sheet-2 { transform: translate(0px, 0px) rotate(1deg); z-index: 5; }
        .stack-5 .sheet-3 { transform: translate(22px, -2px) rotate(3deg); z-index: 4; }
        .stack-5 .sheet-4 { transform: translate(45px, -5px) rotate(5deg); z-index: 2; }

        /* Hover Fan Out transforms using cubic-bezier easing */
        .app-card:hover .stack-1 .sheet-0 { transform: translateY(-12px) rotate(0deg); }
        
        .app-card:hover .stack-2 .sheet-0 { transform: translate(-25px, -5px) rotate(-4deg); }
        .app-card:hover .stack-2 .sheet-1 { transform: translate(25px, -5px) rotate(4deg); }
        
        .app-card:hover .stack-3 .sheet-0 { transform: translate(-35px, -5px) rotate(-6deg); }
        .app-card:hover .stack-3 .sheet-1 { transform: translate(0px, -12px) rotate(0deg); }
        .app-card:hover .stack-3 .sheet-2 { transform: translate(35px, -5px) rotate(6deg); }
        
        .app-card:hover .stack-4 .sheet-0 { transform: translate(-45px, -5px) rotate(-8deg); }
        .app-card:hover .stack-4 .sheet-1 { transform: translate(-15px, -10px) rotate(-3deg); }
        .app-card:hover .stack-4 .sheet-2 { transform: translate(15px, -10px) rotate(3deg); }
        .app-card:hover .stack-4 .sheet-3 { transform: translate(45px, -5px) rotate(8deg); }

        .app-card:hover .stack-5 .sheet-0 { transform: translate(-55px, -5px) rotate(-10deg); opacity: 0.8; }
        .app-card:hover .stack-5 .sheet-1 { transform: translate(-28px, -10px) rotate(-4deg); }
        .app-card:hover .stack-5 .sheet-2 { transform: translate(0px, -12px) rotate(0deg); }
        .app-card:hover .stack-5 .sheet-3 { transform: translate(28px, -10px) rotate(4deg); }
        .app-card:hover .stack-5 .sheet-4 { transform: translate(55px, -5px) rotate(10deg); }

        .extra-docs-badge {
          position: absolute;
          bottom: 12px;
          right: calc(50% - 68px);
          background: var(--accent-primary);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        /* Micro content design on document sheets */
        .sheet-header {
          font-weight: 700;
          font-size: 5px;
          text-transform: uppercase;
          color: var(--accent-primary);
          border-bottom: 0.5px solid rgba(0, 0, 0, 0.05);
          padding-bottom: 2px;
          margin-bottom: 2px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sheet-title-text {
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sheet-lines {
          display: flex;
          flex-direction: column;
          gap: 2.5px;
        }

        .sheet-line {
          height: 2.5px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 0.5px;
        }

        .sheet-line.name {
          font-weight: 700;
          font-size: 5.5px;
          color: #111827;
          background: transparent;
          height: auto;
          margin-bottom: 1px;
        }

        .sheet-line.role {
          font-size: 4px;
          color: var(--text-muted);
          background: transparent;
          height: auto;
          margin-bottom: 2px;
        }

        .sheet-line.short { width: 50%; }
        .sheet-line.medium { width: 75%; }
        .sheet-line.heading {
          height: 3.5px;
          background: rgba(0, 0, 0, 0.08);
          width: 35%;
          margin-top: 1.5px;
        }

        /* Glass organizer holder */
        .glass-holder {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 12px 28px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02);
          padding: 12px;
          z-index: 2;
          position: relative;
          transition: border-color 0.25s, box-shadow 0.25s;
          overflow: hidden;
        }

        .glass-holder::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          transition: left 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
          z-index: 3;
        }

        .app-card:hover .glass-holder::after {
          left: 150%;
        }

        .app-card:hover .glass-holder {
          border-color: rgba(0, 0, 0, 0.16);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 16px 36px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        /* Front white info panel card */
        .front-info-panel {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.015);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .card-meta-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .company-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .company-logo-fallback {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .company-info-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .company-name {
          font-size: 15px;
          font-weight: 500;
          color: #555555;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .platform-source {
          font-size: 9.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-badge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }

        .status-badge.applied {
          background: rgba(22, 163, 74, 0.08);
          color: var(--status-applied);
          border: 0.5px solid rgba(22, 163, 74, 0.15);
        }

        .status-badge.interviewing {
          background: rgba(217, 119, 6, 0.08);
          color: var(--status-interviewing);
          border: 0.5px solid rgba(217, 119, 6, 0.15);
        }

        .status-badge.rejected {
          background: rgba(220, 38, 38, 0.08);
          color: var(--status-rejected);
          border: 0.5px solid rgba(220, 38, 38, 0.15);
        }

        .status-badge.not-applied {
          background: rgba(37, 99, 235, 0.06);
          color: var(--status-draft);
          border: 0.5px solid rgba(37, 99, 235, 0.12);
        }

        .job-title-text {
          font-size: 21px;
          font-weight: 700;
          color: #111111;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .job-desc-text {
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 32px;
        }

        /* Stats Grid inside front panel */
        .card-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr 1.3fr;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          padding-top: 10px;
          margin-top: 2px;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .stat-label {
          font-size: 9px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-value.text-accent {
          color: var(--accent-primary);
        }

        /* Centered Modals Overlay */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: none;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .modal-overlay.active {
          opacity: 1;
        }

        .modal-container {
          background: #ffffff;
          border: 1px solid var(--card-border);
          width: 90%;
          max-width: 760px;
          max-height: 85%;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
          transform: scale(0.96);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-overlay.active .modal-container {
          transform: scale(1);
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--card-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
        }

        .modal-title-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title-text h3 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #111111;
          line-height: 1.2;
        }

        .modal-title-text p {
          margin: 6px 0 0 0;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 24px;
          cursor: pointer;
          transition: color 0.15s;
        }

        .modal-close:hover {
          color: var(--text-main);
        }

        /* Modal Body lists */
        .modal-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          background: #fcfcfd;
        }

        .modal-section-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 12px;
          letter-spacing: 0.3px;
        }

        .documents-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        /* Document Item Card in Modal */
        .document-item {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.005);
          transition: all 0.2s ease;
          cursor: pointer;
          overflow: hidden;
        }

        .document-item:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .doc-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .doc-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #f3f4f6;
          color: #111111;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 18px;
        }

        .doc-item-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .doc-item-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .doc-item-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Eye Icon Hover effect */
        .doc-preview-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          gap: 12px;
        }

        .document-item:hover .doc-preview-overlay {
          opacity: 1;
        }

        .doc-preview-overlay button {
          background: var(--accent-primary);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          transition: transform 0.15s;
        }

        .doc-preview-overlay button:hover {
          transform: translateY(-1px);
        }

        /* Large Document Viewer Modal */
        .viewer-container {
          max-width: 900px;
          height: 85%;
        }

        .viewer-content-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .viewer-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-viewer {
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          border: 1px solid var(--card-border);
          background: #ffffff;
          color: var(--text-secondary);
        }

        .btn-viewer:hover {
          border-color: var(--text-muted);
          background: rgba(0, 0, 0, 0.01);
        }

        .btn-viewer.btn-accent {
          background: var(--accent-primary);
          color: #ffffff;
          border-color: var(--accent-primary);
        }

        .btn-viewer.btn-accent:hover {
          background: #222222;
          border-color: #222222;
        }

        .btn-viewer.btn-danger:hover {
          background: rgba(220, 38, 38, 0.05);
          color: var(--status-rejected);
          border-color: var(--status-rejected);
        }

        .viewer-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          background: #f3f4f6;
          overflow: hidden;
        }

        .viewer-doc-text-card {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          padding: 30px;
          overflow-y: auto;
          flex: 1;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-main);
          white-space: pre-wrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
        }

        /* Delete Confirmation Dialog Modal */
        .confirm-modal-container {
          max-width: 400px;
          text-align: center;
        }

        .confirm-modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .confirm-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(220, 38, 38, 0.08);
          color: var(--status-rejected);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .confirm-modal-body h4 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .confirm-modal-body p {
          margin: 0;
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .confirm-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          margin-top: 8px;
        }

        .confirm-actions button {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #ffffff;
          border: 1px solid var(--card-border);
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          border-color: var(--text-muted);
        }

        .btn-confirm-delete {
          background: var(--status-rejected);
          border: 1px solid var(--status-rejected);
          color: #ffffff;
        }

        .btn-confirm-delete:hover {
          opacity: 0.9;
        }

        /* Floating Success Toast Notification */
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          background: #ffffff;
          border: 1px solid rgba(22, 163, 74, 0.2);
          border-left: 4px solid var(--status-applied);
          border-radius: 8px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          z-index: 3000;
          transform: translateY(-20px);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .toast-notification.active {
          transform: translateY(0);
          opacity: 1;
        }

        .toast-icon {
          color: var(--status-applied);
          font-size: 18px;
        }

        .toast-text {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        /* Loading Skeleton with Pulse */
        .skeleton-card {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }

        .skeleton-stack {
          height: 180px;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          margin-bottom: -20px;
          position: relative;
        }

        .skeleton-sheet {
          width: 120px;
          height: 160px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 6px;
          position: absolute;
          bottom: 10px;
        }

        .skeleton-sheet-0 { transform: translate(-20px, -2px) rotate(-3deg); opacity: 0.6; }
        .skeleton-sheet-1 { transform: translate(0px, 0px) rotate(1deg); opacity: 0.9; }
        .skeleton-sheet-2 { transform: translate(20px, -3px) rotate(3deg); opacity: 0.7; }

        .skeleton-holder {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          padding: 12px;
        }

        .skeleton-info {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-line {
          height: 12px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 4px;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-line.short { width: 40%; }
        .skeleton-line.medium { width: 65%; }
        .skeleton-line.long { width: 90%; }
        .skeleton-line.title { height: 18px; }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        /* Empty states */
        .empty-state {
          grid-column: 1 / -1;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.005);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          max-width: 480px;
          margin: 40px auto;
        }

        .empty-state svg {
          color: var(--text-muted);
        }

        .empty-state h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .empty-state p {
          margin: 0;
          color: var(--text-muted);
          font-size: 13.5px;
          line-height: 1.5;
        }

        /* Error state */
        .error-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 16px;
          max-width: 400px;
          margin: 40px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .error-state h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .error-state p {
          margin: 0;
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .btn-retry {
          background: var(--accent-primary);
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-retry:hover {
          background: #222222;
        }

        /* Login view overlay styling updates */
        .login-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--bg-main);
          z-index: 2000;
          align-items: center;
          justify-content: center;
        }

        .login-card {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
          text-align: center;
        }

        .login-card h2 {
          margin-top: 0;
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #1a1a2e 0%, #6b7280 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-card p {
          color: var(--text-muted);
          font-size: 13.5px;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 18px;
          text-align: left;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-main);
          font-family: inherit;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .login-btn {
          width: 100%;
          background: var(--accent-primary);
          border: none;
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          font-family: inherit;
          margin-top: 8px;
        }

        .login-btn:hover {
          background: #222222;
        }

        .error-msg {
          color: var(--status-rejected);
          font-size: 13px;
          margin-top: 14px;
          display: none;
        }

        /* Responsive design rules */
        @media (max-width: 1024px) {
          .sidebar {
            position: fixed;
            left: -260px;
            top: 0;
            bottom: 0;
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.05);
            transition: left 0.25s ease;
          }
          .sidebar.active {
            left: 0;
          }
          .sidebar-toggle-btn {
            display: none;
          }
          header {
            justify-content: space-between;
          }
          /* Menu button for mobile header */
          .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #ffffff;
            border: 1px solid var(--card-border);
            border-radius: 8px;
            cursor: pointer;
          }
        }

        @media (min-width: 1025px) {
          .mobile-menu-toggle {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }
          main {
            padding: 0 20px;
            margin: 24px auto;
          }
          header {
            padding: 16px 20px;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .toolbar-search {
            max-width: 100%;
          }
          .toolbar-filters {
            justify-content: space-between;
          }
          .modal-container {
            width: 95%;
            height: 90%;
            max-height: 90%;
          }
          .viewer-container {
            width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dashboard-title h1,
          .dashboard-title p,
          .toolbar,
          .app-card {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .empty-state svg {
            animation: none !important;
          }
          .sidebar {
            transition: none !important;
          }
          .sidebar-menu-item {
            transition: none !important;
          }
          .sidebar-toggle-btn {
            transition: none !important;
          }
          .sheet {
            transition: none !important;
          }
          .glass-holder::after {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Standard Dashboard View -->
      <div id="dashboard-layout" style="display:none; flex: 1; min-height: 100vh;">
        <!-- Left Persistent Sidebar -->
        <aside class="sidebar" id="sidebar-nav">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="sidebar-brand-left">
                <div class="sidebar-logo-container" id="logo-control" onclick="handleLogoClick()" aria-label="Open sidebar" data-tooltip="Open sidebar" tabindex="0">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
                    <circle class="center-dot" cx="50" cy="50" r="7" />
                    
                    <!-- Top Arm -->
                    <path class="line line-top" d="M 50 50 V 25 H 35" />
                    <path class="line line-top" d="M 50 38 H 63" />
                    <circle class="dot dot-t1" cx="63" cy="38" r="3.5" />
                    <circle class="dot dot-t2" cx="35" cy="25" r="3.5" />
                    
                    <!-- Right Arm -->
                    <path class="line line-right" d="M 50 50 H 75 V 35" />
                    <path class="line line-right" d="M 62 50 V 63" />
                    <circle class="dot dot-r1" cx="62" cy="63" r="3.5" />
                    <circle class="dot dot-r2" cx="75" cy="35" r="3.5" />
                    
                    <!-- Bottom Arm -->
                    <path class="line line-bottom" d="M 50 50 V 75 H 65" />
                    <path class="line line-bottom" d="M 50 62 H 37" />
                    <circle class="dot dot-b1" cx="37" cy="62" r="3.5" />
                    <circle class="dot dot-b2" cx="65" cy="75" r="3.5" />
                    
                    <!-- Left Arm -->
                    <path class="line line-left" d="M 50 50 H 25 V 65" />
                    <path class="line line-left" d="M 38 50 V 37" />
                    <circle class="dot dot-l1" cx="38" cy="37" r="3.5" />
                    <circle class="dot dot-l2" cx="25" cy="65" r="3.5" />
                  </svg>
                </div>
                <span class="sidebar-brand-text">HireNextAI</span>
              </div>
              <button class="sidebar-close-btn" id="sidebar-close-btn" onclick="handleSidebarCollapseClick()" aria-label="Close sidebar" data-tooltip="Close sidebar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <line x1="18" y1="3" x2="18" y2="21"></line>
                  <path d="M12 17l-5-5 5-5"></path>
                  <line x1="7" y1="12" x2="15" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          <nav class="sidebar-menu">
            <a href="/profile/${req.params.userId}/documents" class="sidebar-menu-item active" data-tooltip="Documents">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Documents</span>
            </a>
            <a href="/profile/${req.params.userId}/applications" class="sidebar-menu-item" data-tooltip="Applications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>Applications</span>
            </a>
          </nav>
        </aside>
        <script>
          if (localStorage.getItem('hirenext_sidebar_collapsed') === 'true') {
            const sidebarNav = document.getElementById('sidebar-nav');
            sidebarNav.classList.add('collapsed');
            sidebarNav.classList.add('collapsed-text');
            sidebarNav.classList.add('collapsed-menu');
          }
        </script>

        <!-- Right Main Panel -->
        <div class="main-panel">
          <header id="dashboard-header-bar">
            <!-- Mobile Menu Toggle Button -->
            <button class="mobile-menu-toggle" onclick="toggleMobileSidebar()" aria-label="Open Navigation Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </header>

          <main id="dashboard-main-content">
            <div class="dashboard-header">
              <div class="dashboard-title">
                <h1 style="display: inline-flex; align-items: center; gap: 4px;">
                  Documents
                </h1>
                <p>Everything created for your applications, organized in one place.</p>
              </div>
            </div>

            <!-- Toolbar Search and Filters -->
            <div class="toolbar">
              <div class="search-bar-container" id="search-bar-container" onclick="expandSearchBar(event)">
                <div class="border-animation-line"></div>
                <div class="search-inner-bg"></div>
                <div class="search-content">
                  <div class="search-icon-wrapper" onclick="toggleSearchCollapse(event)">
                    <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                      <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <input type="text" id="search-input" class="animated-search-input" placeholder="Search documents..." autocomplete="off" onkeydown="handleSearchKeyDown(event)">
                </div>
              </div>
              <div class="toolbar-filters">
                <div class="custom-dropdown" id="dropdown-sort">
                  <div class="animated-select-container" onclick="toggleCustomDropdown('sort')" onkeydown="handleDropdownKeydown(event, 'sort')" tabindex="0" role="combobox" aria-expanded="false" aria-controls="menu-sort" id="trigger-sort">
                    <div class="border-animation-line"></div>
                    <div class="select-inner-bg"></div>
                    <div class="select-trigger-content">
                      <span id="label-sort">↕ Recently Updated</span>
                      <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="menu-sort" role="listbox"></div>
                  <input type="hidden" id="sort-filter" value="updated">
                </div>
              </div>
            </div>

            <div class="cards-grid" id="applications-grid">
              <!-- Populated dynamically via JS -->
            </div>
          </main>
        </div>
      </div>

      <!-- Job Document Centered Modal -->
      <div class="modal-overlay" id="job-modal" onclick="closeJobModalOutside(event)">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-area">
              <div class="modal-title-text">
                <h3 id="job-modal-title">Company Name</h3>
                <p id="job-modal-subtitle">Job Role • Platform</p>
              </div>
            </div>
            <button class="modal-close" onclick="closeJobModal()" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body">
            <h4 class="modal-section-title" id="job-modal-docs-count">Documents (0)</h4>
            <div class="documents-list" id="job-documents-list">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Large Document Viewer Modal -->
      <div class="modal-overlay" id="viewer-modal" onclick="closeViewerModalOutside(event)">
        <div class="modal-container viewer-container">
          <div class="modal-header">
            <div class="modal-title-area">
              <div class="modal-title-text">
                <h3 id="viewer-title">Resume</h3>
                <p id="viewer-subtitle">Backend Developer • Google</p>
              </div>
            </div>
            <div class="viewer-actions">
              <button class="btn-viewer btn-accent" id="viewer-download-btn" onclick="executeDownload()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
              <button class="btn-viewer" id="viewer-copy-btn" onclick="executeCopyText()" style="background:#ffffff; color:#111111; border:1px solid #e5e7eb; display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 12px; cursor: pointer; transition: background 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Text
              </button>
              <button class="btn-viewer btn-danger" id="viewer-delete-btn" onclick="openDeleteConfirm()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
              <button class="modal-close" style="margin-left: 10px;" onclick="closeViewerModal()" aria-label="Close viewer">&times;</button>
            </div>
          </div>
          <div class="viewer-body">
            <div class="viewer-doc-text-card" id="viewer-doc-content">
              <!-- Rendered Safely -->
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" id="confirm-modal">
        <div class="modal-container confirm-modal-container">
          <div class="confirm-modal-body">
            <div class="confirm-icon">⚠️</div>
            <h4>Delete this document?</h4>
            <p>This action cannot be undone. It will remove the document permanently from this job card.</p>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeConfirmModal()">Cancel</button>
              <button class="btn-confirm-delete" onclick="executeDelete()">Delete Document</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Toast Notification -->
      <div class="toast-notification" id="toast-notification">
        <span class="toast-icon">✓</span>
        <span class="toast-text" id="toast-message">Document deleted successfully.</span>
      </div>

      <!-- Glassmorphic Login Overlay -->
      <div class="login-overlay" id="login-overlay">
        <div class="login-card">
          <div class="logo-container" style="justify-content:center; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="logo-svg" style="width:40px; height:40px;">
              <circle cx="50" cy="50" r="8" fill="var(--accent-primary)"/>
              <path d="M 50 50 V 25 H 34" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 50 37 H 58" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="34" cy="25" r="5" fill="var(--accent-primary)"/>
              <circle cx="58" cy="37" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 H 75 V 34" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 63 50 V 58" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="75" cy="34" r="5" fill="var(--accent-primary)"/>
              <circle cx="63" cy="58" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 V 75 H 66" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 50 63 H 42" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="66" cy="75" r="5" fill="var(--accent-primary)"/>
              <circle cx="42" cy="63" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 H 25 V 66" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 37 50 V 42" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="25" cy="66" r="5" fill="var(--accent-primary)"/>
              <circle cx="37" cy="42" r="5" fill="var(--accent-primary)"/>
            </svg>
            <span class="logo-text" style="font-size:24px; font-weight:700; color:var(--text-main);">HirenextAI</span>
          </div>
          <h2 id="login-form-title">Account Login Required</h2>
          <p id="login-form-subtitle">Please authenticate to view your documents and application logs.</p>
          
          <form id="auth-form" onsubmit="handleAuthSubmit(event)">
            <div class="form-group">
              <label for="auth-email">Email Address</label>
              <input type="email" id="auth-email" required placeholder="user@hirenext.ai">
            </div>
            <div class="form-group">
              <label for="auth-password">Password</label>
              <input type="password" id="auth-password" required placeholder="••••••••">
            </div>
            <button type="submit" class="login-btn" id="auth-submit-btn">Sign In</button>
            <div class="error-msg" id="auth-error-msg">Invalid email or password.</div>
          </form>
        </div>
      </div>

      <!-- Session Expired Overlay -->
      <div class="login-overlay" id="session-expired-overlay" style="display:none;">
        <div class="login-card" style="text-align: center;">
          <div class="logo-container" style="justify-content:center; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="logo-svg" style="width:40px; height:40px;">
              <circle cx="50" cy="50" r="8" fill="var(--accent-primary)"/>
              <path d="M 50 50 V 25 H 34" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 50 37 H 58" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="34" cy="25" r="5" fill="var(--accent-primary)"/>
              <circle cx="58" cy="37" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 H 75 V 34" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 63 50 V 58" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="75" cy="34" r="5" fill="var(--accent-primary)"/>
              <circle cx="63" cy="58" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 V 75 H 66" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 50 63 H 42" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="66" cy="75" r="5" fill="var(--accent-primary)"/>
              <circle cx="42" cy="63" r="5" fill="var(--accent-primary)"/>
              <path d="M 50 50 H 25 V 66" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 37 50 V 42" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="25" cy="66" r="5" fill="var(--accent-primary)"/>
              <circle cx="37" cy="42" r="5" fill="var(--accent-primary)"/>
            </svg>
            <span class="logo-text" style="font-size:24px; font-weight:700; color:var(--text-main);">HirenextAI</span>
          </div>
          <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
          <h2 style="color: var(--status-rejected);">Session Expired</h2>
          <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 24px;">
            For your security, this session has expired or is no longer valid (IP address changed or session timed out).
          </p>
          <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px; text-align: left; font-size: 13px; color: var(--text-main); line-height: 1.5; margin-bottom: 24px;">
            <strong style="color: var(--accent-primary); display: block; margin-bottom: 6px;">How to restore access:</strong>
            1. Open the HirenextAI Chrome Extension in your browser.<br>
            2. Click the <strong>Documents</strong> icon button in the sidebar.<br>
            3. A new tab will launch automatically with a secure, updated session.
          </div>
          <button onclick="window.location.replace('/')" class="login-btn" style="background: rgba(0, 0, 0, 0.05); color: var(--text-main); border: 1px solid var(--card-border);">Return to Home</button>
        </div>
      </div>

      <script>
        const pathParts = window.location.pathname.split('/');
        const userIdFromUrl = pathParts[pathParts.indexOf('profile') + 1];
        
        let token = localStorage.getItem('token');
        const handoffToken = new URLSearchParams(window.location.search).get('handoff_token');

        // Check for direct token query fallback
        const queryToken = new URLSearchParams(window.location.search).get('token');
        if (queryToken) {
          token = queryToken;
          localStorage.setItem('token', token);
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        }

        const ENABLE_DEV_PREVIEW = false; // Isolate preview mode behind a disabled flag
        let activeApplications = [];
        let filteredApplications = [];
        let currentJobModalApp = null;
        let currentDocId = null;
        let isPreviewModeActive = false;
        let previewApplications = [];
        let currentUserProfile = null;

        function initializePreviewData() {
          previewApplications = [
            {
              id: 'preview-google',
              company: 'Google',
              role: 'Backend Developer',
              status: 'Applied',
              application_notes: 'Fascinating backend developer role focusing on large-scale distributed systems and high-throughput query parsers.',
              date_applied: new Date().toISOString(),
              job_url: 'https://careers.google.com/jobs/results/123456/',
              created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              documents: [
                {
                  id: 'preview-doc-goog-resume',
                  application_id: 'preview-google',
                  title: 'Google Backend Developer Resume',
                  type: 'resume',
                  content: "ALEX MORGAN - SENIOR BACKEND DEVELOPER RESUME\\n\\nCONTACT:\\nEmail: alex@hirenext.ai\\nPhone: +91 99999 99999\\n\\nSUMMARY:\\nHighly skilled and result-oriented backend engineer with 4+ years of experience designing and implementing scalable distributed systems, secure API gateways, and robust cloud services.\\n\\nPROFESSIONAL EXPERIENCE:\\n1. Google - Lead Backend Systems Developer (2024 - Present)\\n   - Architected a distributed query parser handling over 150k requests per second with sub-millisecond latencies.\\n   - Refactored session management logic using modern IP-bound JWT verification, eliminating session theft vectors entirely.\\n2. Microsoft - Software Engineer (2022 - 2024)\\n   - Developed cloud-native microservices in Microsoft Azure, reducing platform latency by 20%.\\n   - Led team migration to TypeScript 5.0, establishing strict typechecking guidelines across a monorepo.\\n\\nEDUCATION:\\n- B.S. in Computer Science - First Class Honors (Graduated 2022)\\n\\nTECHNICAL SKILLS:\\n- Languages: Go, Node.js/JavaScript, TypeScript, Python, C++\\n- Databases: PostgreSQL, Redis, SQLite, MongoDB\\n- Infrastructure: Docker, Kubernetes, AWS, Microsoft Azure, CI/CD",
                  created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                },
                {
                  id: 'preview-doc-goog-cover',
                  application_id: 'preview-google',
                  title: 'Google Backend Developer Cover Letter',
                  type: 'cover_letter',
                  content: "Dear Google Hiring Team,\\n\\nI am writing to express my enthusiastic interest in the Backend Developer position at Google. Having followed Google's contribution to open source and distributed computing for years, I am excited about the opportunity to bring my experience in building highly concurrent database systems and high-throughput microservices to your team.\\n\\nAt my previous role at Microsoft, I designed and optimized core database queries that powered real-time collaboration tools, which successfully reduced server execution overhead by 30%.\\n\\nSincerely,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                },
                {
                  id: 'preview-doc-goog-answers',
                  application_id: 'preview-google',
                  title: 'Google Application Answers',
                  type: 'answers',
                  content: "QUESTION 1:\\nWhy do you want to join Google?\\nANSWER:\\nGoogle's scale and engineering excellence present the perfect environment to solve complex distributed systems challenges.\\n\\nQUESTION 2:\\nDescribe a time you solved a challenging concurrency bug.\\nANSWER:\\nI introduced a distributed lock mechanism using Redis to guarantee mutual exclusion and ensure single-processing of items.",
                  created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                },
                {
                  id: 'preview-doc-goog-recruiter',
                  application_id: 'preview-google',
                  title: 'Google Recruiter Outreach Message',
                  type: 'message',
                  content: "Subject: Backend Developer Application - Alex Morgan\\n\\nHi Sarah,\\n\\nI recently submitted my application for the Backend Developer position at Google. Given my background in scaling Node.js applications, I wanted to reach out.\\n\\nBest regards,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                },
                {
                  id: 'preview-doc-goog-followup',
                  application_id: 'preview-google',
                  title: 'Google Recruiter Follow-up Email',
                  type: 'message',
                  content: "Subject: Follow-up: Backend Developer Application - Alex Morgan\\n\\nHi Sarah,\\n\\nI'm following up on my application for the Backend Developer role at Google. I wanted to see if the engineering team has had a chance to review my profile.\\n\\nBest,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                }
              ]
            },
            {
              id: 'preview-microsoft',
              company: 'Microsoft',
              role: 'Software Engineer',
              status: 'Interview',
              application_notes: 'Exciting opportunity in the Cloud + AI division working on next-generation platform services and developer tooling.',
              date_applied: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
              job_url: 'https://careers.microsoft.com/us/en/job/78910/',
              created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
              documents: [
                {
                  id: 'preview-doc-ms-resume',
                  application_id: 'preview-microsoft',
                  title: 'Microsoft Software Engineer Resume',
                  type: 'resume',
                  content: "ALEX MORGAN - SOFTWARE ENGINEER RESUME\\n\\nCONTACT:\\nEmail: alex@hirenext.ai\\nPhone: +91 99999 99999\\n\\nSUMMARY:\\nDetail-oriented software engineer with a strong foundation in Microsoft cloud solutions.\\n\\nEXPERIENCE:\\n- Microsoft: Software Engineer (2022 - Present)\\n- Amazon: SDE Intern (2021)\\n\\nTECHNICAL SKILLS:\\n- Azure, .NET Core, C#, TypeScript, React, SQL Server",
                  created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
                },
                {
                  id: 'preview-doc-ms-cover',
                  application_id: 'preview-microsoft',
                  title: 'Microsoft Cover Letter',
                  type: 'cover_letter',
                  content: "Dear Microsoft Recruiting Team,\\n\\nI am writing to express my strong interest in the Software Engineer position. Having worked extensively with Azure and .NET Core, I am excited to apply.\\n\\nSincerely,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
                },
                {
                  id: 'preview-doc-ms-answers',
                  application_id: 'preview-microsoft',
                  title: 'Microsoft Application Answers',
                  type: 'answers',
                  content: "QUESTION:\\nExplain a difficult technical problem you solved.\\nANSWER:\\nI diagnosed a memory leak in a high-concurrency .NET web service by profiling memory dumps, resolving the issue completely.",
                  created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
                }
              ]
            },
            {
              id: 'preview-amazon',
              company: 'Amazon',
              role: 'SDE Intern',
              status: 'Not Applied',
              application_notes: 'Summer internship in the Alexa group, focusing on conversational interfaces and natural language understanding models.',
              date_applied: null,
              job_url: null,
              created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
              documents: [
                {
                  id: 'preview-doc-amzn-resume',
                  application_id: 'preview-amazon',
                  title: 'Amazon SDE Intern Resume',
                  type: 'resume',
                  content: "ALEX MORGAN - STUDENT RESUME\\n\\nEDUCATION:\\n- B.Tech in Computer Science (Graduating 2026)\\n\\nTECHNICAL PROJECTS:\\n1. Distributed Key-Value Store (Go)\\n2. Smart Task Scheduler (React, Node.js)\\n\\nSKILLS:\\n- Java, Python, Go, JavaScript, SQL, Git",
                  created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
                },
                {
                  id: 'preview-doc-amzn-cover',
                  application_id: 'preview-amazon',
                  title: 'Amazon SDE Intern Cover Letter',
                  type: 'cover_letter',
                  content: "Dear Amazon Alexa Engineering Team,\\n\\nI am applying for the SDE Intern position. I have developed strong software engineering fundamentals and am excited to build at Amazon scale.\\n\\nBest regards,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
                },
                {
                  id: 'preview-doc-amzn-message',
                  application_id: 'preview-amazon',
                  title: 'Amazon Recruiter Outreach Message',
                  type: 'message',
                  content: "Hi recruiters,\\n\\nI am a CS student interested in the summer SDE Intern role at Amazon. I have attached my resume and cover letter.\\n\\nThanks,\\nAlex Morgan",
                  created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
                },
                {
                  id: 'preview-doc-amzn-portfolio',
                  application_id: 'preview-amazon',
                  title: 'Amazon Portfolio Summary',
                  type: 'portfolio',
                  content: "Alex Morgan - Portfolio projects summary:\\n- Github: github.com/alex-morgan\\n- Project 1: Distributed Key-Value Store in Go\\n- Project 2: Smart Task Scheduler (React/Node.js)\\n- Project 3: AI-Powered Resume Parser extension.",
                  created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
                }
              ]
            }
          ];
        }

        function showSessionExpired() {
          localStorage.removeItem('token');
          document.getElementById('dashboard-layout').style.display = 'none';
          document.getElementById('login-overlay').style.display = 'none';
          document.getElementById('session-expired-overlay').style.display = 'flex';
        }

        async function initPage() {
          // Initialize Collapsible Sidebar State
          const isCollapsed = localStorage.getItem('hirenext_sidebar_collapsed') === 'true';
          const sidebar = document.getElementById('sidebar-nav');
          const logoControl = document.getElementById('logo-control');
          
          if (logoControl) {
            logoControl.removeEventListener('keydown', handleLogoKeyDown);
            logoControl.addEventListener('keydown', handleLogoKeyDown);
          }

          if (isCollapsed) {
            sidebar.classList.add('collapsed');
            sidebar.classList.add('collapsed-text');
            sidebar.classList.add('collapsed-menu');
            if (logoControl) {
              logoControl.setAttribute('data-tooltip', 'Open sidebar');
              logoControl.setAttribute('aria-label', 'Open sidebar');
            }
          } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('collapsed-text');
            sidebar.classList.remove('collapsed-menu');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
          }

          // Setup animated search input listeners
          const sInput = document.getElementById('search-input');
          const sContainer = document.getElementById('search-bar-container');
          if (sInput && sContainer) {
            sInput.addEventListener('blur', () => {
              sContainer.classList.remove('focused');
            });
            sInput.addEventListener('focus', () => {
              sContainer.classList.add('focused');
            });
          }

          // Global keyboard shortcuts (Escape and Ctrl/Cmd+K)
          document.addEventListener('keydown', (e) => {
            const input = document.getElementById('search-input');
            const container = document.getElementById('search-bar-container');
            
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              if (input) {
                setTimeout(() => input.focus(), 50);
              }
            }

            if (e.key === 'Escape' && document.activeElement === input) {
              e.preventDefault();
              if (input) {
                input.value = '';
                input.blur();
              }
              fetchApplications();
            }
          });

          if (handoffToken) {
            try {
              const res = await fetch('/api/auth/consume-handoff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handoffToken })
              });

              if (!res.ok) {
                showSessionExpired();
                return;
              }

              const data = await res.json();
              token = data.token;
              localStorage.setItem('token', token);

              // Clean URL query parameters
              const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
            } catch (err) {
              console.error('Error consuming handoff token:', err);
              showSessionExpired();
              return;
            }
          }

          loadDashboard();
        }

        async function loadDashboard() {
          if (!token) {
            showLoginForm();
            return;
          }

          renderSkeletons();

          try {
            const profileRes = await fetch('/api/profile', {
              headers: { 'Authorization': 'Bearer ' + token }
            });

            if (profileRes.status === 401 || profileRes.status === 403) {
              const errData = await profileRes.json().catch(() => ({}));
              if (errData.code === 'IP_MISMATCH' || errData.code === 'SESSION_EXPIRED') {
                showSessionExpired();
              } else {
                logout();
              }
              return;
            }

            const profile = await profileRes.json();
            currentUserProfile = profile;
            if (profile.user_id !== parseInt(userIdFromUrl) && userIdFromUrl !== 'me') {
              logout();
              return;
            }

            if (userIdFromUrl === 'me') {
              window.location.replace('/profile/' + profile.user_id + '/documents');
              return;
            }

            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('session-expired-overlay').style.display = 'none';
            document.getElementById('dashboard-layout').style.display = 'flex';

            const uName = document.getElementById('user-name');
            if (uName) uName.textContent = profile.name;
            const uEmail = document.getElementById('user-email');
            if (uEmail && profile.email) uEmail.textContent = profile.email;
            const uAvatar = document.getElementById('user-avatar');
            if (uAvatar && profile.photo_url) uAvatar.src = profile.photo_url;

            await fetchApplications();

          } catch (err) {
            console.error('Error loading dashboard:', err);
            renderErrorState();
          }
        }

        async function fetchApplications(silent = false) {
          if (!token) return;

          const searchBar = document.getElementById('search-bar-container');
          if (searchBar && !silent) {
            searchBar.classList.add('searching');
          }
          if (!silent) renderSkeletons();

          // 1. Trigger search icon scanning feedback
          const searchIcon = document.querySelector('.search-icon-svg');
          if (searchIcon) {
            searchIcon.classList.add('scanning');
            setTimeout(() => searchIcon.classList.remove('scanning'), 600);
          }

          // 2. Trigger old cards fade-out transition
          const cards = document.querySelectorAll('.app-card');
          cards.forEach(card => {
            card.style.transition = 'opacity 180ms ease, transform 180ms ease, filter 180ms ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(15px) scale(0.95)';
            card.style.filter = 'blur(2px)';
          });

          const searchVal = document.getElementById('search-input').value;
          const sortVal = document.getElementById('sort-filter').value;

          // Map sorting options for database query (Documents page client sorts additionally)
          let apiSort = 'Recently Updated';
          if (sortVal === 'newest') apiSort = 'Newest';
          if (sortVal === 'oldest') apiSort = 'Oldest';

          const queryParams = new URLSearchParams({
            search: searchVal,
            sort: apiSort
          });

          try {
            const res = await fetch('/api/applications?' + queryParams.toString(), {
              headers: { 'Authorization': 'Bearer ' + token }
            });

            if (searchBar) {
              searchBar.classList.remove('searching');
            }

            if (!res.ok) {
              if (res.status === 401 || res.status === 403) {
                showSessionExpired();
                return;
              }
              throw new Error('Failed to fetch');
            }

            const data = await res.json();
            activeApplications = data;
            
            // Check if there are zero total documents across all applications
            const totalDocsCount = activeApplications.reduce((acc, app) => acc + (app.documents ? app.documents.length : 0), 0);
            if (ENABLE_DEV_PREVIEW && totalDocsCount === 0 && !searchVal) {
              isPreviewModeActive = true;
              if (previewApplications.length === 0) {
                initializePreviewData();
              }
            } else {
              isPreviewModeActive = false;
            }
            
            const pBadge = document.getElementById('preview-badge');
            if (pBadge) {
              pBadge.style.display = isPreviewModeActive ? 'inline-flex' : 'none';
            }
            
            applyFiltersAndRender();

          } catch (err) {
            if (searchBar) {
              searchBar.classList.remove('searching');
            }
            console.error('Error loading dashboard:', err);
            renderErrorState();
          }
        }

        function handleSearchKeyDown(event) {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.target.blur();
            fetchApplications();
          }
        }

        function animateCardsEmergence() {
          const cards = document.querySelectorAll('.app-card');
          cards.forEach((card, index) => {
            card.classList.remove('emerged');
            card.classList.remove('settled');
            void card.offsetWidth;
            setTimeout(() => {
              card.classList.add('emerged');
              setTimeout(() => {
                card.classList.remove('emerged');
                card.classList.add('settled');
              }, 550);
            }, index * 70);
          });
        }

        function expandSearchBar(event) {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }

        function toggleSearchCollapse(event) {
          event.stopPropagation();
          const input = document.getElementById('search-input');
          if (input) {
            input.value = '';
            fetchApplications();
          }
        }

        let isSidebarTransitioning = false;

        function handleLogoClick() {
          const sidebar = document.getElementById('sidebar-nav');
          if (sidebar.classList.contains('collapsed')) {
            handleLogoExpandClick();
          }
        }

        function handleLogoKeyDown(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLogoClick();
          }
        }

        function handleLogoExpandClick() {
          if (isSidebarTransitioning) return;
          
          const sidebar = document.getElementById('sidebar-nav');
          const logoSvg = document.querySelector('#logo-control .logo-svg');
          const logoControl = document.getElementById('logo-control');
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          isSidebarTransitioning = true;
          
          if (prefersReducedMotion) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('collapsed-text');
            sidebar.classList.remove('collapsed-menu');
            localStorage.setItem('hirenext_sidebar_collapsed', 'false');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
            isSidebarTransitioning = false;
            return;
          }
          
          // 0ms: Play press feedback animation
          if (logoControl) {
            logoControl.classList.add('logo-pressing');
            setTimeout(() => {
              logoControl.classList.remove('logo-pressing');
            }, 100);
          }
          
          // 80ms: Center node appears, network drawing starts
          setTimeout(() => {
            if (logoSvg) {
              logoSvg.classList.add('logo-interacting');
            }
          }, 80);
          
          // 280ms: Sidebar expansion width starts
          setTimeout(() => {
            sidebar.classList.remove('collapsed');
            localStorage.setItem('hirenext_sidebar_collapsed', 'false');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
          }, 280);
          
          // 400ms: HireNextAI brand text reveals
          setTimeout(() => {
            sidebar.classList.remove('collapsed-text');
          }, 400);
          
          // 470ms: Documents menu label reveals
          setTimeout(() => {
            sidebar.classList.remove('collapsed-menu');
          }, 470);
          
          // 720ms: Network settles to normal static logo, lock released
          setTimeout(() => {
            if (logoSvg) {
              logoSvg.classList.remove('logo-interacting');
            }
            isSidebarTransitioning = false;
          }, 720);
        }

        function handleSidebarCollapseClick() {
          if (isSidebarTransitioning) return;
          
          const sidebar = document.getElementById('sidebar-nav');
          const logoControl = document.getElementById('logo-control');
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          isSidebarTransitioning = true;
          
          if (prefersReducedMotion) {
            sidebar.classList.add('collapsed-text');
            sidebar.classList.add('collapsed-menu');
            sidebar.classList.add('collapsed');
            localStorage.setItem('hirenext_sidebar_collapsed', 'true');
            if (logoControl) {
              logoControl.setAttribute('data-tooltip', 'Open sidebar');
              logoControl.setAttribute('aria-label', 'Open sidebar');
            }
            isSidebarTransitioning = false;
            return;
          }
          
          // Collapse sequence (NO LOGO ANIMATION)
          sidebar.classList.add('collapsed-text');
          sidebar.classList.add('collapsed-menu');
          sidebar.classList.add('collapsed');
          localStorage.setItem('hirenext_sidebar_collapsed', 'true');
          if (logoControl) {
            logoControl.setAttribute('data-tooltip', 'Open sidebar');
            logoControl.setAttribute('aria-label', 'Open sidebar');
          }
          
          setTimeout(() => {
            isSidebarTransitioning = false;
          }, 340);
        }

        function toggleMobileSidebar() {
          const sidebar = document.getElementById('sidebar-nav');
          sidebar.classList.toggle('active');
        }

        // Hide sidebar when clicking outside on mobile devices
        document.addEventListener('click', (e) => {
          const sidebar = document.getElementById('sidebar-nav');
          const mobileToggle = document.querySelector('.mobile-menu-toggle');
          if (window.innerWidth <= 1024 && 
              sidebar.classList.contains('active') && 
              !sidebar.contains(e.target) && 
              !mobileToggle.contains(e.target)) {
            sidebar.classList.remove('active');
          }
        });

        function renderSkeletons() {
          const grid = document.getElementById('applications-grid');
          let skeletonsHTML = '';
          for (let i = 0; i < 3; i++) {
            skeletonsHTML += \`
              <div class="skeleton-card">
                <div class="skeleton-stack">
                  <div class="skeleton-sheet skeleton-sheet-0"></div>
                  <div class="skeleton-sheet skeleton-sheet-1"></div>
                  <div class="skeleton-sheet skeleton-sheet-2"></div>
                </div>
                <div class="skeleton-holder">
                  <div class="skeleton-info">
                    <div class="skeleton-line title long"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line short"></div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                      <div class="skeleton-line short" style="flex:1;"></div>
                      <div class="skeleton-line short" style="flex:1;"></div>
                      <div class="skeleton-line short" style="flex:1;"></div>
                    </div>
                  </div>
                </div>
              </div>
            \`;
          }
          grid.innerHTML = skeletonsHTML;
        }

        function renderErrorState() {
          const grid = document.getElementById('applications-grid');
          grid.innerHTML = \`
            <div class="error-state">
              <h3>We couldn't load your documents</h3>
              <p>An unexpected network error occurred while establishing a secure session with HireNextAI.</p>
              <button class="btn-retry" onclick="loadDashboard()">Try Again</button>
            </div>
          \`;
        }

        function applyFiltersAndRender() {
          const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
          const sortFilter = document.getElementById('sort-filter').value;

          let temp = isPreviewModeActive ? previewApplications : activeApplications;

          // 2. Filter by Search Query
          if (searchQuery) {
            temp = temp.filter(app => {
              const companyMatch = app.company && app.company.toLowerCase().includes(searchQuery);
              const roleMatch = app.role && app.role.toLowerCase().includes(searchQuery);
              const notesMatch = app.application_notes && app.application_notes.toLowerCase().includes(searchQuery);
              const docMatch = app.documents && app.documents.some(doc => 
                (doc.title && doc.title.toLowerCase().includes(searchQuery)) ||
                (doc.type && doc.type.toLowerCase().includes(searchQuery))
              );
              return companyMatch || roleMatch || notesMatch || docMatch;
            });
          }

          // 3. Sort Results
          if (sortFilter === 'updated') {
            // Sort by latest document date or latest job update
            temp.sort((a, b) => {
              const aTime = a.documents && a.documents.length > 0 
                ? new Date(a.documents[0].created_at).getTime() 
                : new Date(a.date_applied || a.created_at || 0).getTime();
              const bTime = b.documents && b.documents.length > 0 
                ? new Date(b.documents[0].created_at).getTime() 
                : new Date(b.date_applied || b.created_at || 0).getTime();
              return bTime - aTime;
            });
          } else if (sortFilter === 'documents') {
            temp.sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0));
          } else if (sortFilter === 'newest') {
            temp.sort((a, b) => new Date(b.date_applied || b.created_at || 0) - new Date(a.date_applied || a.created_at || 0));
          } else if (sortFilter === 'oldest') {
            temp.sort((a, b) => new Date(a.date_applied || a.created_at || 0) - new Date(b.date_applied || b.created_at || 0));
          }

          filteredApplications = temp;
          renderApplicationsGrid();
        }

        let searchDebounceTimeout = null;

        function handleSearch(event) {
          clearTimeout(searchDebounceTimeout);
          searchDebounceTimeout = setTimeout(() => {
            fetchApplications();
          }, 250);
        }

        function handleFilterChange() {
          fetchApplications();
        }

        function clearSearch() {
          const input = document.getElementById('search-input');
          const container = document.getElementById('search-bar-container');
          if (input) input.value = '';
          if (container) container.classList.remove('expanded');
          fetchApplications();
        }

        function renderApplicationsGrid() {
          const grid = document.getElementById('applications-grid');
          grid.innerHTML = '';

          const sourceList = isPreviewModeActive ? previewApplications : activeApplications;

          if (sourceList.length === 0) {
            // General Empty State
            grid.innerHTML = \`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                  <line x1="9" y1="11" x2="15" y2="11"/>
                </svg>
                <h3>No documents yet</h3>
                <p>Your application documents will appear here automatically when they're created.</p>
              </div>
            \`;
            return;
          }

          if (filteredApplications.length === 0) {
            // Search/Filter Empty State
            grid.innerHTML = \`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>No documents found</h3>
                <p>Try another job title, company, or document name.</p>
                <button class="btn-viewer btn-accent" style="margin-top: 10px;" onclick="clearSearch()">Clear Search</button>
              </div>
            \`;
            return;
          }

          filteredApplications.forEach((app, index) => {
            const card = document.createElement('div');
            card.className = 'app-card';
            card.onclick = () => openJobModal(app.id);

            const docCount = app.documents ? app.documents.length : 0;
            const stackClass = \`stack-\${Math.min(5, docCount)}\`;

            // Generate paper sheets stacked behind
            let sheetsHTML = '';
            if (docCount === 0) {
              // Fallback empty document visual
              sheetsHTML = \`
                <div class="sheet sheet-0" style="transform: rotate(0deg); z-index: 5;">
                  <div class="sheet-header"><span class="sheet-title-text">EMPTY GROUP</span></div>
                  <div class="sheet-lines">
                    <div class="sheet-line heading"></div>
                    <div class="sheet-line short"></div>
                    <div class="sheet-line"></div>
                  </div>
                </div>
              \`;
            } else {
              const maxRender = Math.min(5, docCount);
              for (let i = 0; i < maxRender; i++) {
                const doc = app.documents[i];
                sheetsHTML += generateMiniSheetHTML(doc, i, app.role);
              }
            }

            // Plus indicator badge if there are more than 5 documents
            let extraDocsHTML = '';
            if (docCount > 5) {
              extraDocsHTML = \`<div class="extra-docs-badge">+\${docCount - 5}</div>\`;
            }

            // Dynamic platform detection resolver
            let platformName = '';
            if (app.platform) {
              platformName = app.platform;
            } else if (app.source) {
              platformName = app.source;
            }

            if (!platformName && app.job_url) {
              try {
                const parsedUrl = new URL(app.job_url);
                const host = parsedUrl.hostname.toLowerCase();
                if (host.includes('linkedin.com')) {
                  platformName = 'LinkedIn';
                } else if (host.includes('naukri.com')) {
                  platformName = 'Naukri';
                } else if (host.includes('indeed.com')) {
                  platformName = 'Indeed';
                } else if (host.includes('hirenext.ai') || host.includes('hirenextai')) {
                  platformName = 'HireNextAI';
                } else {
                  const parts = host.replace('www.', '').split('.');
                  if (parts.length >= 2) {
                    const secondLevel = parts[parts.length - 2];
                    if (secondLevel && secondLevel.length > 2) {
                      platformName = secondLevel.charAt(0).toUpperCase() + secondLevel.slice(1) + ' Careers';
                    }
                  }
                }
              } catch (e) {
                // Ignore URL parsing errors
              }
            }

            if (!platformName) {
              const notesLower = (app.application_notes || '').toLowerCase();
              if (notesLower.includes('linkedin')) {
                platformName = 'LinkedIn';
              } else if (notesLower.includes('naukri')) {
                platformName = 'Naukri';
              } else if (notesLower.includes('indeed')) {
                platformName = 'Indeed';
              } else if (notesLower.includes('hirenext')) {
                platformName = 'HireNextAI';
              }
            }

            if (!platformName) {
              if (app.date_applied && app.status && app.status.toLowerCase() !== 'not applied') {
                platformName = 'Career Page';
              } else {
                platformName = 'Source unavailable';
              }
            }

            let companyInitial = app.company ? app.company.charAt(0).toUpperCase() : 'C';
            const colors = ['#111111', '#00cec9', '#0984e3', '#e84393', '#2d3436', '#fdcb6e', '#d63031'];
            const charCode = companyInitial.charCodeAt(0);
            const color = colors[charCode % colors.length];
            const companyLogo = \`<div class="company-logo-fallback" style="background:\${color};">\${companyInitial}</div>\`;

            // SVG Platform Icon mapping
            let platformIconSVG = '';
            if (platformName === 'LinkedIn') {
              platformIconSVG = \`<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="display:inline-block; vertical-align:middle; margin-right:4px; opacity:0.8;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>\`;
            } else if (platformName === 'Indeed') {
              platformIconSVG = \`<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="display:inline-block; vertical-align:middle; margin-right:4px; opacity:0.8;"><path d="M19 2H5C3.34 2 2 3.34 2 5v14c0 1.66 1.34 3 3 3h14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3zm-7 14.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>\`;
            } else if (platformName === 'Naukri') {
              platformIconSVG = \`<span style="font-weight:800; font-size:8px; border:1px solid currentColor; border-radius:2px; padding:0 2px; margin-right:4.5px; display:inline-block; line-height:1.1; vertical-align:middle; opacity:0.8;">N</span>\`;
            } else if (platformName === 'HireNextAI') {
              platformIconSVG = \`<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" width="11" height="11" style="display:inline-block; vertical-align:middle; margin-right:4.5px; opacity:0.8;"><circle cx="50" cy="50" r="8" fill="currentColor"/><path d="M 50 50 V 25 H 34" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 50 37 H 58" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="25" r="5" fill="currentColor"/><circle cx="58" cy="37" r="5" fill="currentColor"/><path d="M 50 50 H 75 V 34" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 63 50 V 58" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="75" cy="34" r="5" fill="currentColor"/><circle cx="63" cy="58" r="5" fill="currentColor"/><path d="M 50 50 V 75 H 66" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 50 63 H 42" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="66" cy="75" r="5" fill="currentColor"/><circle cx="42" cy="63" r="5" fill="currentColor"/><path d="M 50 50 H 25 V 66" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 37 50 V 42" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="66" r="5" fill="currentColor"/><circle cx="37" cy="42" r="5" fill="currentColor"/></svg>\`;
            } else if (platformName !== 'Source unavailable') {
              platformIconSVG = \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11" style="display:inline-block; vertical-align:middle; margin-right:4px; opacity:0.8;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>\`;
            }

            const jobUrl = app.job_url;
            const isUrlValid = jobUrl && (jobUrl.startsWith('http://') || jobUrl.startsWith('https://'));
            
            let platformLabelHTML = '';
            if (isUrlValid) {
              platformLabelHTML = \`<a href="\${jobUrl}" target="_blank" rel="noopener noreferrer" class="platform-link" onclick="event.stopPropagation();" onmouseover="this.style.color='var(--text-main)'" onmouseout="this.style.color='var(--text-muted)'" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; transition:color 0.15s; font-size:11.5px; font-weight:600;">\${platformIconSVG}\${platformName} <span style="font-size:9px; margin-left:2px; opacity:0.75;">↗</span></a>\`;
            } else {
              platformLabelHTML = \`<span style="color:var(--text-muted); display:inline-flex; align-items:center; font-size:11.5px; font-weight:600;">\${platformIconSVG}\${platformName}</span>\`;
            }

            // Earliest Created Date calculation
            let earliestDateStr = '—';
            let earliestTimeMs = Infinity;
            if (app.documents && app.documents.length > 0) {
              app.documents.forEach(doc => {
                if (doc.created_at) {
                  const timeMs = new Date(doc.created_at).getTime();
                  if (timeMs < earliestTimeMs) {
                    earliestTimeMs = timeMs;
                  }
                }
              });
            }
            if (earliestTimeMs !== Infinity) {
              const earliestDate = new Date(earliestTimeMs);
              const day = String(earliestDate.getDate()).padStart(2, '0');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = months[earliestDate.getMonth()];
              const year = earliestDate.getFullYear();
              earliestDateStr = \`\${day} \${month} \${year}\`;
            } else if (app.created_at) {
              const earliestDate = new Date(app.created_at);
              const day = String(earliestDate.getDate()).padStart(2, '0');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = months[earliestDate.getMonth()];
              const year = earliestDate.getFullYear();
              earliestDateStr = \`\${day} \${month} \${year}\`;
            }

            // Determine column header
            const colHeader = (app.date_applied && app.status.toLowerCase() !== 'not applied') ? 'APPLIED VIA' : 'SOURCE';

            // Calculate inline animation stagger delays
            const delay = (index * 0.04).toFixed(2);
            card.style.animationDelay = \`\${delay}s\`;

            card.innerHTML = \`
              <div class="paper-stack \${stackClass}" style="animation-delay: \${(parseFloat(delay) + 0.12).toFixed(2)}s;">
                \${sheetsHTML}
                \${extraDocsHTML}
              </div>
              <div class="glass-holder">
                <div class="front-info-panel">
                  <div class="card-meta-top" style="width: 100%;">
                    <h3 class="job-title-text">\${app.role}</h3>
                  </div>
                  <p class="job-desc-text">\${app.application_notes || 'No notes added yet.'}</p>
                  
                  <div class="card-stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">Documents</span>
                      <span class="stat-value">\${docCount}</span>
                    </div>
                    <div class="stat-item" title="First document created \${earliestDateStr}">
                      <span class="stat-label">Created</span>
                      <span class="stat-value">\${earliestDateStr}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">\${colHeader}</span>
                      <span class="stat-value">\${platformLabelHTML}</span>
                    </div>
                  </div>
                </div>
              </div>
            \`;
            grid.appendChild(card);
          });
          animateCardsEmergence();
        }

        // Helper to generate visual miniature sheets contents matching document type
        function generateMiniSheetHTML(doc, index, appRole) {
          const type = doc.type.toLowerCase();
          let headerText = doc.type ? doc.type.toUpperCase().replace('_', ' ') : 'DOCUMENT';
          let bodyLinesHTML = '';
 
          // Determine name
          const resumeName = isPreviewModeActive ? 'RESUME' : (currentUserProfile?.name || 'RESUME');
          const resumeRole = appRole || 'SOFTWARE ENGINEER';

          if (type.includes('resume')) {
            headerText = 'RESUME';
            bodyLinesHTML = \`
               <div class="sheet-line name">\${resumeName}</div>
               <div class="sheet-line role">\${resumeRole}</div>
               <div class="sheet-line heading"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line short"></div>
               <div class="sheet-line heading"></div>
               <div class="sheet-line"></div>
            \`;
          } else if (type.includes('cover_letter') || type.includes('cover')) {
            headerText = 'COVER LETTER';
            bodyLinesHTML = \`
               <div class="sheet-line name" style="font-size:4px;">Dear Hiring Manager,</div>
               <div class="sheet-line heading" style="width:20%; margin-top:4px;"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line medium"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line short"></div>
            \`;
          } else if (type.includes('answers')) {
            headerText = 'ANSWERS';
            bodyLinesHTML = \`
               <div class="sheet-line heading" style="width:70%; height:3px; background:rgba(0,0,0,0.1);"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line short"></div>
               <div class="sheet-line heading" style="width:50%; height:3px; background:rgba(0,0,0,0.1); margin-top:4px;"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line medium"></div>
            \`;
          } else if (type.includes('message') || type.includes('outreach')) {
            headerText = 'MESSAGE';
            bodyLinesHTML = \`
               <div class="sheet-line name" style="font-size:4px; color:var(--accent-primary);">Recruiter Outreach</div>
               <div class="sheet-line" style="margin-top:2px;"></div>
               <div class="sheet-line medium"></div>
               <div class="sheet-line short"></div>
            \`;
          } else if (type.includes('interview_prep') || type.includes('prep')) {
            headerText = 'PREP POINTS';
            bodyLinesHTML = \`
               <div class="sheet-line name" style="font-size:4px;">Talking Points</div>
               <div class="sheet-line heading" style="width:30%; height:3px; background:rgba(0,0,0,0.1); margin-top:2px;"></div>
               <div class="sheet-line" style="margin-top:2px;"></div>
               <div class="sheet-line short"></div>
               <div class="sheet-line heading" style="width:30%; height:3px; background:rgba(0,0,0,0.1); margin-top:2px;"></div>
               <div class="sheet-line"></div>
            \`;
          } else if (type.includes('image')) {
            headerText = 'IMAGE';
            bodyLinesHTML = \`
               <div style="flex:1; border:0.5px dashed rgba(0,0,0,0.15); border-radius:3px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.01); height: 100%;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12" style="color:rgba(0,0,0,0.3);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
               </div>
            \`;
          } else {
            bodyLinesHTML = \`
               <div class="sheet-line heading"></div>
               <div class="sheet-line"></div>
               <div class="sheet-line medium"></div>
               <div class="sheet-line short"></div>
            \`;
          }
 
          return \`
             <div class="sheet sheet-\${index}">
               <div class="sheet-header">
                 <span class="sheet-title-text">\${headerText}</span>
               </div>
               <div class="sheet-lines" style="display:flex; flex-direction:column; height: calc(100% - 8px); justify-content: flex-start;">
                 \${bodyLinesHTML}
               </div>
             </div>
          \`;
        }

        // Modal triggers
        function openJobModal(appId) {
          const app = isPreviewModeActive 
            ? previewApplications.find(a => a.id === appId)
            : activeApplications.find(a => a.id === appId);
          if (!app) return;
          currentJobModalApp = app;

          // Render metadata
          document.getElementById('job-modal-title').textContent = app.role;
          
          let platformName = '';
          if (app.platform) {
            platformName = app.platform;
          } else if (app.source) {
            platformName = app.source;
          }

          if (!platformName && app.job_url) {
            try {
              const parsedUrl = new URL(app.job_url);
              const host = parsedUrl.hostname.toLowerCase();
              if (host.includes('linkedin.com')) {
                platformName = 'LinkedIn';
              } else if (host.includes('naukri.com')) {
                platformName = 'Naukri';
              } else if (host.includes('indeed.com')) {
                platformName = 'Indeed';
              } else if (host.includes('hirenext.ai') || host.includes('hirenextai')) {
                platformName = 'HireNextAI';
              } else {
                const parts = host.replace('www.', '').split('.');
                if (parts.length >= 2) {
                  const secondLevel = parts[parts.length - 2];
                  if (secondLevel && secondLevel.length > 2) {
                    platformName = secondLevel.charAt(0).toUpperCase() + secondLevel.slice(1) + ' Careers';
                  }
                }
              }
            } catch (e) {
              // Ignore
            }
          }

          if (!platformName) {
            const notesLower = (app.application_notes || '').toLowerCase();
            if (notesLower.includes('linkedin')) {
              platformName = 'LinkedIn';
            } else if (notesLower.includes('naukri')) {
              platformName = 'Naukri';
            } else if (notesLower.includes('indeed')) {
              platformName = 'Indeed';
            } else if (notesLower.includes('hirenext')) {
              platformName = 'HireNextAI';
            }
          }

          if (!platformName) {
            if (app.date_applied && app.status && app.status.toLowerCase() !== 'not applied') {
              platformName = 'Career Page';
            } else {
              platformName = 'Source unavailable';
            }
          }

          const jobUrl = app.job_url;
          const isUrlValid = jobUrl && (jobUrl.startsWith('http://') || jobUrl.startsWith('https://'));
          let platformHTML = '';
          if (isUrlValid) {
            platformHTML = \`via <a href="\${jobUrl}" target="_blank" rel="noopener noreferrer" class="platform-link" onclick="event.stopPropagation();" onmouseover="this.style.color='var(--text-main)'" onmouseout="this.style.color='var(--text-muted)'" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; transition:color 0.15s; font-weight:600;">\${platformName} <span style="font-size:9px; margin-left:2px; opacity:0.75;">↗</span></a>\`;
          } else {
            platformHTML = \`via \${platformName}\`;
          }

          document.getElementById('job-modal-subtitle').innerHTML = platformHTML;
          
          const docs = app.documents || [];
          document.getElementById('job-modal-docs-count').textContent = \`Documents (\${docs.length})\`;

          const docListContainer = document.getElementById('job-documents-list');
          docListContainer.innerHTML = '';

          if (docs.length === 0) {
            docListContainer.innerHTML = \`<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 13.5px; padding: 20px 0;">No AI-generated documents yet.</p>\`;
          } else {
            docs.forEach(doc => {
              const docItem = document.createElement('div');
              docItem.className = 'document-item';
              
              let docIcon = '📄';
              const typeLower = doc.type.toLowerCase();
              if (typeLower.includes('resume')) {
                docIcon = '📄';
              } else if (typeLower.includes('cover_letter') || typeLower.includes('cover')) {
                docIcon = '✉';
              } else if (typeLower.includes('message') || typeLower.includes('outreach')) {
                docIcon = '💬';
              } else if (typeLower.includes('answers')) {
                docIcon = '❓';
              } else if (typeLower.includes('interview_prep') || typeLower.includes('prep')) {
                docIcon = '🎯';
              } else if (typeLower.includes('image')) {
                docIcon = '🖼';
              } else if (typeLower.includes('text')) {
                docIcon = '📝';
              }

              let displayTitle = doc.title;
              if (typeLower.includes('resume')) {
                displayTitle = 'Resume';
              } else if (typeLower.includes('cover_letter') || typeLower.includes('cover')) {
                displayTitle = 'Cover Letter';
              } else if (typeLower.includes('answers') || typeLower.includes('q&a')) {
                displayTitle = 'Application Answers';
              } else if (typeLower.includes('message') || typeLower.includes('outreach')) {
                if (doc.title.toLowerCase().includes('follow-up') || doc.title.toLowerCase().includes('followup')) {
                  displayTitle = 'Follow-up Email';
                } else {
                  displayTitle = 'Recruiter Outreach Message';
                }
              } else if (typeLower.includes('interview_prep') || typeLower.includes('prep')) {
                displayTitle = 'Interview Prep';
              } else if (typeLower.includes('portfolio')) {
                displayTitle = 'Portfolio Summary';
              } else if (typeLower.includes('image')) {
                displayTitle = 'Generated Image';
              } else {
                if (doc.title) {
                  displayTitle = doc.title;
                } else {
                  displayTitle = doc.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
              }

              const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              const docTypeMeta = doc.type.toUpperCase().replace('_', ' ');

              docItem.innerHTML = \`
                <div class="doc-item-left">
                  <div class="doc-icon-box">\${docIcon}</div>
                  <div class="doc-item-details">
                    <span class="doc-item-name">\${displayTitle}</span>
                    <span class="doc-item-meta">\${docTypeMeta} • \${formattedDate}</span>
                  </div>
                </div>
                <div class="doc-preview-overlay">
                  <button onclick="openDocViewer(event, '\${doc.id}')" aria-label="Preview document \${displayTitle}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
                    Preview
                  </button>
                </div>
              \`;
              docListContainer.appendChild(docItem);
            });
          }

          const overlay = document.getElementById('job-modal');
          overlay.style.display = 'flex';
          setTimeout(() => overlay.classList.add('active'), 10);
        }

        function closeJobModal() {
          const overlay = document.getElementById('job-modal');
          overlay.classList.remove('active');
          setTimeout(() => overlay.style.display = 'none', 200);
          currentJobModalApp = null;
        }

        function closeJobModalOutside(event) {
          if (event.target.id === 'job-modal') {
            closeJobModal();
          }
        }

        async function openDocViewer(event, docId) {
          if (event) event.stopPropagation();
          currentDocId = docId;

          const docContentEl = document.getElementById('viewer-doc-content');
          docContentEl.textContent = 'Loading document content securely...';

          // Open overlay immediately to feel responsive
          const overlay = document.getElementById('viewer-modal');
          overlay.style.display = 'flex';
          setTimeout(() => overlay.classList.add('active'), 10);

          if (isPreviewModeActive) {
            let foundDoc = null;
            for (const app of previewApplications) {
              const d = app.documents.find(doc => doc.id === docId);
              if (d) {
                foundDoc = d;
                break;
              }
            }
            if (foundDoc) {
              document.getElementById('viewer-title').textContent = foundDoc.title;
              const company = currentJobModalApp ? currentJobModalApp.company : 'Job Assistant';
              const role = currentJobModalApp ? currentJobModalApp.role : 'Documents';
              document.getElementById('viewer-subtitle').textContent = \`\${role} • \${company}\`;
              
              const isImage = (foundDoc.type && foundDoc.type.toLowerCase().includes('image')) || (foundDoc.content && foundDoc.content.startsWith('data:image/'));
              if (isImage) {
                docContentEl.innerHTML = \`<img src="\${foundDoc.content}" style="max-width:100%; max-height:450px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); display:block; margin:0 auto; object-fit:contain;" alt="\${foundDoc.title}" />\`;
                document.getElementById('viewer-copy-btn').style.display = 'none';
              } else {
                docContentEl.textContent = foundDoc.content;
                document.getElementById('viewer-copy-btn').style.display = 'inline-flex';
              }
            } else {
              docContentEl.textContent = 'Preview document not found.';
            }
            return;
          }

          try {
            const res = await fetch(\`/api/documents/\${docId}\`, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) throw new Error('Failed to load document');
            
            const docData = await res.json();
            
            document.getElementById('viewer-title').textContent = docData.title;
            
            const company = currentJobModalApp ? currentJobModalApp.company : 'Job Assistant';
            const role = currentJobModalApp ? currentJobModalApp.role : 'Documents';
            document.getElementById('viewer-subtitle').textContent = \`\${role} • \${company}\`;
            
            const isImage = (docData.type && docData.type.toLowerCase().includes('image')) || (docData.content && docData.content.startsWith('data:image/'));
            if (isImage) {
              docContentEl.innerHTML = \`<img src="\${docData.content}" style="max-width:100%; max-height:450px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); display:block; margin:0 auto; object-fit:contain;" alt="\${docData.title}" />\`;
              document.getElementById('viewer-copy-btn').style.display = 'none';
            } else {
              docContentEl.textContent = docData.content;
              document.getElementById('viewer-copy-btn').style.display = 'inline-flex';
            }
          } catch (err) {
            console.error('Error fetching document:', err);
            docContentEl.innerHTML = \`<span style="color:var(--status-rejected);">Failed to load document content. Please verify authentication status.</span>\`;
          }
        }

        function executeCopyText() {
          const contentEl = document.getElementById('viewer-doc-content');
          const text = contentEl.textContent || contentEl.innerText;
          navigator.clipboard.writeText(text).then(() => {
            showToastNotification('Document text copied to clipboard successfully.');
          }).catch(err => {
            console.error('Error copying text:', err);
            showToastNotification('Failed to copy text content.');
          });
        }

        function closeViewerModal() {
          const overlay = document.getElementById('viewer-modal');
          overlay.classList.remove('active');
          setTimeout(() => overlay.style.display = 'none', 200);
          currentDocId = null;
        }

        function closeViewerModalOutside(event) {
          if (event.target.id === 'viewer-modal') {
            closeViewerModal();
          }
        }

        function executeDownload() {
          if (!currentDocId) return;
          if (isPreviewModeActive) {
            let foundDoc = null;
            for (const app of previewApplications) {
              const d = app.documents.find(doc => doc.id === currentDocId);
              if (d) {
                foundDoc = d;
                break;
              }
            }
            if (foundDoc) {
              const blob = new Blob([foundDoc.content], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = \`\${foundDoc.title.replace(/\\s+/g, '_')}_DEMO.txt\`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToastNotification('Demo document downloaded successfully.');
            }
            return;
          }
          // Open PDF download URL in a new window/tab safely passing the token
          window.open(\`/api/documents/\${currentDocId}/pdf?token=\${token}\`, '_blank');
        }

        function openDeleteConfirm() {
          const overlay = document.getElementById('confirm-modal');
          overlay.style.display = 'flex';
          setTimeout(() => overlay.classList.add('active'), 10);
        }

        function closeConfirmModal() {
          const overlay = document.getElementById('confirm-modal');
          overlay.classList.remove('active');
          setTimeout(() => overlay.style.display = 'none', 200);
        }

        async function executeDelete() {
          if (!currentDocId) return;
          closeConfirmModal();

          if (isPreviewModeActive) {
            let deleted = false;
            for (const app of previewApplications) {
              const index = app.documents.findIndex(doc => doc.id === currentDocId);
              if (index !== -1) {
                app.documents.splice(index, 1);
                deleted = true;
                break;
              }
            }
            if (deleted) {
              showToastNotification('Temporary preview document removed.');
              closeViewerModal();
              closeJobModal();
              applyFiltersAndRender();
            }
            return;
          }

          try {
            const res = await fetch(\`/api/documents/\${currentDocId}\`, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.ok) {
              showToastNotification('Document deleted successfully.');
              closeViewerModal();
              
              // Close job modal and refresh active applications grid
              closeJobModal();
              loadDashboard();
            } else {
              showToastNotification('Failed to delete document.');
            }
          } catch (err) {
            console.error('Error deleting document:', err);
            showToastNotification('Error connecting to backend server.');
          }
        }

        function showToastNotification(message) {
          const toast = document.getElementById('toast-notification');
          document.getElementById('toast-message').textContent = message;
          toast.classList.add('active');
          setTimeout(() => {
            toast.classList.remove('active');
          }, 3000);
        }

        // Accessibility ESC key listener
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            if (document.getElementById('confirm-modal').style.display === 'flex') {
              closeConfirmModal();
            } else if (document.getElementById('viewer-modal').style.display === 'flex') {
              closeViewerModal();
            } else if (document.getElementById('job-modal').style.display === 'flex') {
              closeJobModal();
            }
          }
        });

        function showLoginForm() {
          document.getElementById('dashboard-layout').style.display = 'none';
          document.getElementById('login-overlay').style.display = 'flex';
        }

        async function handleAuthSubmit(event) {
          event.preventDefault();
          const email = document.getElementById('auth-email').value;
          const password = document.getElementById('auth-password').value;
          const errorMsg = document.getElementById('auth-error-msg');
          errorMsg.style.display = 'none';

          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok && data.token) {
              token = data.token;
              localStorage.setItem('token', token);
              
              const profileRes = await fetch('/api/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
              });
              const profile = await profileRes.json();
              window.location.replace('/profile/' + profile.user_id + '/documents');
            } else {
              errorMsg.style.display = 'block';
              errorMsg.textContent = data.error || 'Failed to authenticate.';
            }
          } catch (e) {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Connection failure.';
          }
        }

        function logout() {
          localStorage.removeItem('token');
          token = null;
          showLoginForm();
        }

        // Custom Dropdowns Implementation
        let activeOpenDropdown = null;

        function toggleCustomDropdown(id) {
          const menu = document.getElementById('menu-' + id);
          const trigger = document.getElementById('dropdown-' + id);
          if (!menu) return;

          const isShow = menu.classList.contains('show');
          
          closeAllCustomDropdowns();

          if (!isShow) {
            menu.style.display = 'block';
            trigger.classList.add('open');
            void menu.offsetWidth;
            menu.classList.remove('hiding');
            menu.classList.add('show');
            const container = document.getElementById('trigger-' + id);
            if (container) container.setAttribute('aria-expanded', 'true');
            activeOpenDropdown = id;
          }
        }

        function closeAllCustomDropdowns() {
          const menus = document.querySelectorAll('.custom-dropdown-menu.show');
          menus.forEach(menu => {
            const id = menu.id.replace('menu-', '');
            const trigger = document.getElementById('dropdown-' + id);
            const container = document.getElementById('trigger-' + id);
            if (trigger) trigger.classList.remove('open');
            if (container) container.setAttribute('aria-expanded', 'false');
            
            menu.classList.remove('show');
            menu.classList.add('hiding');
            setTimeout(() => {
              if (menu.classList.contains('hiding')) {
                menu.style.display = 'none';
                menu.classList.remove('hiding');
              }
            }, 160);
          });
          activeOpenDropdown = null;
        }

        document.addEventListener('click', (e) => {
          if (!e.target.closest('.custom-dropdown')) {
            closeAllCustomDropdowns();
          }
        });

        const sortOptions = [
          { value: 'updated', label: '↕ Recently Updated' },
          { value: 'documents', label: '↕ Most Documents' },
          { value: 'newest', label: '↕ Newest' },
          { value: 'oldest', label: '↕ Oldest' }
        ];

        function initSortDropdown() {
          const menu = document.getElementById('menu-sort');
          if (!menu) return;
          menu.innerHTML = '';
          
          const hiddenInput = document.getElementById('sort-filter');
          const currentValue = hiddenInput ? hiddenInput.value : 'updated';

          sortOptions.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (opt.value === currentValue ? ' selected' : '');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', opt.value === currentValue ? 'true' : 'false');
            item.tabIndex = -1;
            item.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>' + opt.label + '</span>';
            item.onclick = () => {
              selectSortOption(opt.value, opt.label);
            };
            menu.appendChild(item);
          });
        }

        function selectSortOption(value, label) {
          const hiddenInput = document.getElementById('sort-filter');
          if (hiddenInput) {
            hiddenInput.value = value;
          }
          const labelSpan = document.getElementById('label-sort');
          if (labelSpan) {
            labelSpan.textContent = label;
          }
          closeAllCustomDropdowns();
          initSortDropdown();
          
          if (typeof handleFilterChange === 'function') {
            handleFilterChange();
          }
        }

        function handleDropdownKeydown(e, id) {
          const menu = document.getElementById('menu-' + id);
          if (!menu) return;

          const isExpanded = menu.classList.contains('show');

          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (!isExpanded) {
              toggleCustomDropdown(id);
            } else {
              const activeEl = document.activeElement;
              if (activeEl && activeEl.classList.contains('custom-dropdown-item')) {
                activeEl.click();
              }
            }
            return;
          }

          if (e.key === 'Escape') {
            if (isExpanded) {
              e.preventDefault();
              closeAllCustomDropdowns();
              document.getElementById('trigger-' + id).focus();
            }
            return;
          }

          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isExpanded) {
              toggleCustomDropdown(id);
              setTimeout(() => focusFirstOption(id), 50);
            } else {
              navigateOptions(id, e.key === 'ArrowDown' ? 1 : -1);
            }
            return;
          }

          if (e.key === 'Tab') {
            if (isExpanded) {
              closeAllCustomDropdowns();
            }
          }
        }

        function focusFirstOption(id) {
          const menu = document.getElementById('menu-' + id);
          const first = menu.querySelector('.custom-dropdown-item');
          if (first) {
            first.tabIndex = 0;
            first.focus();
          }
        }

        function navigateOptions(id, direction) {
          const menu = document.getElementById('menu-' + id);
          const items = Array.from(menu.querySelectorAll('.custom-dropdown-item'));
          const activeEl = document.activeElement;
          const currentIndex = items.indexOf(activeEl);

          let nextIndex = currentIndex + direction;
          if (nextIndex < 0) nextIndex = items.length - 1;
          if (nextIndex >= items.length) nextIndex = 0;

          const target = items[nextIndex];
          if (target) {
            items.forEach(i => i.tabIndex = -1);
            target.tabIndex = 0;
            target.focus();
          }
        }

        // Initialize custom dropdowns onload
        initSortDropdown();

        // Initialize Page onload
        initPage();
      </script>
    </body>
    </html>
  `);
});

app.get('/profile/:userId/applications', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HirenextAI - Applications</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #ffffff;
          --bg-card: #ffffff;
          --card-border: #e4e4e7;
          --accent-primary: #09090b;
          --accent-glow: #f4f4f5;
          --text-main: #09090b;
          --text-muted: #71717a;
          --text-secondary: #52525b;
          
          /* Status Badges Specific Colors */
          --status-applied-bg: #EFF6FF;
          --status-applied-text: #1D4ED8;
          --status-applied-border: #DBEAFE;
          
          --status-review-bg: #F5F3FF;
          --status-review-text: #6D28D9;
          --status-review-border: #EDE9FE;
          
          --status-assessment-bg: #F5F3FF;
          --status-assessment-text: #6D28D9;
          --status-assessment-border: #EDE9FE;
          
          --status-interview-bg: #FEF3C7;
          --status-interview-text: #D97706;
          --status-interview-border: #FDE68A;
          
          --status-offer-bg: #F0FDF4;
          --status-offer-text: #16A34A;
          --status-offer-border: #DCFCE7;

          --status-hired-bg: #F0FDF4;
          --status-hired-text: #16A34A;
          --status-hired-border: #DCFCE7;
          
          --status-rejected-bg: #FEF2F2;
          --status-rejected-text: #991B1B;
          --status-rejected-border: #FEE2E2;
          
          --status-withdrawn-bg: #F4F4F5;
          --status-withdrawn-text: #4B5563;
          --status-withdrawn-border: #E4E4E7;
        }

        body {
          margin: 0;
          padding: 0;
          background: #fafafa;
          color: var(--text-main);
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        #dashboard-layout {
          display: flex;
          flex: 1;
          min-height: 100vh;
        }

        /* Sidebar styles */
        .sidebar {
          width: 300px;
          min-width: 300px;
          background: #ffffff;
          border-right: 1px solid var(--card-border);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          box-sizing: border-box;
          transition: width 340ms cubic-bezier(0.22, 1, 0.36, 1), min-width 340ms cubic-bezier(0.22, 1, 0.36, 1), padding 340ms cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
          z-index: 200;
        }

        .sidebar.collapsed {
          width: 72px;
          min-width: 72px;
          padding: 24px 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 0 8px;
          box-sizing: border-box;
          transition: flex-direction 0.22s ease, gap 0.22s ease;
        }

        .sidebar.collapsed .sidebar-header {
          flex-direction: column;
          gap: 16px;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
          width: 100%;
        }

        .sidebar.collapsed .sidebar-brand {
          justify-content: center;
        }

        .sidebar-brand-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-brand-left {
          gap: 0;
          justify-content: center;
          overflow: visible;
        }

        .sidebar-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          cursor: default;
          pointer-events: none;
          background: transparent;
          border: none;
          box-shadow: none;
          transition: background-color 180ms ease, transform 180ms ease;
          user-select: none;
          -webkit-user-select: none;
          flex-shrink: 0;
        }

        .sidebar.collapsed .sidebar-logo-container {
          cursor: pointer;
          pointer-events: auto;
        }

        .sidebar.collapsed .sidebar-logo-container:hover {
          background-color: rgba(0, 0, 0, 0.035);
          transform: scale(1.04);
        }

        @keyframes logoPress {
          0% { transform: scale(1); }
          40% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }

        .logo-pressing {
          animation: logoPress 100ms ease-in-out 1;
        }

        .sidebar-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          min-width: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }

        .sidebar-close-btn:hover {
          background-color: #F5F5F5;
          color: var(--text-main);
        }

        .sidebar.collapsed .sidebar-close-btn {
          display: none !important;
        }

        .logo-svg {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          transition: transform 0.2s ease;
          overflow: visible;
        }

        .logo-svg .center-dot {
          fill: #111111;
          stroke: none;
          transform-origin: 50px 50px;
          transition: transform 0.2s ease;
        }

        .logo-svg .line {
          fill: none;
          stroke: #111111;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 50;
          stroke-dashoffset: 0;
          opacity: 1;
        }

        .logo-svg .dot {
          fill: #111111;
          stroke: none;
          transform-origin: center;
          opacity: 1;
          transition: transform 0.2s ease;
        }

        .sidebar-brand-text {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-main);
          opacity: 1;
          transform: translateX(0);
          transition: opacity 220ms ease, transform 220ms ease;
          transition-delay: 150ms;
          width: auto;
          white-space: nowrap;
        }

        .sidebar.collapsed-text .sidebar-brand-text {
          opacity: 0;
          transform: translateX(-8px);
          transition-delay: 0s;
          width: 0;
          pointer-events: none;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-menu-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
          white-space: nowrap;
        }

        .sidebar-menu-item svg {
          min-width: 18px;
        }

        .sidebar-menu-item span {
          margin-left: 12px;
          transform: translateX(0);
          opacity: 1;
          display: inline-block;
          transition: opacity 220ms ease, transform 220ms ease, width 220ms ease, margin-left 220ms ease;
          transition-delay: 190ms;
          white-space: nowrap;
        }

        .sidebar-menu-item:hover {
          color: var(--text-main);
          background: rgba(0, 0, 0, 0.02);
        }

        .sidebar-menu-item.active {
          color: var(--accent-primary);
          background: var(--accent-glow);
          border-left: 3px solid var(--accent-primary);
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }

        .sidebar.collapsed .sidebar-menu-item {
          padding: 12px;
          justify-content: center;
        }

        .sidebar.collapsed-menu .sidebar-menu-item span {
          opacity: 0;
          transform: translateX(-6px);
          width: 0;
          margin-left: 0;
          transition-delay: 0s;
          pointer-events: none;
          visibility: hidden;
        }

        /* Main panel styles */
        .main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 40px;
          height: 48px;
          border-bottom: 1px solid var(--card-border);
          background: #ffffff;
        }

        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }

        [data-tooltip] {
          position: relative;
        }

        [data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 110%;
          top: 50%;
          transform: translateY(-50%) scale(0.9);
          background: #09090b;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        [data-tooltip]:hover::after {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }

        .sidebar:not(.collapsed) .sidebar-menu-item[data-tooltip]::after {
          display: none !important;
        }

        /* Main Content Layout */
        #dashboard-main-content {
          padding: 40px;
          flex: 1;
          overflow-y: auto;
          box-sizing: border-box;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
        }

        .dashboard-title h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 6px 0;
          letter-spacing: -0.03em;
          color: #09090b;
        }

        .dashboard-title p {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0;
        }

        /* Analytics row statistics cards */
        .summary-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .summary-card {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .summary-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }

        .summary-card-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .summary-card-icon-container {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
        }

        .summary-card-icon-container svg {
          width: 13px;
          height: 13px;
        }

        .stat-total-icon {
          background: #f4f4f5;
          color: #71717a;
          border-color: #e4e4e7;
        }

        .stat-applied-icon {
          background: #EFF6FF;
          color: #1D4ED8;
          border-color: #DBEAFE;
        }

        .stat-review-icon {
          background: #F5F3FF;
          color: #6D28D9;
          border-color: #EDE9FE;
        }

        .stat-interview-icon {
          background: #FEF3C7;
          color: #D97706;
          border-color: #FDE68A;
        }

        .stat-offers-icon {
          background: #F0FDF4;
          color: #16A34A;
          border-color: #DCFCE7;
        }

        .summary-card-value {
          font-size: 30px;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.1;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }

        .summary-card-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        /* Toolbar filtering */
        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          align-items: center;
        }

        /* Animated Search Bar Container */
        /* Animated Search Bar Container */
        .search-bar-container {
          position: relative;
          z-index: 50;
          border-radius: 32px;
          height: 40px;
          width: 420px; /* Always open */
          max-width: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: transparent;
          cursor: default;
          border: none;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
        }

        /* Traveling Border Line CSS - Colorful Rotating Line */
        .border-animation-line {
          position: absolute;
          inset: -150%;
          border-radius: 32px;
          background: conic-gradient(from 0deg, #FF7F50, #FF3366, #9933FF, #00C9FF, #FF7F50);
          opacity: 1; /* Always visible */
          z-index: 0;
          pointer-events: none;
          animation: rotateBorder 3s linear infinite; /* Always running */
        }

        @keyframes rotateBorder {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Inner Search Background */
        .search-inner-bg {
          position: absolute;
          inset: 2px; /* 2px gap to show the gradient border line */
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 30px;
          z-index: 1;
        }

        /* Content Container */
        .search-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0;
        }

        .search-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-main);
          position: relative;
          cursor: pointer;
        }

        .search-icon-svg {
          transition: opacity 250ms ease, transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes scanIcon {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(0.8) rotate(-15deg); }
          70% { transform: scale(1.15) rotate(15deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .search-icon-svg.scanning {
          animation: scanIcon 600ms ease-in-out;
        }

        /* Input field styles */
        .animated-search-input {
          border: none;
          background: transparent;
          height: 100%;
          width: calc(100% - 40px);
          opacity: 1;
          padding: 0 14px 0 0;
          outline: none;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-main);
          box-sizing: border-box;
        }

        /* Card Stagger Entrance override with spring jump animation */
        @keyframes cardJump {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.90);
            filter: blur(4px);
          }
          50% {
            opacity: 1;
            transform: translateY(2px) scale(1.05); /* overshoot */
            filter: blur(0);
          }
          75% {
            transform: translateY(-1px) scale(0.98); /* rebound */
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1.00); /* settle */
            filter: blur(0);
          }
        }

        /* Reusable Animated Border Dropdown Container */
        .animated-select-container {
          position: relative;
          z-index: 40;
          border-radius: 10px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          background: transparent;
          cursor: pointer;
          border: none;
          min-width: 160px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
          transition: box-shadow 0.2s ease;
        }

        .animated-select-container:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .select-inner-bg {
          position: absolute;
          inset: 2px;
          background: #ffffff;
          border-radius: 8px;
          z-index: 1;
          pointer-events: none;
          transition: background 0.2s ease;
        }

        .animated-select-container:hover .select-inner-bg {
          background: #f8f8f8;
        }

        .custom-dropdown {
          position: relative;
          display: inline-block;
        }

        .select-trigger-content {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
          user-select: none;
          gap: 8px;
        }

        .dropdown-chevron {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
          color: #71717a;
          flex-shrink: 0;
        }

        .custom-dropdown.open .dropdown-chevron {
          transform: rotate(180deg);
        }

        /* Floating Premium Dropdown Menu */
        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 100;
          background: #ffffff;
          border: 1px solid var(--card-border);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          min-width: 190px;
          padding: 6px 0;
          margin: 0;
          opacity: 0;
          transform: scale(0.97) translateY(-4px);
          pointer-events: none;
          visibility: hidden;
          display: none;
          transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                      visibility 180ms cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }

        .custom-dropdown-menu.show {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
          visibility: visible;
        }

        .custom-dropdown-menu.hiding {
          opacity: 0;
          transform: scale(0.98) translateY(-3px);
          pointer-events: none;
          visibility: hidden;
          transition: opacity 150ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 150ms cubic-bezier(0.22, 1, 0.36, 1),
                      visibility 150ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Dropdown Option Items */
        .custom-dropdown-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          user-select: none;
          gap: 8px;
          outline: none;
        }

        .custom-dropdown-item:hover, .custom-dropdown-item:focus {
          background: #f4f4f5;
          color: var(--text-main);
        }

        .custom-dropdown-item.selected {
          background: #f5f5f5;
          color: #111111;
          font-weight: 600;
        }

        .custom-dropdown-item-checkmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          font-size: 11px;
          font-weight: 700;
          color: #111111;
          opacity: 0;
        }

        .custom-dropdown-item.selected .custom-dropdown-item-checkmark {
          opacity: 1;
        }

        /* Secondary Row Spacing & Chip Styles */
        .quick-filters-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
          opacity: 0;
          animation: toolbarFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.2s;
        }

        .quick-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quick-chip {
          border-radius: 999px;
          border: 1px solid var(--card-border);
          background: #ffffff;
          color: var(--text-muted);
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }

        .quick-chip:hover {
          border-color: #a1a1aa;
          color: var(--text-main);
          background: #f8f8f8;
        }

        .quick-chip.active {
          background: #09090b;
          border-color: #09090b;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .secondary-dropdowns {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Small select trigger for secondary chips row */
        .animated-select-container.small {
          height: 32px;
          min-width: 120px;
          border-radius: 8px;
        }
        
        .animated-select-container.small .select-inner-bg {
          border-radius: 6px;
        }

        .animated-select-container.small .select-trigger-content {
          padding: 0 12px;
          font-size: 12px;
        }

        @media (prefers-reduced-motion: reduce) {
          .border-animation-line {
            animation: none !important;
            background: var(--card-border) !important;
          }
        }

        /* Applications Board Grid/List */
        .app-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        /* Interactive Premium Application Card */
        .app-row {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 20px 24px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
          opacity: 0;
          transform: translateY(-20px) scale(0.90);
          filter: blur(4px);
          animation: none !important;
          will-change: opacity, transform, filter;
        }

        .app-row.emerged {
          animation: cardJump 550ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .app-row.settled {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
          filter: none !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.25s ease !important;
        }

        .app-row.settled:hover {
          border-color: #a1a1aa !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05) !important;
          transform: translateY(-4px) scale(1.005) !important;
        }

        .app-row-logo-container {
          position: relative;
          margin-right: 18px;
          flex-shrink: 0;
        }

        .app-row-logo {
          width: 46px;
          height: 46px;
          border-radius: 8px;
          object-fit: contain;
          border: 1px solid #f4f4f5;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .app-row:hover .app-row-logo {
          transform: scale(1.05);
        }

        .company-logo-fallback {
          width: 46px;
          height: 46px;
          border-radius: 8px;
          background: #18181b;
          color: #ffffff;
          font-weight: 700;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          border: 1px solid #18181b;
          transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .app-row:hover .company-logo-fallback {
          transform: scale(1.05);
        }

        .app-row-details {
          flex: 1;
          min-width: 0;
          padding-right: 24px;
        }

        .app-row-header-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .app-row-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .app-row-company-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .app-row-company {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Platform Badge Styles */
        .platform-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          text-decoration: none;
          padding: 3px 8px;
          border-radius: 6px;
          background: #fafafa;
          border: 1px solid #e4e4e7;
          transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
        }

        .platform-badge:hover {
          background: #f4f4f5;
          color: #09090b;
          border-color: #a1a1aa;
        }

        .platform-badge:hover span {
          text-decoration: underline;
        }

        .platform-badge svg {
          flex-shrink: 0;
        }

        /* Metadata Badges row */
        .app-row-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .app-row-meta-item {
          font-size: 11.5px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2.5px 7px;
          border-radius: 5px;
          border: 1px solid transparent;
        }

        /* Work Mode Tag Subtle Colors */
        .mode-remote {
          background: #ECFDF5;
          color: #047857;
          border-color: #D1FAE5;
        }

        .mode-hybrid {
          background: #FFF7ED;
          color: #C2410C;
          border-color: #FFEDD5;
        }

        .mode-onsite {
          background: #F8FAFC;
          color: #475569;
          border-color: #E2E8F0;
        }

        /* Work Type Pill */
        .type-badge {
          background: #f4f4f5;
          color: #3f3f46;
          border-color: #e4e4e7;
        }

        .app-row-meta-item svg {
          color: #a1a1aa;
        }

        .document-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          background: #ffffff;
          border: 1px solid #e4e4e7;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Split aside layout: Top-right status badge, bottom dates */
        .app-row-right-aside {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
          margin-right: 28px;
          height: 100%;
        }

        .app-row-status-wrapper {
          display: flex;
          justify-content: flex-end;
          width: auto;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          border: 1px solid;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease;
        }

        .status-pill svg {
          width: 11px;
          height: 11px;
          stroke-width: 2.5;
        }

        /* Status Themes & Glows */
        .status-applied {
          background: var(--status-applied-bg);
          color: var(--status-applied-text);
          border-color: var(--status-applied-border);
          --status-glow: rgba(55, 65, 81, 0.12);
        }
        .status-review {
          background: var(--status-review-bg);
          color: var(--status-review-text);
          border-color: var(--status-review-border);
          --status-glow: rgba(29, 78, 216, 0.15);
        }
        .status-assessment {
          background: var(--status-assessment-bg);
          color: var(--status-assessment-text);
          border-color: var(--status-assessment-border);
          --status-glow: rgba(124, 58, 237, 0.15);
        }
        .status-interview {
          background: var(--status-interview-bg);
          color: var(--status-interview-text);
          border-color: var(--status-interview-border);
          --status-glow: rgba(180, 83, 9, 0.2);
        }
        .status-offer {
          background: var(--status-offer-bg);
          color: var(--status-offer-text);
          border-color: var(--status-offer-border);
          --status-glow: rgba(21, 128, 61, 0.2);
        }
        .status-hired {
          background: var(--status-hired-bg);
          color: var(--status-hired-text);
          border-color: var(--status-hired-border);
          --status-glow: rgba(4, 120, 87, 0.2);
        }
        .status-rejected {
          background: var(--status-rejected-bg);
          color: var(--status-rejected-text);
          border-color: var(--status-rejected-border);
          --status-glow: rgba(220, 38, 38, 0.15);
        }
        .status-withdrawn {
          background: var(--status-withdrawn-bg);
          color: var(--status-withdrawn-text);
          border-color: var(--status-withdrawn-border);
          --status-glow: rgba(75, 85, 99, 0.12);
        }

        .status-pill:hover {
          transform: scale(1.04);
          box-shadow: 0 0 10px var(--status-glow);
        }

        .app-row-dates {
          text-align: right;
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .app-row-dates div:first-child {
          font-weight: 500;
          color: var(--text-main);
        }

        /* Three-Dot Menu dropdown overlay */
        .card-menu-container {
          position: absolute;
          top: 18px;
          right: 16px;
          z-index: 10;
        }

        .card-menu-btn {
          opacity: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 6px;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: opacity 200ms ease, background-color 200ms ease, color 200ms ease;
        }

        .app-row:hover .card-menu-btn, .card-menu-btn.active {
          opacity: 1;
        }

        .card-menu-btn:hover {
          background: #f4f4f5;
          color: #09090b;
        }

        .dropdown-menu {
          position: absolute;
          top: 32px;
          right: 0;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          z-index: 150;
          min-width: 180px;
          padding: 4px;
          display: none;
          flex-direction: column;
          transform: scale(0.95);
          transform-origin: top right;
          opacity: 0;
          transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dropdown-menu.show {
          display: flex;
          transform: scale(1);
          opacity: 1;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-secondary);
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          border-radius: 6px;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          transition: background 100ms ease, color 100ms ease;
        }

        .dropdown-item:hover {
          background: #f4f4f5;
          color: #09090b;
        }

        .dropdown-item svg {
          color: #a1a1aa;
        }

        .dropdown-item:hover svg {
          color: #09090b;
        }

        .dropdown-item.delete {
          color: #ef4444;
        }

        .dropdown-item.delete:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .dropdown-item.delete:hover svg {
          color: #dc2626;
        }

        /* Center Modal dialog overlay */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: none;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .modal-overlay.active {
          display: flex;
          opacity: 1;
        }

        .modal-container {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
          transform: translateY(20px) scale(0.96);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          padding: 36px;
          position: relative;
        }

        .modal-overlay.active .modal-container {
          transform: translateY(0) scale(1);
        }

        .modal-close-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .modal-close-btn:hover {
          background-color: #f4f4f5;
          color: var(--text-main);
        }

        .modal-brand-block {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 24px;
        }

        .modal-logo {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          object-fit: contain;
          border: 1px solid #f4f4f5;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-logo-fallback {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: #18181b;
          color: #ffffff;
          font-weight: 700;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
        }

        .modal-title-area {
          flex: 1;
          min-width: 0;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
          color: #09090b;
        }

        .modal-company {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 28px 0;
          border-top: 1px solid #f4f4f5;
          border-bottom: 1px solid #f4f4f5;
          padding: 24px 0;
        }

        .modal-grid-item {
          display: flex;
          flex-direction: column;
        }

        .modal-grid-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }

        .modal-grid-value {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        /* Description Block */
        .modal-desc-section {
          margin-bottom: 28px;
        }

        .modal-desc-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-main);
          margin-bottom: 10px;
        }

        .modal-desc-body {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-secondary);
          white-space: pre-line;
        }

        /* Timeline styles */
        .timeline-section {
          margin-top: 28px;
        }

        .timeline-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-main);
          margin-bottom: 16px;
        }

        .timeline {
          position: relative;
          padding-left: 20px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background: #f4f4f5;
        }

        /* Sequential Timeline Nodes Animation */
        @keyframes timelineNodeEntrance {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }

        .modal-overlay.active .timeline-item {
          animation: timelineNodeEntrance 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .modal-overlay.active .timeline-item:nth-child(1) { animation-delay: 50ms; }
        .modal-overlay.active .timeline-item:nth-child(2) { animation-delay: 120ms; }
        .modal-overlay.active .timeline-item:nth-child(3) { animation-delay: 190ms; }
        .modal-overlay.active .timeline-item:nth-child(4) { animation-delay: 260ms; }
        .modal-overlay.active .timeline-item:nth-child(5) { animation-delay: 330ms; }
        .modal-overlay.active .timeline-item:nth-child(6) { animation-delay: 400ms; }

        .timeline-item:last-child {
          margin-bottom: 0;
        }

        .timeline-item::before {
          content: '';
          position: absolute;
          left: -20px;
          top: 5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e4e4e7;
          border: 2px solid #ffffff;
          box-sizing: border-box;
          z-index: 2;
          transition: background 0.3s ease;
        }

        .timeline-item.completed::before {
          background: #09090b;
        }

        .timeline-item-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        .timeline-item-date {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Empty state styling */
        .empty-state {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          background: #ffffff;
          border: 1px dashed var(--card-border);
          border-radius: 12px;
        }

        .empty-state svg {
          color: #a1a1aa;
          margin-bottom: 18px;
          animation: floatEmpty 3.5s ease-in-out infinite;
        }

        @keyframes floatEmpty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .empty-state h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #09090b;
        }

        .empty-state p {
          font-size: 13.5px;
          color: var(--text-muted);
          max-width: 340px;
          margin: 0;
        }

        /* Skeleton loading row */
        .skeleton-row {
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 20px 24px;
          height: 84px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .skeleton-logo {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: #f4f4f5;
          margin-right: 18px;
          animation: skeletonPulse 1.5s infinite ease-in-out;
        }

        .skeleton-block {
          background: #f4f4f5;
          border-radius: 4px;
          animation: skeletonPulse 1.5s infinite ease-in-out;
        }

        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Documents list layout inside details */
        .assoc-docs-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 12px;
        }

        .assoc-doc-item {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          background: #ffffff;
          text-decoration: none;
          color: var(--text-main);
          font-size: 12.5px;
          font-weight: 600;
          transition: border-color 150ms ease, background-color 150ms ease;
        }

        .assoc-doc-item:hover {
          border-color: #09090b;
          background-color: #fafafa;
        }

        .assoc-doc-item svg {
          color: var(--text-muted);
          margin-right: 8px;
          flex-shrink: 0;
        }

        /* Error state layout */
        .error-state {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 20px;
          text-align: center;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
        }

        .error-state h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 12px 0;
        }

        .retry-btn {
          background: #09090b;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 12.5px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.15s ease;
        }

        .retry-btn:hover {
          background-color: #27272a;
        }

        /* Responsive adaptation */
        @media (max-width: 1024px) {
          #dashboard-main-content {
            padding: 24px;
          }
          .summary-row {
            grid-template-columns: repeat(3, 1fr);
          }
          .assoc-docs-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          #dashboard-layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--card-border);
            padding: 16px;
            display: none;
          }
          .sidebar.mobile-open {
            display: flex;
          }
          .mobile-menu-toggle {
            display: block;
          }
          .summary-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .app-row {
            flex-direction: column;
            align-items: flex-start;
            padding: 18px;
          }
          .app-row-logo-container {
            margin-bottom: 12px;
          }
          .app-row-right-aside {
            width: 100%;
            align-items: flex-start;
            margin-top: 12px;
            gap: 12px;
          }
          .app-row-status-wrapper {
            width: 100%;
            justify-content: flex-start;
          }
          .app-row-dates {
            width: 100%;
            text-align: left;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-select {
            width: 100%;
          }
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sidebar, .sidebar-brand-text, .sidebar-menu-item span, .app-row, .modal-overlay, .modal-container, .dropdown-menu {
            transition: none !important;
            animation: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div id="dashboard-layout" style="display:none; flex: 1; min-height: 100vh;">
        <!-- Left Sidebar Navigation -->
        <aside class="sidebar" id="sidebar-nav">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="sidebar-brand-left">
                <div class="sidebar-logo-container" id="logo-control" onclick="handleLogoClick()" aria-label="Open sidebar" data-tooltip="Open sidebar" tabindex="0">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
                    <circle class="center-dot" cx="50" cy="50" r="7" />
                    <path class="line line-top" d="M 50 50 V 25 H 35" />
                    <path class="line line-top" d="M 50 38 H 63" />
                    <circle class="dot dot-t1" cx="63" cy="38" r="3.5" />
                    <circle class="dot dot-t2" cx="35" cy="25" r="3.5" />
                    <path class="line line-right" d="M 50 50 H 75 V 35" />
                    <path class="line line-right" d="M 62 50 V 63" />
                    <circle class="dot dot-r1" cx="62" cy="63" r="3.5" />
                    <circle class="dot dot-r2" cx="75" cy="35" r="3.5" />
                    <path class="line line-bottom" d="M 50 50 V 75 H 65" />
                    <path class="line line-bottom" d="M 50 62 H 37" />
                    <circle class="dot dot-b1" cx="37" cy="62" r="3.5" />
                    <circle class="dot dot-b2" cx="65" cy="75" r="3.5" />
                    <path class="line line-left" d="M 50 50 H 25 V 65" />
                    <path class="line line-left" d="M 38 50 V 37" />
                    <circle class="dot dot-l1" cx="38" cy="37" r="3.5" />
                    <circle class="dot dot-l2" cx="25" cy="65" r="3.5" />
                  </svg>
                </div>
                <span class="sidebar-brand-text">HireNextAI</span>
              </div>
              <button class="sidebar-close-btn" id="sidebar-close-btn" onclick="handleSidebarCollapseClick()" aria-label="Close sidebar" data-tooltip="Close sidebar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <line x1="18" y1="3" x2="18" y2="21"></line>
                  <path d="M12 17l-5-5 5-5"></path>
                  <line x1="7" y1="12" x2="15" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          <nav class="sidebar-menu">
            <a href="/profile/${req.params.userId}/documents" class="sidebar-menu-item" data-tooltip="Documents">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Documents</span>
            </a>
            <a href="/profile/${req.params.userId}/applications" class="sidebar-menu-item active" data-tooltip="Applications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>Applications</span>
            </a>
          </nav>
        </aside>
        <script>
          if (localStorage.getItem('hirenext_sidebar_collapsed') === 'true') {
            const sidebarNav = document.getElementById('sidebar-nav');
            sidebarNav.classList.add('collapsed');
            sidebarNav.classList.add('collapsed-text');
            sidebarNav.classList.add('collapsed-menu');
          }
        </script>

        <!-- Right Main Panel -->
        <div class="main-panel">
          <header id="dashboard-header-bar">
            <button class="mobile-menu-toggle" onclick="toggleMobileSidebar()" aria-label="Open Navigation Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </header>

          <main id="dashboard-main-content">
            <div class="dashboard-header">
              <div class="dashboard-title">
                <h1>Applications</h1>
                <p>Track your submitted applications and hiring pipelines.</p>
              </div>
            </div>

            <!-- Monochrome Summary Analytics Row -->
            <div class="summary-row">
              <div class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-card-icon-container stat-total-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  </span>
                </div>
                <div class="summary-card-value" id="stat-total">0</div>
                <div class="summary-card-label">Total</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-card-icon-container stat-applied-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                  </span>
                </div>
                <div class="summary-card-value" id="stat-applied">0</div>
                <div class="summary-card-label">Applied</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-card-icon-container stat-review-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path></svg>
                  </span>
                </div>
                <div class="summary-card-value" id="stat-review">0</div>
                <div class="summary-card-label">In Review</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-card-icon-container stat-interview-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </span>
                </div>
                <div class="summary-card-value" id="stat-interview">0</div>
                <div class="summary-card-label">Interview</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-card-icon-container stat-offers-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                  </span>
                </div>
                <div class="summary-card-value" id="stat-offers">0</div>
                <div class="summary-card-label">Offers</div>
              </div>
            </div>

            <!-- Toolbar filtering and actions -->
            <div class="toolbar">
              <div class="search-bar-container" id="search-bar-container" onclick="expandSearchBar(event)">
                <div class="border-animation-line"></div>
                <div class="search-inner-bg"></div>
                <div class="search-content">
                  <div class="search-icon-wrapper" onclick="toggleSearchCollapse(event)">
                    <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                      <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <input type="text" id="search-input" class="animated-search-input" placeholder="Search by position, company, status, document, or skills..." autocomplete="off" onkeydown="handleSearchKeyDown(event)">
                </div>
              </div>
              
              <div class="toolbar-dropdowns">
                <div class="custom-dropdown" id="dropdown-status">
                  <div class="animated-select-container" onclick="toggleCustomDropdown('status')" onkeydown="handleDropdownKeydown(event, 'status')" tabindex="0" role="combobox" aria-expanded="false" aria-controls="menu-status" id="trigger-status">
                    <div class="border-animation-line"></div>
                    <div class="select-inner-bg"></div>
                    <div class="select-trigger-content">
                      <span id="label-status">All Statuses</span>
                      <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="menu-status" role="listbox"></div>
                  <input type="hidden" id="status-filter" value="All">
                </div>

                <div class="custom-dropdown" id="dropdown-sort">
                  <div class="animated-select-container" onclick="toggleCustomDropdown('sort')" onkeydown="handleDropdownKeydown(event, 'sort')" tabindex="0" role="combobox" aria-expanded="false" aria-controls="menu-sort" id="trigger-sort">
                    <div class="border-animation-line"></div>
                    <div class="select-inner-bg"></div>
                    <div class="select-trigger-content">
                      <span id="label-sort">↕ Recently Updated</span>
                      <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="menu-sort" role="listbox"></div>
                  <input type="hidden" id="sort-select" value="Recently Updated">
                </div>
              </div>
            </div>

            <!-- Quick Chips and Optional Filters Row -->
            <div class="quick-filters-row">
              <div class="quick-chips" id="status-quick-chips"></div>
              <div class="secondary-dropdowns">
                <div class="custom-dropdown" id="dropdown-platform" style="display: none;">
                  <div class="animated-select-container small" onclick="toggleCustomDropdown('platform')" onkeydown="handleDropdownKeydown(event, 'platform')" tabindex="0" role="combobox" aria-expanded="false" aria-controls="menu-platform" id="trigger-platform">
                    <div class="border-animation-line"></div>
                    <div class="select-inner-bg"></div>
                    <div class="select-trigger-content">
                      <span id="label-platform">Platform</span>
                      <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="menu-platform" role="listbox"></div>
                </div>

                <div class="custom-dropdown" id="dropdown-worktype" style="display: none;">
                  <div class="animated-select-container small" onclick="toggleCustomDropdown('worktype')" onkeydown="handleDropdownKeydown(event, 'worktype')" tabindex="0" role="combobox" aria-expanded="false" aria-controls="menu-worktype" id="trigger-worktype">
                    <div class="border-animation-line"></div>
                    <div class="select-inner-bg"></div>
                    <div class="select-trigger-content">
                      <span id="label-worktype">Work Type</span>
                      <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="menu-worktype" role="listbox"></div>
                </div>
              </div>
            </div>

            <!-- Grid rows wrapper -->
            <div id="applications-container" class="app-list">
              <!-- Skeletons loaded here -->
            </div>

            <!-- Empty state -->
            <div class="empty-state" id="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <h3>No applications found</h3>
              <p>Active job applications you log through the HireNextAI browser extension will show up here.</p>
            </div>

            <!-- Error State -->
            <div class="error-state" id="error-state">
              <h3>Unable to sync applications.</h3>
              <button class="retry-btn" onclick="fetchApplications()">Try Again</button>
            </div>
          </main>
        </div>
      </div>

      <!-- Application details dialog overlay -->
      <div class="modal-overlay" id="app-modal" onclick="closeModal(event)">
        <div class="modal-container" onclick="event.stopPropagation()">
          <button class="modal-close-btn" onclick="closeModal(null)" aria-label="Close details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div class="modal-brand-block">
            <div id="modal-logo-area"></div>
            <div class="modal-title-area">
              <h2 class="modal-title" id="modal-title">-</h2>
              <div class="modal-company">
                <span id="modal-company">-</span>
                <span id="modal-platform-badge-area"></span>
              </div>
            </div>
          </div>

          <div class="modal-grid">
            <div class="modal-grid-item">
              <div class="modal-grid-label">Status</div>
              <div id="modal-status-badge-area" style="margin-top:2px;">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Applied Date</div>
              <div class="modal-grid-value" id="modal-applied">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Last Checked</div>
              <div class="modal-grid-value" id="modal-last-checked">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Location</div>
              <div class="modal-grid-value" id="modal-location">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Employment Type</div>
              <div class="modal-grid-value" id="modal-type">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Work Mode</div>
              <div class="modal-grid-value" id="modal-work-mode">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Salary</div>
              <div class="modal-grid-value" id="modal-salary">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Experience</div>
              <div class="modal-grid-value" id="modal-experience">-</div>
            </div>
            <div class="modal-grid-item">
              <div class="modal-grid-label">Skills</div>
              <div class="modal-grid-value" id="modal-skills">-</div>
            </div>
          </div>

          <!-- Job description section -->
          <div class="modal-desc-section" id="modal-desc-container" style="display:none;">
            <div class="modal-desc-title">Job Description</div>
            <div class="modal-desc-body" id="modal-description">-</div>
          </div>

          <!-- Status timelines section -->
          <div class="timeline-section">
            <div class="timeline-title">Hiring Timeline</div>
            <div class="timeline" id="modal-timeline">
              <!-- Dynamically populated chronological events -->
            </div>
          </div>

          <!-- Associated documents section -->
          <div class="timeline-section" style="margin-top: 32px; border-top: 1px solid #f4f4f5; padding-top: 24px;">
            <div class="timeline-title">Associated Documents</div>
            <div class="assoc-docs-list" id="modal-documents">
              <!-- Linked resumes/cover letters display here -->
            </div>
          </div>
        </div>
      </div>

      <!-- App Shell Scripting -->
      <script>
        const pathParts = window.location.pathname.split('/');
        const userIdFromUrl = pathParts[pathParts.indexOf('profile') + 1];
        let token = localStorage.getItem('token');

        let isSidebarTransitioning = false;
        let activeApplications = [];
        let searchDebounceTimeout = null;
        let currentOpenAppId = null;
        let pollingInterval = null;

        // Supported statuses icons & semantic variables
        const statusConfig = {
          'applied': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
            class: 'status-applied'
          },
          'submitted': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
            class: 'status-applied'
          },
          'under review': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            class: 'status-review'
          },
          'shortlisted': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            class: 'status-review'
          },
          'assessment': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
            class: 'status-assessment'
          },
          'interview': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            class: 'status-interview'
          },
          'offer': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
            class: 'status-offer'
          },
          'hired': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            class: 'status-hired'
          },
          'rejected': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            class: 'status-rejected'
          },
          'withdrawn': {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
            class: 'status-withdrawn'
          }
        };

                function getPlatformIcon(platform) {
          const p = (platform || '').toLowerCase().trim();
          if (p.includes('linkedin')) {
            return \`<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="color:#0077b5;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>\`;
          }
          if (p.includes('naukri')) {
            return \`<svg viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="3" width="10" height="10"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>\`;
          }
          if (p.includes('indeed')) {
            return \`<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="color:#003a9b;"><path d="M2.5 0A2.5 2.5 0 0 0 0 2.5v19A2.5 2.5 0 0 0 2.5 24h19a2.5 2.5 0 0 0 2.5-2.5v-19A2.5 2.5 0 0 0 21.5 0h-19zM18.5 13.5h-5v5h-3v-5h-5v-3h5v-5h3v5h5v3z"/></svg>\`;
          }
          if (p.includes('google')) {
            return \`<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="color:#ea4335;"><path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.64 11-11.2 0-.753-.08-1.32-.18-1.815H12.24z"/></svg>\`;
          }
          if (p.includes('glassdoor')) {
            return \`<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="color:#0caa41;"><path d="M20.25 0H3.75C1.68 0 0 1.68 0 3.75v16.5C0 22.32 1.68 24 3.75 24h16.5c2.07 0 3.75-1.68 3.75-3.75V3.75C24 1.68 22.32 0 20.25 0zM7.5 18H6v-6.75C6 9.46 7.46 8 9.25 8H18v1.5H9.25C8.28 9.5 7.5 10.28 7.5 11.25V18z"/></svg>\`;
          }
          return \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10" style="color:#71717a;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>\`;
        }

        function getStatusMarkup(status) {
          const s = (status || '').toLowerCase().trim();
          const cfg = statusConfig[s] || {
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="11" height="11"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
            class: 'status-withdrawn'
          };
          return \`<span class="status-pill \${cfg.class}">\${cfg.icon}\${status}</span>\`;
        }

        function getStatusClass(status) {
          const s = (status || '').toLowerCase().trim();
          if (['applied', 'submitted'].includes(s)) return 'status-applied';
          if (['under review', 'shortlisted'].includes(s)) return 'status-review';
          if (s === 'assessment') return 'status-assessment';
          if (s === 'interview') return 'status-interview';
          if (s === 'offer') return 'status-offer';
          if (s === 'hired') return 'status-hired';
          if (s === 'rejected') return 'status-rejected';
          if (s === 'withdrawn') return 'status-withdrawn';
          return 'status-withdrawn';
        }

        function animateNumber(id, endValue) {
          const el = document.getElementById(id);
          if (!el) return;
          const startValue = parseInt(el.textContent) || 0;
          if (startValue === endValue) return;
          
          const duration = 400;
          const startTime = performance.now();
          
          function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress * (2 - progress);
            const current = Math.round(startValue + (endValue - startValue) * ease);
            el.textContent = isNaN(current) ? endValue : current;
            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              el.textContent = endValue;
            }
          }
          requestAnimationFrame(update);
        }

        function renderSkeletons() {
          const container = document.getElementById('applications-container');
          container.innerHTML = '';
          for (let i = 0; i < 4; i++) {
            container.innerHTML += \`
              <div class="skeleton-row">
                <div class="skeleton-logo"></div>
                <div style="flex:1;">
                  <div class="skeleton-block" style="width: 160px; height: 16px; margin-bottom: 8px;"></div>
                  <div class="skeleton-block" style="width: 100px; height: 12px;"></div>
                </div>
                <div class="skeleton-block" style="width: 90px; height: 24px; border-radius: 30px; margin-right: 28px;"></div>
                <div class="skeleton-block" style="width: 120px; height: 12px;"></div>
              </div>
            \`;
          }
          document.getElementById('empty-state').style.display = 'none';
          document.getElementById('error-state').style.display = 'none';
        }

        async function fetchApplications(silent = false) {
          if (!token) return;

          const searchBar = document.getElementById('search-bar-container');
          if (searchBar && !silent) {
            searchBar.classList.add('searching');
          }
          if (!silent) renderSkeletons();

          // 1. Trigger search icon scanning feedback
          const searchIcon = document.querySelector('.search-icon-svg');
          if (searchIcon) {
            searchIcon.classList.add('scanning');
            setTimeout(() => searchIcon.classList.remove('scanning'), 600);
          }

          // 2. Trigger old cards fade-out transition
          const cards = document.querySelectorAll('.app-row');
          cards.forEach(card => {
            card.style.transition = 'opacity 180ms ease, transform 180ms ease, filter 180ms ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(15px) scale(0.95)';
            card.style.filter = 'blur(2px)';
          });

          const searchVal = document.getElementById('search-input').value;
          const statusVal = document.getElementById('status-filter').value;
          const sortVal = document.getElementById('sort-select').value;

          const queryParams = new URLSearchParams({
            search: searchVal,
            status: statusVal,
            sort: sortVal
          });

          try {
            const res = await fetch('/api/applications?' + queryParams.toString(), {
              headers: { 'Authorization': 'Bearer ' + token }
            });

            if (searchBar) {
              searchBar.classList.remove('searching');
            }

            if (!res.ok) {
              if (res.status === 401 || res.status === 403) {
                logout();
                return;
              }
              throw new Error('Failed to fetch');
            }

            const data = await res.json();
            
            // Pulse animation transitions when statuses change
            if (silent && activeApplications.length > 0) {
              const statusMap = {};
              data.forEach(app => { statusMap[app.id] = app.status; });
              
              activeApplications.forEach(oldApp => {
                const newStatus = statusMap[oldApp.id];
                if (newStatus && newStatus !== oldApp.status) {
                  const wrapper = document.getElementById('pill-wrapper-' + oldApp.id);
                  if (wrapper) {
                    wrapper.style.transform = 'translateY(-2px) scale(1.05)';
                    wrapper.style.opacity = '0.3';
                    setTimeout(() => {
                      wrapper.innerHTML = getStatusMarkup(newStatus);
                      wrapper.style.transform = 'translateY(0) scale(1)';
                      wrapper.style.opacity = '1';
                    }, 200);
                  }
                }
              });
            }

            activeApplications = data;
            populateDynamicFilterDropdowns();
            renderQuickChips();
            renderApplicationsList();
            updateStatisticsSummary();

            if (currentOpenAppId) {
              const currentApp = activeApplications.find(a => a.id === currentOpenAppId);
              if (currentApp) {
                updateModalContent(currentApp);
              }
            }

          } catch (err) {
            if (searchBar) {
              searchBar.classList.remove('searching');
            }
            console.error('Error fetching applications:', err);
            if (!silent) {
              document.getElementById('applications-container').innerHTML = '';
              document.getElementById('error-state').style.display = 'flex';
            }
          }
        }

        function handleSearchKeyDown(event) {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.target.blur();
            fetchApplications();
          }
        }

        function animateCardsEmergence() {
          const cards = document.querySelectorAll('.app-row');
          cards.forEach((card, index) => {
            card.classList.remove('emerged');
            card.classList.remove('settled');
            void card.offsetWidth;
            setTimeout(() => {
              card.classList.add('emerged');
              setTimeout(() => {
                card.classList.remove('emerged');
                card.classList.add('settled');
              }, 550);
            }, index * 70);
          });
        }

        function handleLogoError(img, companyName) {
          const fallback = document.createElement('div');
          fallback.className = 'company-logo-fallback';
          fallback.textContent = (companyName || '?').charAt(0).toUpperCase();
          img.parentNode.replaceChild(fallback, img);
        }

        function formatLastUpdated(dateStr) {
          if (!dateStr) return 'Recently';
          const date = new Date(dateStr);
          const now = new Date();
          const diffMs = now - date;
          
          if (diffMs < 0) return 'Just now';
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) return 'Just now';
          if (diffMins < 60) return diffMins + ' min ago';
          
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) return diffHours + (diffHours === 1 ? ' hr ago' : ' hrs ago');
          
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays === 1) return 'Yesterday';
          if (diffDays < 7) return diffDays + ' days ago';

          return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        }

        function renderApplicationsList() {
          const container = document.getElementById('applications-container');
          container.innerHTML = '';

          if (activeApplications.length === 0) {
            document.getElementById('empty-state').style.display = 'flex';
            return;
          }

          document.getElementById('empty-state').style.display = 'none';

          activeApplications.forEach((app, idx) => {
            const logoArea = app.company_logo 
              ? \`<img class="app-row-logo" src="\${app.company_logo}" alt="\${app.company} logo" onerror="handleLogoError(this, '\${app.company}')" loading="lazy">\`
              : \`<div class="company-logo-fallback">\${app.company.charAt(0).toUpperCase()}</div>\`;

            // Platform badges with strict external URLs click redirects
            let platformLabel = app.platform || 'Direct';
            let platformHref = app.platform_url || app.job_url || app.application_url;
            const platformBadge = platformHref 
              ? \`<a href="\${platformHref}" target="_blank" rel="noopener noreferrer" class="platform-badge" onclick="event.stopPropagation()">
                  \${getPlatformIcon(platformLabel)}
                  <span>\${platformLabel}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="9" height="9" style="color:#71717a; margin-left: 2px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                 </a>\`
              : \`<span class="platform-badge" style="cursor: default;">
                  \${getPlatformIcon(platformLabel)}
                  <span>\${platformLabel}</span>
                 </span>\`;

            const locationBadge = app.location 
              ? \`<span class="app-row-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>\${app.location}</span>\`
              : '';

            // Work Type Badge
            const typeBadge = app.employment_type 
              ? \`<span class="app-row-meta-item type-badge">\${app.employment_type}</span>\`
              : '';

            // Work Mode Badge
            let workModeClass = 'mode-onsite';
            if (app.work_mode) {
              const m = app.work_mode.toLowerCase().trim();
              if (m.includes('remote')) workModeClass = 'mode-remote';
              else if (m.includes('hybrid')) workModeClass = 'mode-hybrid';
            }
            const modeBadge = app.work_mode 
              ? \`<span class="app-row-meta-item \${workModeClass}">\${app.work_mode}</span>\`
              : '';

            const docBadge = app.documents && app.documents.length > 0
              ? \`<span class="document-badge" style="cursor: pointer;" onclick="event.stopPropagation(); openAppDetails(\${app.id});"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\${app.documents.length} document\${app.documents.length === 1 ? '' : 's'}</span>\`
              : '';

            const dateAppliedFormatted = app.date_applied ? new Date(app.date_applied).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'Recently';

            const lastUpdatedText = formatLastUpdated(app.status_last_changed || app.created_at);
            const staggerDelay = idx * 40;

            container.innerHTML += \`
              <div class="app-row" onclick="openAppDetails(\${app.id})" style="animation: status-fade 250ms ease \${staggerDelay}ms both;">
                <div class="app-row-logo-container">
                  \${logoArea}
                </div>
                
                <div class="app-row-details">
                  <div class="app-row-header-line">
                    <h3 class="app-row-title">\${app.role}</h3>
                  </div>
                  <div class="app-row-company-line">
                    <span class="app-row-company">\${app.company}</span>
                    <span style="color:#d4d4d8;">&bull;</span>
                    \${platformBadge}
                  </div>
                  <div class="app-row-meta">
                    \${locationBadge}
                    \${typeBadge}
                    \${modeBadge}
                    \${docBadge}
                  </div>
                </div>
                
                <!-- Aside split top-right status, bottom updates -->
                <div class="app-row-right-aside">
                  <div class="app-row-status-wrapper" id="pill-wrapper-\${app.id}">
                    <span id="pill-\${app.id}" class="status-pill \${getStatusClass(app.status)}">
                      \${statusConfig[(app.status || '').toLowerCase().trim()]?.icon || ''}\${app.status}
                    </span>
                  </div>
                  <div class="app-row-dates">
                    <div>Applied \${dateAppliedFormatted}</div>
                    <div style="font-size:11px; margin-top:2px;">Last activity \${lastUpdatedText}</div>
                  </div>
                </div>

                <!-- Card dropdown menu actions -->
                <div class="card-menu-container" onclick="event.stopPropagation()">
                  <button class="card-menu-btn" onclick="toggleCardDropdown(event, \${app.id})" aria-label="Menu list">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                  <div class="dropdown-menu" id="dropdown-\${app.id}">
                    <button class="dropdown-item" onclick="openAppDetails(\${app.id}); hideAllDropdowns();">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Open Details
                    </button>
                    <button class="dropdown-item" onclick="openTimelineTab(\${app.id}); hideAllDropdowns();">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      View Timeline
                    </button>
                    \${platformHref ? \`
                      <a class="dropdown-item" href="\${platformHref}" target="_blank" rel="noopener noreferrer" onclick="hideAllDropdowns();" style="text-decoration:none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                        Open Original Job
                      </a>
                    \` : ''}
                    \${app.company_url ? \`
                      <a class="dropdown-item" href="\${app.company_url}" target="_blank" rel="noopener noreferrer" onclick="hideAllDropdowns();" style="text-decoration:none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Open Company Website
                      </a>
                    \` : ''}
                    <button class="dropdown-item" onclick="copyToClipboard('\${platformHref || ''}', event); hideAllDropdowns();">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copy Job Link
                    </button>
                    <button class="dropdown-item delete" onclick="deleteApplication(\${app.id}); hideAllDropdowns();">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            \`;
          });
          animateCardsEmergence();
        }

        function toggleCardDropdown(e, appId) {
          e.stopPropagation();
          const dropdown = document.getElementById('dropdown-' + appId);
          const button = e.currentTarget;
          const wasOpen = dropdown.classList.contains('show');
          
          hideAllDropdowns();
          
          if (!wasOpen) {
            dropdown.style.display = 'flex';
            button.classList.add('active');
            setTimeout(() => {
              dropdown.classList.add('show');
            }, 10);
          }
        }

        function hideAllDropdowns() {
          document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
            menu.style.display = 'none';
          });
          document.querySelectorAll('.card-menu-btn').forEach(btn => {
            btn.classList.remove('active');
          });
        }

        document.addEventListener('click', hideAllDropdowns);

        function copyToClipboard(text, event) {
          if (!text) return;
          navigator.clipboard.writeText(text);
          const badge = event.target.closest('.dropdown-item');
          if (badge) {
            const orig = badge.innerHTML;
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            setTimeout(() => {
              badge.innerHTML = orig;
            }, 1000);
          }
        }

        async function deleteApplication(appId) {
          if (!confirm('Are you sure you want to permanently delete this application?')) return;
          try {
            const res = await fetch('/api/applications/' + appId, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) throw new Error('Delete failed');
            fetchApplications();
          } catch(e) {
            console.error(e);
            alert('Failed to delete application.');
          }
        }

        function updateStatisticsSummary() {
          let total = activeApplications.length;
          let applied = 0;
          let inReview = 0;
          let interview = 0;
          let offers = 0;

          activeApplications.forEach(app => {
            const s = (app.status || '').toLowerCase().trim();
            if (['applied', 'submitted'].includes(s)) applied++;
            else if (['under review', 'shortlisted', 'assessment'].includes(s)) inReview++;
            else if (s === 'interview') interview++;
            else if (['offer', 'hired'].includes(s)) offers++;
          });

          animateNumber('stat-total', total);
          animateNumber('stat-applied', applied);
          animateNumber('stat-review', inReview);
          animateNumber('stat-interview', interview);
          animateNumber('stat-offers', offers);
        }

        function handleSearchInput(e) {
          clearTimeout(searchDebounceTimeout);
          searchDebounceTimeout = setTimeout(() => {
            fetchApplications();
          }, 250);
        }

        function expandSearchBar(event) {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }

        function toggleSearchCollapse(event) {
          event.stopPropagation();
          const input = document.getElementById('search-input');
          if (input) {
            input.value = '';
            fetchApplications();
          }
        }

        function handleFilterChange() {
          fetchApplications();
        }

        function handleSortChange() {
          fetchApplications();
        }

        function openAppDetails(appId) {
          currentOpenAppId = appId;
          const app = activeApplications.find(a => a.id === appId);
          if (!app) return;

          updateModalContent(app);

          const modal = document.getElementById('app-modal');
          modal.style.display = 'flex';
          setTimeout(() => {
            modal.classList.add('active');
          }, 10);
        }

        function openTimelineTab(appId) {
          openAppDetails(appId);
          setTimeout(() => {
            const el = document.getElementById('modal-timeline');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }

        function updateModalContent(app) {
          document.getElementById('modal-title').textContent = app.role;
          document.getElementById('modal-company').textContent = app.company;
          
          const badgeArea = document.getElementById('modal-status-badge-area');
          badgeArea.innerHTML = getStatusMarkup(app.status);

          // Setup Logo Fallback
          const logoContainer = document.getElementById('modal-logo-area');
          if (app.company_logo) {
            logoContainer.innerHTML = \`<img class="modal-logo" src="\${app.company_logo}" alt="\${app.company} logo" onerror="handleLogoError(this, '\${app.company}')">\`;
          } else {
            logoContainer.innerHTML = \`<div class="modal-logo-fallback">\${app.company.charAt(0).toUpperCase()}</div>\`;
          }

          // Platform link
          const platformContainer = document.getElementById('modal-platform-badge-area');
          let platformLabel = app.platform || 'Direct';
          let platformHref = app.platform_url || app.job_url || app.application_url;
          if (platformHref) {
            platformContainer.innerHTML = \`
              <a href="\${platformHref}" target="_blank" rel="noopener noreferrer" class="platform-badge" style="font-size:11px;">
                via \&bull; \${platformLabel} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" style="margin-left: 2px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </a>
            \`;
          } else {
            platformContainer.innerHTML = \`<span class="platform-badge" style="font-size:11px;">via \${platformLabel}</span>\`;
          }

          // Applied dates
          document.getElementById('modal-applied').textContent = app.date_applied ? new Date(app.date_applied).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }) : 'Not specified';

          const lastCheckedFormatted = app.status_last_checked ? new Date(app.status_last_checked).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
          }) + ' ' + new Date(app.status_last_checked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Recently';
          document.getElementById('modal-last-checked').textContent = lastCheckedFormatted;

          // Standard info grids
          document.getElementById('modal-location').textContent = app.location || 'Not specified';
          document.getElementById('modal-type').textContent = app.employment_type || 'Not specified';
          document.getElementById('modal-work-mode').textContent = app.work_mode || 'Not specified';
          document.getElementById('modal-salary').textContent = app.salary || 'Not specified';
          document.getElementById('modal-experience').textContent = app.experience || 'Not specified';
          document.getElementById('modal-skills').textContent = app.skills || 'Not specified';

          // Description container
          const descBlock = document.getElementById('modal-desc-container');
          if (app.description) {
            descBlock.style.display = 'block';
            document.getElementById('modal-description').textContent = app.description;
          } else {
            descBlock.style.display = 'none';
          }

          // Timeline populating
          const timelineContainer = document.getElementById('modal-timeline');
          timelineContainer.innerHTML = '';

          if (app.status_history && app.status_history.length > 0) {
            app.status_history.forEach(hist => {
              const dt = new Date(hist.detected_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
              }) + ' &bull; ' + new Date(hist.detected_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });

              let stateText = hist.new_status;
              if (!hist.previous_status) {
                stateText = 'Application logged';
              } else {
                stateText = 'Moved to ' + hist.new_status;
              }

              timelineContainer.innerHTML += \`
                <div class="timeline-item completed">
                  <div class="timeline-item-title">State: \${stateText}</div>
                  <div class="timeline-item-date">\${dt} via \${hist.source || 'System'}</div>
                </div>
              \`;
            });
          } else {
            const appliedDateText = app.date_applied ? new Date(app.date_applied).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recently';
            timelineContainer.innerHTML = \`
              <div class="timeline-item completed">
                <div class="timeline-item-title">Application logged</div>
                <div class="timeline-item-date">\${appliedDateText}</div>
              </div>
            \`;
          }

          // Associated documents section
          const docsContainer = document.getElementById('modal-documents');
          docsContainer.innerHTML = '';

          if (app.documents && app.documents.length > 0) {
            app.documents.forEach(doc => {
              let docIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
              if (doc.type === 'cover_letter') {
                docIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
              }
              docsContainer.innerHTML += \`
                <a href="/profile/\${userIdFromUrl}/documents?id=\${doc.id}" target="_blank" class="assoc-doc-item">
                  \${docIcon}
                  <span>\${doc.title}</span>
                </a>
              \`;
            });
          } else {
            docsContainer.innerHTML = \`<div style="font-size:13px; color:var(--text-muted);">No documents associated with this application.</div>\`;
          }
        }

        function closeModal(e) {
          if (e && e.target !== document.getElementById('app-modal')) return;
          currentOpenAppId = null;
          const modal = document.getElementById('app-modal');
          modal.classList.remove('active');
          setTimeout(() => {
            modal.style.display = 'none';
          }, 250);
        }

        // Sidebar Transitions
        function handleLogoClick() {
          const sidebar = document.getElementById('sidebar-nav');
          if (sidebar.classList.contains('collapsed')) {
            handleLogoExpandClick();
          }
        }

        function handleLogoKeyDown(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLogoClick();
          }
        }

        function handleLogoExpandClick() {
          if (isSidebarTransitioning) return;
          
          const sidebar = document.getElementById('sidebar-nav');
          const logoSvg = document.querySelector('#logo-control .logo-svg');
          const logoControl = document.getElementById('logo-control');
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          isSidebarTransitioning = true;
          
          if (prefersReducedMotion) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('collapsed-text');
            sidebar.classList.remove('collapsed-menu');
            localStorage.setItem('hirenext_sidebar_collapsed', 'false');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
            isSidebarTransitioning = false;
            return;
          }
          
          if (logoControl) {
            logoControl.classList.add('logo-pressing');
            setTimeout(() => {
              logoControl.classList.remove('logo-pressing');
            }, 100);
          }
          
          setTimeout(() => {
            if (logoSvg) {
              logoSvg.classList.add('logo-interacting');
            }
          }, 80);
          
          setTimeout(() => {
            sidebar.classList.remove('collapsed');
            localStorage.setItem('hirenext_sidebar_collapsed', 'false');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
          }, 280);
          
          setTimeout(() => {
            sidebar.classList.remove('collapsed-text');
          }, 400);
          
          setTimeout(() => {
            sidebar.classList.remove('collapsed-menu');
          }, 470);
          
          setTimeout(() => {
            if (logoSvg) {
              logoSvg.classList.remove('logo-interacting');
            }
            isSidebarTransitioning = false;
          }, 720);
        }

        function handleSidebarCollapseClick() {
          if (isSidebarTransitioning) return;
          
          const sidebar = document.getElementById('sidebar-nav');
          const logoControl = document.getElementById('logo-control');
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          isSidebarTransitioning = true;
          
          if (prefersReducedMotion) {
            sidebar.classList.add('collapsed-text');
            sidebar.classList.add('collapsed-menu');
            sidebar.classList.add('collapsed');
            localStorage.setItem('hirenext_sidebar_collapsed', 'true');
            if (logoControl) {
              logoControl.setAttribute('data-tooltip', 'Open sidebar');
              logoControl.setAttribute('aria-label', 'Open sidebar');
            }
            isSidebarTransitioning = false;
            return;
          }
          
          sidebar.classList.add('collapsed-text');
          sidebar.classList.add('collapsed-menu');
          sidebar.classList.add('collapsed');
          localStorage.setItem('hirenext_sidebar_collapsed', 'true');
          if (logoControl) {
            logoControl.setAttribute('data-tooltip', 'Open sidebar');
            logoControl.setAttribute('aria-label', 'Open sidebar');
          }
          
          setTimeout(() => {
            isSidebarTransitioning = false;
          }, 340);
        }

        function toggleMobileSidebar() {
          const sidebar = document.getElementById('sidebar-nav');
          sidebar.classList.toggle('mobile-open');
        }

        function logout() {
          localStorage.removeItem('token');
          token = null;
          window.location.replace('/');
        }

        // Close Confirm/Escape listeners
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            closeModal(null);
          }
        });

        async function initPage() {
          const isCollapsed = localStorage.getItem('hirenext_sidebar_collapsed') === 'true';
          const sidebar = document.getElementById('sidebar-nav');
          const logoControl = document.getElementById('logo-control');
          
          if (logoControl) {
            logoControl.removeEventListener('keydown', handleLogoKeyDown);
            logoControl.addEventListener('keydown', handleLogoKeyDown);
          }

          if (isCollapsed) {
            sidebar.classList.add('collapsed');
            sidebar.classList.add('collapsed-text');
            sidebar.classList.add('collapsed-menu');
            if (logoControl) {
              logoControl.setAttribute('data-tooltip', 'Open sidebar');
              logoControl.setAttribute('aria-label', 'Open sidebar');
            }
          } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('collapsed-text');
            sidebar.classList.remove('collapsed-menu');
            if (logoControl) {
              logoControl.removeAttribute('data-tooltip');
              logoControl.setAttribute('aria-label', 'Collapse sidebar');
            }
          }

          // Setup animated search input listeners
          const sInput = document.getElementById('search-input');
          const sContainer = document.getElementById('search-bar-container');
          if (sInput && sContainer) {
            sInput.addEventListener('blur', () => {
              sContainer.classList.remove('focused');
            });
            sInput.addEventListener('focus', () => {
              sContainer.classList.add('focused');
            });
          }

          // Global keyboard shortcuts (Escape and Ctrl/Cmd+K)
          document.addEventListener('keydown', (e) => {
            const input = document.getElementById('search-input');
            const container = document.getElementById('search-bar-container');
            
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              if (input) {
                setTimeout(() => input.focus(), 50);
              }
            }

            if (e.key === 'Escape' && document.activeElement === input) {
              e.preventDefault();
              if (input) {
                input.value = '';
                input.blur();
              }
              fetchApplications();
            }
          });

          if (!token) {
            window.location.replace('/');
            return;
          }

          try {
            const profileRes = await fetch('/api/profile', {
              headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!profileRes.ok) {
              logout();
              return;
            }

            const profile = await profileRes.json();
            if (profile.user_id !== parseInt(userIdFromUrl) && userIdFromUrl !== 'me') {
              logout();
              return;
            }

            if (userIdFromUrl === 'me') {
              window.location.replace('/profile/' + profile.user_id + '/applications');
              return;
            }

            document.getElementById('dashboard-layout').style.display = 'flex';
            
            // Initial fetch
            fetchApplications();

            // Controlled Polling setup: update without hard reloads every 15 seconds
            pollingInterval = setInterval(() => {
              fetchApplications(true);
            }, 15000);

          } catch (err) {
            console.error('Error initializing page:', err);
            logout();
          }
        }

        // Custom Dropdowns Implementation
        let activeOpenDropdown = null;

        function toggleCustomDropdown(id) {
          const menu = document.getElementById('menu-' + id);
          const trigger = document.getElementById('dropdown-' + id);
          if (!menu) return;

          const isShow = menu.classList.contains('show');
          
          closeAllCustomDropdowns();

          if (!isShow) {
            menu.style.display = 'block';
            trigger.classList.add('open');
            void menu.offsetWidth;
            menu.classList.remove('hiding');
            menu.classList.add('show');
            const container = document.getElementById('trigger-' + id);
            if (container) container.setAttribute('aria-expanded', 'true');
            activeOpenDropdown = id;
          }
        }

        function closeAllCustomDropdowns() {
          const menus = document.querySelectorAll('.custom-dropdown-menu.show');
          menus.forEach(menu => {
            const id = menu.id.replace('menu-', '');
            const trigger = document.getElementById('dropdown-' + id);
            const container = document.getElementById('trigger-' + id);
            if (trigger) trigger.classList.remove('open');
            if (container) container.setAttribute('aria-expanded', 'false');
            
            menu.classList.remove('show');
            menu.classList.add('hiding');
            setTimeout(() => {
              if (menu.classList.contains('hiding')) {
                menu.style.display = 'none';
                menu.classList.remove('hiding');
              }
            }, 160);
          });
          activeOpenDropdown = null;
        }

        document.addEventListener('click', (e) => {
          if (!e.target.closest('.custom-dropdown')) {
            closeAllCustomDropdowns();
          }
        });

        const statusOptions = [
          { value: 'All', label: 'All Statuses' },
          { value: 'Applied', label: 'Applied' },
          { value: 'Under Review', label: 'Under Review' },
          { value: 'Assessment', label: 'Assessment' },
          { value: 'Interview', label: 'Interview' },
          { value: 'Offer', label: 'Offer' },
          { value: 'Hired', label: 'Hired' },
          { value: 'Rejected', label: 'Rejected' },
          { value: 'Withdrawn', label: 'Withdrawn' }
        ];

        const sortOptions = [
          { value: 'Recently Updated', label: '↕ Recently Updated' },
          { value: 'Newest', label: '↕ Newest Applied' },
          { value: 'Oldest', label: '↕ Oldest Applied' },
          { value: 'Status', label: '↕ Status' },
          { value: 'Company', label: '↕ Company' }
        ];

        function initStatusDropdown() {
          const menu = document.getElementById('menu-status');
          if (!menu) return;
          menu.innerHTML = '';
          
          const hiddenInput = document.getElementById('status-filter');
          const currentValue = hiddenInput ? hiddenInput.value : 'All';

          statusOptions.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (opt.value === currentValue ? ' selected' : '');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', opt.value === currentValue ? 'true' : 'false');
            item.tabIndex = -1;
            item.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>' + opt.label + '</span>';
            item.onclick = () => {
              selectStatusOption(opt.value, opt.label);
            };
            menu.appendChild(item);
          });
        }

        function selectStatusOption(value, label) {
          const hiddenInput = document.getElementById('status-filter');
          if (hiddenInput) {
            hiddenInput.value = value;
          }
          const labelSpan = document.getElementById('label-status');
          if (labelSpan) {
            labelSpan.textContent = label;
          }
          closeAllCustomDropdowns();
          initStatusDropdown();
          renderQuickChips();
          
          if (typeof handleFilterChange === 'function') {
            handleFilterChange();
          }
        }

        function initSortDropdown() {
          const menu = document.getElementById('menu-sort');
          if (!menu) return;
          menu.innerHTML = '';
          
          const hiddenInput = document.getElementById('sort-select');
          const currentValue = hiddenInput ? hiddenInput.value : 'Recently Updated';

          sortOptions.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (opt.value === currentValue ? ' selected' : '');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', opt.value === currentValue ? 'true' : 'false');
            item.tabIndex = -1;
            item.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>' + opt.label + '</span>';
            item.onclick = () => {
              selectSortOption(opt.value, opt.label);
            };
            menu.appendChild(item);
          });
        }

        function selectSortOption(value, label) {
          const hiddenInput = document.getElementById('sort-select');
          if (hiddenInput) {
            hiddenInput.value = value;
          }
          const labelSpan = document.getElementById('label-sort');
          if (labelSpan) {
            labelSpan.textContent = label;
          }
          closeAllCustomDropdowns();
          initSortDropdown();
          
          if (typeof handleSortChange === 'function') {
            handleSortChange();
          }
        }

        function handleDropdownKeydown(e, id) {
          const menu = document.getElementById('menu-' + id);
          if (!menu) return;

          const isExpanded = menu.classList.contains('show');

          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (!isExpanded) {
              toggleCustomDropdown(id);
            } else {
              const activeEl = document.activeElement;
              if (activeEl && activeEl.classList.contains('custom-dropdown-item')) {
                activeEl.click();
              }
            }
            return;
          }

          if (e.key === 'Escape') {
            if (isExpanded) {
              e.preventDefault();
              closeAllCustomDropdowns();
              document.getElementById('trigger-' + id).focus();
            }
            return;
          }

          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isExpanded) {
              toggleCustomDropdown(id);
              setTimeout(() => focusFirstOption(id), 50);
            } else {
              navigateOptions(id, e.key === 'ArrowDown' ? 1 : -1);
            }
            return;
          }

          if (e.key === 'Tab') {
            if (isExpanded) {
              closeAllCustomDropdowns();
            }
          }
        }

        function focusFirstOption(id) {
          const menu = document.getElementById('menu-' + id);
          const first = menu.querySelector('.custom-dropdown-item');
          if (first) {
            first.tabIndex = 0;
            first.focus();
          }
        }

        function navigateOptions(id, direction) {
          const menu = document.getElementById('menu-' + id);
          const items = Array.from(menu.querySelectorAll('.custom-dropdown-item'));
          const activeEl = document.activeElement;
          const currentIndex = items.indexOf(activeEl);

          let nextIndex = currentIndex + direction;
          if (nextIndex < 0) nextIndex = items.length - 1;
          if (nextIndex >= items.length) nextIndex = 0;

          const target = items[nextIndex];
          if (target) {
            items.forEach(i => i.tabIndex = -1);
            target.tabIndex = 0;
            target.focus();
          }
        }

        // Platform & Work Type Filters
        let selectedPlatform = 'All';
        let selectedWorkType = 'All';

        function populateDynamicFilterDropdowns() {
          const uniquePlatforms = [...new Set(activeApplications.map(a => a.platform).filter(Boolean))].sort();
          const uniqueWorkTypes = [...new Set(activeApplications.map(a => a.employment_type).filter(Boolean))].sort();

          const platformContainer = document.getElementById('dropdown-platform');
          const workTypeContainer = document.getElementById('dropdown-worktype');

          if (uniquePlatforms.length > 0) {
            platformContainer.style.display = 'inline-block';
            buildPlatformDropdownMenu(uniquePlatforms);
          } else {
            platformContainer.style.display = 'none';
          }

          if (uniqueWorkTypes.length > 0) {
            workTypeContainer.style.display = 'inline-block';
            buildWorkTypeDropdownMenu(uniqueWorkTypes);
          } else {
            workTypeContainer.style.display = 'none';
          }
        }

        function buildPlatformDropdownMenu(platforms) {
          const menu = document.getElementById('menu-platform');
          if (!menu) return;
          menu.innerHTML = '';

          const allItem = document.createElement('div');
          allItem.className = 'custom-dropdown-item' + (selectedPlatform === 'All' ? ' selected' : '');
          allItem.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>All Platforms</span>';
          allItem.onclick = () => selectPlatformOption('All');
          menu.appendChild(allItem);

          platforms.forEach(p => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (selectedPlatform === p ? ' selected' : '');
            item.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>' + p + '</span>';
            item.onclick = () => selectPlatformOption(p);
            menu.appendChild(item);
          });
        }

        function selectPlatformOption(val) {
          selectedPlatform = val;
          document.getElementById('label-platform').textContent = val === 'All' ? 'Platform' : val;
          closeAllCustomDropdowns();
          buildPlatformDropdownMenu([...new Set(activeApplications.map(a => a.platform).filter(Boolean))].sort());
          renderApplicationsList();
        }

        function buildWorkTypeDropdownMenu(types) {
          const menu = document.getElementById('menu-worktype');
          if (!menu) return;
          menu.innerHTML = '';

          const allItem = document.createElement('div');
          allItem.className = 'custom-dropdown-item' + (selectedWorkType === 'All' ? ' selected' : '');
          allItem.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>All Work Types</span>';
          allItem.onclick = () => selectWorkTypeOption('All');
          menu.appendChild(allItem);

          types.forEach(t => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (selectedWorkType === t ? ' selected' : '');
            item.innerHTML = '<span class="custom-dropdown-item-checkmark">✓</span><span>' + t + '</span>';
            item.onclick = () => selectWorkTypeOption(t);
            menu.appendChild(item);
          });
        }

        function selectWorkTypeOption(val) {
          selectedWorkType = val;
          document.getElementById('label-worktype').textContent = val === 'All' ? 'Work Type' : val;
          closeAllCustomDropdowns();
          buildWorkTypeDropdownMenu([...new Set(activeApplications.map(a => a.employment_type).filter(Boolean))].sort());
          renderApplicationsList();
        }

        // Quick Filter Chips Renderer
        const quickChipStatuses = ['All', 'Applied', 'Under Review', 'Interview', 'Offer', 'Rejected'];

        function renderQuickChips() {
          const chipsContainer = document.getElementById('status-quick-chips');
          if (!chipsContainer) return;
          chipsContainer.innerHTML = '';

          const currentStatus = document.getElementById('status-filter').value || 'All';

          quickChipStatuses.forEach(status => {
            const chip = document.createElement('button');
            chip.className = 'quick-chip' + (currentStatus === status ? ' active' : '');
            chip.textContent = status;
            chip.onclick = () => {
              selectStatusOption(status, status === 'All' ? 'All Statuses' : status);
            };
            chipsContainer.appendChild(chip);
          });
        }

        window.addEventListener('beforeunload', () => {
          if (pollingInterval) clearInterval(pollingInterval);
        });

        // Initialize custom dropdowns onload
        initStatusDropdown();
        initSortDropdown();

        // Initialize Page onload
        initPage();
      </script>
    </body>
    </html>
  `);
});

// Fallback root pages to show friendly instructions and details
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HirenextAI Career Assistant</title>
      <style>
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #12141c;
          color: #f5f6fa;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .card {
          background: #1a1d29;
          border: 1px solid #23273a;
          border-radius: 12px;
          padding: 32px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          text-align: center;
        }
        h2 {
          margin-top: 0;
          background: linear-gradient(135deg, #8f85f3 0%, #6c5ce7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 24px;
        }
        p {
          color: #a0a5c0;
          font-size: 14px;
          line-height: 1.6;
        }
        .instruction-box {
          background: #12141c;
          border: 1px solid #23273a;
          border-radius: 8px;
          padding: 16px;
          margin-top: 24px;
          text-align: left;
        }
        ol {
          margin: 8px 0 0 0;
          padding-left: 20px;
          color: #f5f6fa;
          font-size: 13px;
        }
        li {
          margin-bottom: 8px;
        }
        .footer-note {
          margin-top: 24px;
          font-size: 12px;
          color: #6c5ce7;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>HirenextAI Career Assistant</h2>
        <p>Your production-ready backend is running successfully on port 5000.</p>
        
        <div class="instruction-box">
          <strong style="font-size:13.5px; color:#8f85f3;">How to log in:</strong>
          <ol>
            <li>Click the <strong>HirenextAI extension icon</strong> in your browser toolbar to open the login popup.</li>
            <li>Use your credentials to sign in (default email: <code>owner@hirenext.ai</code>, password: <code>admin</code>).</li>
            <li>Navigate to LinkedIn Easy Apply or Naukri to start autofilling forms.</li>
          </ol>
        </div>
        
        <div class="footer-note">Ready to track and accelerate your applications!</div>
      </div>
    </body>
    </html>
  `);
});

app.get('/dashboard/documents', (req, res) => {
  res.redirect('/profile/me/documents' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

app.get('/login', (req, res) => {
  res.redirect('/');
});

// Start DB & Web Server
db.initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`HirenextAI Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });
