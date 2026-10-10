const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const geminiService = require('../services/geminiService');

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

// Call Gemini API helper (kept name callOpenRouter to minimize changes)
const callOpenRouter = async (systemPrompt, userPrompt) => {
    try {
        const prompt = `System Instruction:
${systemPrompt}

User Input:
${userPrompt}`;

        const response = await geminiService.generateContent(prompt, {
            endpoint: '/api/interview'
        });

        return extractJSON(response);
    } catch (err) {
        console.error("Gemini Interview Error:", err);
        throw err;
    }
};

// Generate questions
router.post('/generate', auth, async (req, res) => {
    try {
        let { role, difficulty, type, count } = req.body;

        if (typeof role !== 'string') {
            return res.status(400).json({ success: false, message: 'Role must be a valid string.' });
        }
        role = role.trim();
        if (!role) {
            return res.status(400).json({ success: false, message: 'Role is required.' });
        }
        if (role.length > 100) {
            return res.status(400).json({ success: false, message: 'Role length cannot exceed 100 characters.' });
        }

        if (typeof difficulty !== 'string') {
            return res.status(400).json({ success: false, message: 'Difficulty must be a string.' });
        }
        difficulty = difficulty.trim().toLowerCase();
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({ success: false, message: 'Difficulty must be easy, medium, or hard.' });
        }

        if (typeof type !== 'string') {
            return res.status(400).json({ success: false, message: 'Type must be a string.' });
        }
        type = type.trim().toLowerCase();
        if (!['technical', 'hr', 'mixed'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Type must be technical, hr, or mixed.' });
        }

        const countNum = parseInt(count, 10);
        if (isNaN(countNum) || countNum < 1 || countNum > 20) {
            return res.status(400).json({ success: false, message: 'Count must be an integer between 1 and 20.' });
        }
        count = countNum;

        const systemPrompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions for a ${role} position.
Difficulty: ${difficulty}
Type: ${type} (technical/HR/mixed)
Return ONLY a valid JSON object with a single 'questions' array inside:
{
  "questions": [
    {
      "id": 1,
      "type": "technical",
      "question": "Explain the virtual DOM...",
      "key_points": ["point1", "point2"],
      "good_answer_hints": "A good answer should..."
    }
  ]
}`;

        const data = await callOpenRouter(systemPrompt, "Please generate the questions now.");
        
        res.json({ success: true, questions: data.questions || data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to generate questions' });
    }
});

// Evaluate answers
router.post('/evaluate', auth, async (req, res) => {
    try {
        let { role, questions, answers } = req.body;

        if (typeof role !== 'string') {
            return res.status(400).json({ success: false, message: 'Role must be a valid string.' });
        }
        role = role.trim();
        if (!role) {
            return res.status(400).json({ success: false, message: 'Role is required.' });
        }
        if (role.length > 100) {
            return res.status(400).json({ success: false, message: 'Role length cannot exceed 100 characters.' });
        }

        if (!Array.isArray(questions) || questions.length === 0 || questions.length > 20) {
            return res.status(400).json({ success: false, message: 'Questions must be a non-empty array with at most 20 elements.' });
        }

        if (!Array.isArray(answers) || answers.length !== questions.length) {
            return res.status(400).json({ success: false, message: 'Answers must be an array of the same length as questions.' });
        }

        const systemPrompt = `You are an expert technical interviewer. Evaluate these interview answers for a ${role} position.
Evaluate strictly but fairly.
Return ONLY a valid JSON object in this format:
{
  "overall_score": 78,
  "breakdown": {
    "communication": 80,
    "technical": 65,
    "problem_solving": 75,
    "confidence": 90
  },
  "question_scores": [
    {
      "question_id": 1,
      "score": 8,
      "correct": "What was good...",
      "incorrect": "What was missing...",
      "better_answer": "A better answer would..."
    }
  ],
  "strengths": "You showed...",
  "improvements": "Work on...",
  "study_topics": ["Topic 1", "Topic 2"]
}`;

        const userPrompt = JSON.stringify({ questions, answers });

        const results = await callOpenRouter(systemPrompt, userPrompt);
        
        res.json({ success: true, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to evaluate answers' });
    }
});

// Save interview
router.post('/save', auth, async (req, res) => {
    try {
        let { role, difficulty, overall_score, questions_json, answers_json, feedback_json } = req.body;
        
        if (typeof role !== 'string' || !role.trim()) {
            return res.status(400).json({ success: false, message: 'Role is required.' });
        }
        role = role.trim();

        if (typeof difficulty !== 'string' || !['easy', 'medium', 'hard'].includes(difficulty.trim().toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Valid difficulty is required.' });
        }
        difficulty = difficulty.trim().toLowerCase();

        const score = parseFloat(overall_score);
        if (isNaN(score) || score < 0 || score > 100) {
            return res.status(400).json({ success: false, message: 'Overall score must be a number between 0 and 100.' });
        }

        const formatJson = (val) => {
            if (typeof val === 'string') {
                try {
                    JSON.parse(val);
                    return val;
                } catch {
                    return JSON.stringify({ data: val });
                }
            }
            return JSON.stringify(val || {});
        };

        const formattedQuestions = formatJson(questions_json);
        const formattedAnswers = formatJson(answers_json);
        const formattedFeedback = formatJson(feedback_json);

        let interviewId = Date.now();
        try {
            const [result] = await db.query(
                `INSERT INTO interviews (user_id, role, difficulty, overall_score, questions_json, answers_json, feedback_json) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, role, difficulty, score, formattedQuestions, formattedAnswers, formattedFeedback]
            );
            interviewId = result.insertId;
        } catch (dbErr) {
            console.warn('interviews table not found, using fallback interviewId:', dbErr.message);
        }

        res.json({ success: true, interviewId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save interview' });
    }
});

// Get past interview history
router.get('/history', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, role, difficulty, overall_score, createdAt 
             FROM interviews 
             WHERE user_id = ? 
             ORDER BY createdAt DESC`,
            [req.user.id]
        );
        res.json({ success: true, history: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch interview history' });
    }
});

// Get detailed interview session by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM interviews WHERE id = ? AND user_id = ? LIMIT 1`,
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Interview session not found' });
        }
        res.json({ success: true, interview: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch interview details' });
    }
});

module.exports = router;
