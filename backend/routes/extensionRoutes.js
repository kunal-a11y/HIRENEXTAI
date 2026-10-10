const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { generateContent } = require('../services/geminiService');

// =============================================
// EXTENSION VERIFICATION
// =============================================

/**
 * POST /api/extension/verify
 * Verify extension installation and get feature config
 */
router.post('/verify', auth, async (req, res) => {
  try {
    const { version, browser } = req.body;
    const userId = req.user.id;

    // Update user's extension info
    await pool.query(
      'UPDATE users SET device = ?, lastActiveAt = NOW() WHERE id = ?',
      [`extension-${browser || 'chrome'}-${version || '1.0.0'}`, userId]
    ).catch(() => {});

    // Get user plan for feature gating
    const [userRows] = await pool.query(
      'SELECT plan, firstName, lastName, email, phone, linkedinUrl, githubUrl FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];
    const plan = user.plan || 'free';

    // Get credit usage
    const today = new Date().toISOString().split('T')[0];
    const [aiUsage] = await pool.query(
      'SELECT COUNT(*) as count FROM ai_usage WHERE userId = ? AND DATE(createdAt) = ?',
      [userId, today]
    );

    res.json({
      success: true,
      valid: true,
      latestVersion: '1.0.0',
      updateRequired: false,
      user: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        plan,
        phone: user.phone,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl
      },
      features: {
        aiApply: plan !== 'free',
        resumeBuilder: true,
        coverLetter: true,
        jobAnalysis: true,
        applicationTracker: true,
        recruiterMessage: plan !== 'free',
        bulkApply: plan === 'max' || plan === 'ultimate'
      },
      usage: {
        aiRequestsToday: aiUsage[0]?.count || 0
      }
    });
  } catch (err) {
    console.error('[Extension] Verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// =============================================
// JOB ANALYSIS
// =============================================

/**
 * POST /api/extension/analyze-job
 * Analyze a scraped job listing against user's profile
 */
router.post('/analyze-job', auth, async (req, res) => {
  try {
    const { title, company, location, description, salary, experience, remoteStatus, skills } = req.body;
    const userId = req.user.id;

    if (!title && !description) {
      return res.status(400).json({ error: 'Job title or description is required' });
    }

    // Get user profile for matching
    const [userRows] = await pool.query(
      'SELECT firstName, lastName, email, phone, linkedinUrl, githubUrl FROM users WHERE id = ?',
      [userId]
    );

    // Get user's latest resume
    const [resumeRows] = await pool.query(
      'SELECT content FROM files WHERE userId = ? AND type = "resume" ORDER BY createdAt DESC LIMIT 1',
      [userId]
    );

    const userProfile = userRows[0] || {};
    const resumeText = resumeRows[0]?.content || '';

    const prompt = `You are an expert Career AI Analyst for HirenextAI.

Analyze this job listing against the candidate's profile and resume.

[JOB LISTING]
Title: ${title || 'Not specified'}
Company: ${company || 'Not specified'}
Location: ${location || 'Not specified'}
Salary: ${salary || 'Not specified'}
Experience Required: ${experience || 'Not specified'}
Remote Status: ${remoteStatus || 'Not specified'}
Description: ${(description || '').substring(0, 3000)}

[CANDIDATE PROFILE]
Name: ${userProfile.firstName || ''} ${userProfile.lastName || ''}
Email: ${userProfile.email || ''}
LinkedIn: ${userProfile.linkedinUrl || 'Not provided'}
GitHub: ${userProfile.githubUrl || 'Not provided'}

[CANDIDATE RESUME]
${resumeText ? resumeText.substring(0, 3000) : 'No resume uploaded yet'}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "overallMatch": 85,
  "breakdown": {
    "resumeMatch": 80,
    "skillsMatch": 90,
    "experienceMatch": 75,
    "locationMatch": 95,
    "educationMatch": 85,
    "salaryMatch": 70
  },
  "verdict": "Excellent Match",
  "missingSkills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"],
  "resumeChanges": ["Add X to skills section", "Highlight Y experience"],
  "recommendedKeywords": ["keyword1", "keyword2"],
  "salaryInsight": "Market rate for this role is $X-$Y",
  "companyTip": "Brief tip about the company culture or interview process"
}`;

    const aiResponse = await generateContent(prompt, userId);

    // Log AI usage
    await pool.query('INSERT INTO ai_usage (userId, type, createdAt) VALUES (?, ?, NOW())', [userId, 'job_analysis']).catch(() => {});

    // Parse AI response
    let analysis;
    try {
      const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      analysis = {
        overallMatch: 70,
        breakdown: { resumeMatch: 70, skillsMatch: 70, experienceMatch: 70, locationMatch: 70, educationMatch: 70, salaryMatch: 70 },
        verdict: 'Good Match',
        missingSkills: [],
        strengths: ['Relevant experience'],
        weaknesses: [],
        resumeChanges: ['Upload your resume for detailed analysis'],
        recommendedKeywords: [],
        salaryInsight: 'Upload resume for salary insights',
        companyTip: ''
      };
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[Extension] Job analysis error:', err.message);
    res.status(500).json({ error: 'Job analysis failed. Please try again.' });
  }
});

// =============================================
// DOCUMENT GENERATION
// =============================================

/**
 * POST /api/extension/generate-document
 * Generate cover letter, recruiter message, or application answers
 */
router.post('/generate-document', auth, async (req, res) => {
  try {
    const { type, jobTitle, company, jobDescription, userProfile, additionalContext } = req.body;
    const userId = req.user.id;

    if (!type) {
      return res.status(400).json({ error: 'Document type is required (cover_letter, recruiter_message, application_answers)' });
    }

    // Get latest resume
    const [resumeRows] = await pool.query(
      'SELECT content FROM files WHERE userId = ? AND type = "resume" ORDER BY createdAt DESC LIMIT 1',
      [userId]
    );
    const resumeText = resumeRows[0]?.content || '';

    let prompt;
    if (type === 'cover_letter') {
      prompt = `Write a professional, compelling cover letter for:
Job Title: ${jobTitle || 'the position'}
Company: ${company || 'the company'}
Job Description: ${(jobDescription || '').substring(0, 2000)}

Candidate Resume:
${resumeText.substring(0, 2000) || 'Not provided'}

Write a personalized, ATS-optimized cover letter. Keep it concise (3-4 paragraphs). Make it specific to the company and role. Do not include placeholders like [Your Name] — use the resume details.`;
    } else if (type === 'recruiter_message') {
      prompt = `Write a short, professional LinkedIn/email message to a recruiter about:
Job Title: ${jobTitle || 'the position'}
Company: ${company || 'the company'}
Job Description: ${(jobDescription || '').substring(0, 1000)}

Candidate Resume:
${resumeText.substring(0, 1500) || 'Not provided'}

Write a concise (3-5 sentences), professional recruiter outreach message. Be direct, show genuine interest, and mention 1-2 relevant qualifications.`;
    } else if (type === 'application_answers') {
      prompt = `Generate thoughtful, professional answers for common application questions for:
Job Title: ${jobTitle || 'the position'}
Company: ${company || 'the company'}
Job Description: ${(jobDescription || '').substring(0, 2000)}
Additional Context: ${additionalContext || 'None'}

Candidate Resume:
${resumeText.substring(0, 2000) || 'Not provided'}

Return a JSON object with common application answers:
{
  "whyThisRole": "answer",
  "whyThisCompany": "answer",
  "biggestStrength": "answer",
  "relevantExperience": "answer",
  "salaryExpectation": "answer",
  "availability": "answer"
}`;
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const aiResponse = await generateContent(prompt, userId);

    // Log usage
    await pool.query('INSERT INTO ai_usage (userId, type, createdAt) VALUES (?, ?, NOW())', [userId, `doc_${type}`]).catch(() => {});

    // Auto-save document
    await pool.query(
      'INSERT INTO files (userId, type, title, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [userId, type, `${type} - ${company || 'General'} - ${jobTitle || 'Position'}`, aiResponse]
    ).catch(() => {});

    res.json({ success: true, content: aiResponse, type });
  } catch (err) {
    console.error('[Extension] Document generation error:', err.message);
    res.status(500).json({ error: 'Document generation failed' });
  }
});

// =============================================
// DOCUMENTS CRUD
// =============================================

/** GET /api/extension/documents — List user's documents */
router.get('/documents', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, type, title, createdAt FROM files WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, documents: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/** GET /api/extension/documents/:id — Get document content */
router.get('/documents/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM files WHERE id = ? AND userId = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true, document: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

/** POST /api/extension/documents — Save a document */
router.post('/documents', auth, async (req, res) => {
  try {
    const { type, title, content } = req.body;
    const [result] = await pool.query(
      'INSERT INTO files (userId, type, title, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, type || 'document', title || 'Untitled', content || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save document' });
  }
});

/** PUT /api/extension/documents/:id — Update a document */
router.put('/documents/:id', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    await pool.query(
      'UPDATE files SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ? AND userId = ?',
      [title, content, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

/** DELETE /api/extension/documents/:id — Delete a document */
router.delete('/documents/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM files WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// =============================================
// RESUME MANAGEMENT
// =============================================

/** GET /api/extension/resume — Get user's active resume */
router.get('/resume', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, content, createdAt FROM files WHERE userId = ? AND type = "resume" ORDER BY createdAt DESC LIMIT 1',
      [req.user.id]
    );
    res.json({ success: true, resume: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

/** POST /api/extension/resume/upload — Upload/save resume text */
router.post('/resume/upload', auth, async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Resume content is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO files (userId, type, title, content, createdAt) VALUES (?, "resume", ?, ?, NOW())',
      [req.user.id, title || 'My Resume', content]
    );
    res.json({ success: true, id: result.insertId, message: 'Resume saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

/** POST /api/extension/resume/create — AI-generate resume from Q&A */
router.post('/resume/create', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: 'Answers are required to generate a resume' });
    }

    const prompt = `You are an expert resume writer for HirenextAI. Create a professional, ATS-friendly resume based on these answers:

${JSON.stringify(answers, null, 2)}

Generate a complete, well-structured resume in clean text format. Include:
- Contact information header
- Professional summary (2-3 sentences)
- Work experience (with bullet points for achievements)
- Education
- Skills section
- Certifications (if applicable)

Make it ATS-optimized with relevant keywords. Use action verbs and quantified achievements where possible.`;

    const resumeText = await generateContent(prompt, req.user.id);

    // Save to DB
    const [result] = await pool.query(
      'INSERT INTO files (userId, type, title, content, createdAt) VALUES (?, "resume", "AI Generated Resume", ?, NOW())',
      [req.user.id, resumeText]
    );

    await pool.query('INSERT INTO ai_usage (userId, type, createdAt) VALUES (?, ?, NOW())', [req.user.id, 'resume_create']).catch(() => {});

    res.json({ success: true, id: result.insertId, content: resumeText });
  } catch (err) {
    console.error('[Extension] Resume create error:', err.message);
    res.status(500).json({ error: 'Resume generation failed' });
  }
});

/** POST /api/extension/resume/analyze — ATS analysis */
router.post('/resume/analyze', auth, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    let resume = resumeText;
    if (!resume) {
      const [rows] = await pool.query(
        'SELECT content FROM files WHERE userId = ? AND type = "resume" ORDER BY createdAt DESC LIMIT 1',
        [req.user.id]
      );
      resume = rows[0]?.content;
    }

    if (!resume) {
      return res.status(400).json({ error: 'No resume found. Please upload or create one first.' });
    }

    const prompt = `You are an expert ATS Resume Analyzer for HirenextAI.

Analyze this resume${jobDescription ? ' against the provided job description' : ''}.

[RESUME]
${resume.substring(0, 4000)}

${jobDescription ? `[JOB DESCRIPTION]\n${jobDescription.substring(0, 2000)}` : ''}

Return ONLY a valid JSON object:
{
  "atsScore": 78,
  "resumeScore": 82,
  "strengths": ["Strong technical skills", "Good formatting"],
  "weaknesses": ["Missing quantified achievements"],
  "missingSkills": ["skill1", "skill2"],
  "improvements": ["Add metrics to work experience", "Include relevant certifications"],
  "keywordDensity": "Good",
  "formatting": "Well structured",
  "summary": "Brief overall assessment"
}`;

    const aiResponse = await generateContent(prompt, req.user.id);
    await pool.query('INSERT INTO ai_usage (userId, type, createdAt) VALUES (?, ?, NOW())', [req.user.id, 'resume_analyze']).catch(() => {});

    let analysis;
    try {
      const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      analysis = { atsScore: 70, resumeScore: 70, strengths: [], weaknesses: [], missingSkills: [], improvements: ['Upload a more detailed resume for better analysis'], summary: 'Analysis completed with limited data.' };
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[Extension] Resume analyze error:', err.message);
    res.status(500).json({ error: 'Resume analysis failed' });
  }
});

// =============================================
// APPLICATION TRACKING
// =============================================

/** GET /api/extension/applications — List applications */
router.get('/applications', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, jobTitle, company, location, salary, status, matchScore, appliedAt FROM applications WHERE userId = ? ORDER BY appliedAt DESC LIMIT 100',
      [req.user.id]
    );
    res.json({ success: true, applications: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/** POST /api/extension/applications — Track new application */
router.post('/applications', auth, async (req, res) => {
  try {
    const { jobTitle, company, location, salary, status, matchScore, jobUrl, platform, resumeVersion, coverLetterUsed, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO applications (userId, jobTitle, company, location, salary, status, matchScore, appliedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.id, jobTitle || '', company || '', location || '', salary || '', status || 'applied', matchScore || 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track application' });
  }
});

module.exports = router;
