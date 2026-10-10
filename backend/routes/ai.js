const express = require('express');
const router = express.Router();
const { sendMessage, generateContent, clearSession } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');
const { checkCredits, logAIUsage, MODEL_CREDIT_CONFIGS } = require('../middleware/checkCredits');
const xss = require('xss');

// Helper to extract JSON from markdown code blocks or plain text
function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        // Fall through
      }
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch (e3) {
        // Fall through
      }
    }
    throw e;
  }
}

// Check config status
router.get('/config-check', async (req, res) => {
  try {
    const pool = require('../config/db');
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE isActive = true AND isDisabled = false');
    res.json({ hasGeminiKey: rows[0].count > 0 });
  } catch (err) {
    res.json({ hasGeminiKey: false });
  }
});

// Model settings metrics, credits & 7-day usage endpoint
router.get('/model-settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const pool = require('../config/db');
    
    const [userRows] = await pool.query('SELECT plan FROM users WHERE id = ?', [userId]);
    const plan = (userRows[0]?.plan || 'free').toLowerCase();

    // Query CURDATE() credits used
    const [usage] = await pool.query(
      `SELECT COUNT(*) as count FROM ai_usage 
       WHERE userId = ? AND type = 'dailyAI' 
       AND createdAt >= CURDATE()`,
      [userId]
    );
    const dailyCount = usage[0].count;
    const creditsUsedToday = dailyCount * 1000;

    // Get usage counts for each of the last 7 days for graphing
    const [graphUsage] = await pool.query(
      `SELECT DATE(createdAt) as date, COUNT(*) as count FROM ai_usage 
       WHERE userId = ? AND type = 'dailyAI' 
       AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(createdAt)
       ORDER BY DATE(createdAt) ASC`,
      [userId]
    );

    // Map 7-day usage array for frontend graphs
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = graphUsage.find(row => {
        const rowDate = new Date(row.date);
        return rowDate.toISOString().split('T')[0] === dateStr;
      });
      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        credits: match ? match.count * 1000 : 0
      });
    }

    // Reset Timer: hours and minutes left until midnight tomorrow
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diffMs = midnight - now;
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const resetTimer = `${hoursLeft}h ${minsLeft}m`;

    res.json({
      success: true,
      plan,
      creditsUsedToday,
      resetTimer,
      graphData: last7Days,
      configs: MODEL_CREDIT_CONFIGS
    });
  } catch (error) {
    console.error('[API Error] Model settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch model settings information' });
  }
});

