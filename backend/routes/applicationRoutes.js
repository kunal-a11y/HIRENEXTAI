const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const { checkCredits } = require('../middleware/checkCredits');

router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, jobTitle, company, location, salary, status, matchScore, appliedAt
             FROM applications WHERE userId = ? ORDER BY appliedAt DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('List applications error:', err);
        res.status(500).json({ error: 'Failed to load applications' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const {
            jobTitle,
            job_title,
            company,
            location = '',
            salary = '',
            status = 'applied',
            matchScore,
            match
        } = req.body;
        const title = jobTitle || job_title;

        if (!title || !company) {
            return res.status(400).json({ error: 'jobTitle and company are required' });
        }

        const [result] = await db.query(
            `INSERT INTO applications (userId, jobTitle, company, location, salary, status, matchScore)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, company, location, salary, status, matchScore ?? match ?? null]
        );
        res.status(201).json({ success: true, applicationId: result.insertId });
    } catch (err) {
        console.error('Create application error:', err);
        res.status(500).json({ error: 'Failed to save application' });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const allowedStatuses = ['applied', 'interview', 'offer', 'rejected', 'pending'];
        const status = String(req.body.status || '').toLowerCase();
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid application status' });
        }
        const [result] = await db.query(
            'UPDATE applications SET status = ? WHERE id = ? AND userId = ?',
            [status, req.params.id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Application not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update application' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM applications WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Application not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// Save application via Apply with AI
router.post('/apply-with-ai', auth, checkCredits('weeklyApplyWithAI'), async (req, res) => {
    try {
        const { jobTitle, job_title, company, location = '', salary = '', matchScore = null, match = null } = req.body;
        const title = jobTitle || job_title;
        const userId = req.user.id;

        if (!title || !company) {
            return res.status(400).json({ success: false, message: 'jobTitle and company are required.' });
        }

        const [result] = await db.query(
            `INSERT INTO applications (userId, jobTitle, company, location, salary, status, matchScore) 
             VALUES (?, ?, ?, ?, ?, 'applied', ?)`,
            [userId, title, company, location, salary, matchScore ?? match]
        );

        // Deduct/log usage ONLY after successful DB insert
        const { logAIUsage } = require('../middleware/checkCredits');
        await logAIUsage(userId, 'weeklyApplyWithAI');

        res.json({ success: true, applicationId: result.insertId });
    } catch (err) {
        console.error("Save application tracker error:", err);
        res.status(500).json({ success: false, message: 'Failed to save application tracker' });
    }
});

// Backwards-compatible alias used by older extension builds.
router.post('/ai-apply', auth, async (req, res) => {
    try {
        const title = req.body.jobTitle || req.body.job_title;
        if (!title || !req.body.company) {
            return res.status(400).json({ success: false, message: 'jobTitle and company are required.' });
        }
        const [result] = await db.query(
            `INSERT INTO applications (userId, jobTitle, company, location, salary, status, matchScore)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                title,
                req.body.company,
                req.body.location || '',
                req.body.salary || '',
                req.body.status || 'applied',
                req.body.matchScore ?? req.body.match ?? null
            ]
        );
        res.status(201).json({ success: true, applicationId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save application' });
    }
});

// Handle extension screenshot push
router.post('/screenshot', auth, async (req, res) => {
    try {
        const { screenshot, jobData, message } = req.body;
        
        // 1. Get or create a chat session for this user
        let [chatRows] = await db.query(
            'SELECT id FROM chats WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
            [req.user.id]
        );
        let chatId;
        if (chatRows.length === 0) {
            const [chatResult] = await db.query(
                'INSERT INTO chats (userId, title, pinned, archived) VALUES (?, ?, FALSE, FALSE)',
                [req.user.id, 'Chat Session']
            );
            chatId = chatResult.insertId;
        } else {
            chatId = chatRows[0].id;
        }

        // 2. Save the AI Agent Report message to the messages table
        const [result] = await db.query(
            `INSERT INTO messages (chatId, role, content) VALUES (?, 'ai', ?)`,
            [
                chatId, 
                JSON.stringify({
                    type: 'ai_agent_report',
                    text: message,
                    jobData: jobData,
                    screenshot: screenshot
                })
            ]
        );

        res.json({ success: true, messageId: result.insertId });
    } catch (err) {
        console.error("Screenshot save error:", err);
        res.status(500).json({ success: false, message: 'Failed to process screenshot' });
    }
});

module.exports = router;