// Main chat endpoint
router.post('/chat', authMiddleware, checkCredits('dailyAI'), async (req, res, next) => {
  try {
    const [rows] = await require('../config/db').query('SELECT COUNT(*) AS count FROM api_keys WHERE isActive = true AND isDisabled = false');
    if (!rows[0].count) return res.status(503).json({ error: 'AI is not configured. Add a provider key to enable chat.' });
    next();
  } catch (error) { next(error); }
}, async (req, res) => {
  try {
    let { message, model, userContext } = req.body;
    if (typeof message === 'string') {
      message = xss(message);
    }
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (typeof message !== 'string' || !message.trim() || message.length > 10000) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Enrich context with database values
    const enrichedContext = { ...(userContext || {}) };
    try {
      const pool = require('../config/db');
      const [userRows] = await pool.query(
        'SELECT phone, linkedinUrl, indeedUrl, naukriUrl, githubUrl, firstName, lastName FROM users WHERE id = ?', 
        [userId]
      );
      if (userRows.length > 0) {
        const u = userRows[0];
        enrichedContext.phone = u.phone || '';
        enrichedContext.linkedinUrl = u.linkedinUrl || '';
        enrichedContext.indeedUrl = u.indeedUrl || '';
        enrichedContext.naukriUrl = u.naukriUrl || '';
        enrichedContext.githubUrl = u.githubUrl || '';
        enrichedContext.name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      }
    } catch (dbErr) {
      console.warn('Enrich user context failed:', dbErr.message);
    }

    // Job search is now powered by real provider APIs — no connected accounts required
    
    const response = await sendMessage(String(userId), message, enrichedContext, model);
    
    // Deduct credits ONLY after successful response
    await logAIUsage(userId, 'dailyAI');

    res.json({ response, success: true });
  } catch (error) {
    console.error('[API Error] Error during Gemini message processing:', error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Clear chat history (new chat)
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    clearSession(req.user.id);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Generate mind map after interview
router.post('/mind-map', authMiddleware, async (req, res) => {
  try {
    const { jobTitle, questions, answers, scores } = req.body;
    
    const prompt = `Create a comprehensive mind map summary for a mock interview:
Job: ${jobTitle}
Questions and Answers: ${JSON.stringify(questions.map((q, i) => ({ question: q, answer: answers[i], score: scores[i] })))}

Generate a structured mind map as JSON:
{
  "center": "${jobTitle} Interview",
  "overallScore": number,
  "branches": [
    {
      "topic": string,
      "color": string (hex color),
      "items": [
        { "label": string, "score": number, "status": "strong|improve|weak" }
      ]
    }
  ],
  "topStrengths": array of strings,
  "topImprovements": array of strings,
  "readinessLevel": "Not Ready|Needs Work|Almost Ready|Ready|Excellent",
  "nextSteps": array of strings
}`;

    const response = await generateContent(prompt);
    try {
      const parsed = extractJSON(response);
      res.json({ mindMap: parsed, success: true });
    } catch {
      res.json({ mindMap: response, success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Generate cover letter
router.post('/cover-letter', authMiddleware, checkCredits('monthlyCoverLetter'), async (req, res) => {
  try {
    const { jobTitle, company, jobDescription, userProfile } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    const prompt = `Generate a professional, personalized cover letter for:
Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription}
Candidate Profile: ${JSON.stringify(userProfile)}

Requirements:
- Professional tone, 3-4 paragraphs
- Highlight relevant skills matching the job description
- Show enthusiasm for the specific company
- Include specific achievements if provided in profile
- ATS-friendly format
- End with a strong call to action
- Do NOT use generic phrases like "I am writing to apply"
- Make it sound human and authentic`;

    const response = await generateContent(prompt);
    
    // Deduct credits ONLY after successful response
    await logAIUsage(userId, 'monthlyCoverLetter');

    res.json({ coverLetter: response, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Optimize resume
router.post('/optimize-resume', authMiddleware, checkCredits('monthlyResume'), async (req, res) => {
  try {
    const { resumeText, jobDescription, jobTitle } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    const prompt = `Analyze and optimize this resume for the following job:
Job Title: ${jobTitle}
Job Description: ${jobDescription}
Current Resume: ${resumeText}

Provide:
1. ATS Score (0-100) with explanation
2. Missing keywords from job description
3. Specific improvements for each section
4. Rewritten bullet points that are stronger
5. Skills to add or highlight
6. Overall recommendations

Format response as structured JSON with these keys:
{
  "atsScore": number,
  "scoreExplanation": string,
  "missingKeywords": array,
  "improvements": { "summary": string, "experience": array, "skills": array },
  "recommendations": array
}`;

    const response = await generateContent(prompt);
    
    // Deduct credits ONLY after successful response
    await logAIUsage(userId, 'monthlyResume');

    try {
      const parsed = extractJSON(response);
      res.json({ analysis: parsed, success: true });
    } catch {
      res.json({ analysis: response, success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Generate mock interview questions
router.post('/interview-questions', authMiddleware, checkCredits('monthlyMockInterview'), async (req, res) => {
  try {
    const { jobTitle, company, jobDescription, difficulty = 'medium' } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    const prompt = `Generate 10 mock interview questions for:
Job Title: ${jobTitle}
Company: ${company || 'a top tech company'}
Job Description: ${jobDescription || 'standard ' + jobTitle + ' role'}
Difficulty: ${difficulty}

Include mix of:
- 3 behavioral questions (STAR format)
- 3 technical/role-specific questions
- 2 situational questions
- 1 company-specific question
- 1 career goals question

For each question provide:
- The question
- What the interviewer is looking for
- A strong example answer framework

Return as JSON array:
[{
  "id": number,
  "type": "behavioral|technical|situational|company|career",
  "question": string,
  "lookingFor": string,
  "answerFramework": string
}]`;

    const response = await generateContent(prompt);
    
    // Deduct credits ONLY after successful response
    await logAIUsage(userId, 'monthlyMockInterview');
    try {
      const parsed = extractJSON(response);
      res.json({ questions: parsed, success: true });
    } catch {
      res.json({ questions: response, success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Evaluate interview answer
router.post('/evaluate-answer', authMiddleware, async (req, res) => {
  try {
    const { question, answer, jobTitle } = req.body;
    
    const prompt = `Evaluate this interview answer for a ${jobTitle} position:

Question: ${question}
Candidate Answer: ${answer}

Provide evaluation as JSON:
{
  "score": number (1-10),
  "strengths": array of strings,
  "improvements": array of strings,
  "betterAnswer": string,
  "tips": string
}`;

    const response = await generateContent(prompt);
    try {
      const parsed = extractJSON(response);
      res.json({ evaluation: parsed, success: true });
    } catch {
      res.json({ evaluation: response, success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Auto-fill job application
router.post('/autofill', authMiddleware, async (req, res) => {
  try {
    const { formFields, userProfile, jobDescription } = req.body;
    
    const prompt = `Help fill out a job application form.
Form fields: ${JSON.stringify(formFields)}
User profile: ${JSON.stringify(userProfile)}
Job description: ${jobDescription}

For each form field, provide the best value to fill in based on the user profile.
Tailor answers to match the job description where relevant.

Return as JSON object where keys are field names and values are suggested fill values:
{
  "fieldName": "suggested value",
  ...
}`;

    const response = await generateContent(prompt);
    try {
      const parsed = extractJSON(response);
      res.json({ autofill: parsed, success: true });
    } catch {
      res.json({ autofill: response, success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'HirenextAI is temporarily busy. Please try again in a few moments.' });
  }
});

// Direct job search endpoint (uses real providers, no AI generation)
router.post('/search-jobs', authMiddleware, async (req, res) => {
  try {
    const { query, location } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const ProviderManager = require('../providers/ProviderManager');
    const jobCache = require('../services/jobCache');

    // Check cache first
    const cached = await jobCache.get(query, location);
    if (cached && cached.length > 0) {
      return res.json({ success: true, jobs: cached, source: 'cache', count: cached.length });
    }

    // Fetch user profile for match scoring
    const userId = req.user?.id || req.user?.userId;
    let userProfile = {};
    try {
      const pool = require('../config/db');
      const [userRows] = await pool.query(
        'SELECT firstName, lastName, email, phone, linkedinUrl, githubUrl FROM users WHERE id = ?',
        [userId]
      );
      if (userRows.length > 0) userProfile = userRows[0];
    } catch (e) {}

    const jobs = await ProviderManager.getJobs(query, location, userProfile);

    if (!jobs || jobs.length === 0) {
      return res.json({
        success: true,
        jobs: [],
        count: 0,
        message: 'No matching jobs were found from the currently available providers. Please try different search criteria.'
      });
    }

    // Cache results
    await jobCache.set(query, location, jobs);

    res.json({ success: true, jobs, source: 'providers', count: jobs.length });
  } catch (error) {
    console.error('[AI Routes] Job search error:', error.message);
    res.status(500).json({ error: 'Job search temporarily unavailable. Please try again.' });
  }
});

module.exports = router;

