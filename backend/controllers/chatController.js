const pool = require('../config/db');
const aiService = require('../services/aiService');
const xss = require('xss');

exports.sendMessage = async (req, res) => {
    let { message } = req.body;
    if (typeof message === 'string') {
        message = xss(message);
    }
    const userId = req.user.id;

    if (typeof message !== 'string') {
        return res.status(400).json({ message: 'Message must be a valid string.' });
    }

    message = message.trim();

    if (!message) {
        return res.status(400).json({ message: 'Message cannot be empty.' });
    }

    if (message.length > 5000) {
        return res.status(400).json({ message: 'Message length cannot exceed 5000 characters.' });
    }

    try {
        // 1. Get or create a chat session for this user
        let [chatRows] = await pool.query(
            'SELECT id FROM chats WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
            [userId]
        );
        let chatId;
        if (chatRows.length === 0) {
            const [chatResult] = await pool.query(
                'INSERT INTO chats (userId, title, pinned, archived) VALUES (?, ?, FALSE, FALSE)',
                [userId, 'Chat Session']
            );
            chatId = chatResult.insertId;
        } else {
            chatId = chatRows[0].id;
        }

        // 2. Save user message to messages table
        await pool.query(
            'INSERT INTO messages (chatId, role, content) VALUES (?, ?, ?)',
            [chatId, 'user', message]
        );

        // 3. Retrieve recent chat history for context (e.g., last 10 messages)
        const [historyRows] = await pool.query(
            'SELECT role, content FROM messages WHERE chatId = ? ORDER BY createdAt DESC LIMIT 10',
            [chatId]
        );
        
        // Reverse so chronological
        const messages = historyRows.reverse().map(row => ({
            role: row.role,
            content: row.content
        }));

        // 4. Get AI Response
        const aiResponseContent = await aiService.generateChatResponse(messages);

        // 5. Save AI response to messages table
        await pool.query(
            'INSERT INTO messages (chatId, role, content) VALUES (?, ?, ?)',
            [chatId, 'ai', aiResponseContent]
        );

        res.json({ message: aiResponseContent });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error processing chat' });
    }
};

exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT m.id, m.content as message, m.role, m.createdAt as created_at 
             FROM messages m
             JOIN chats c ON m.chatId = c.id
             WHERE c.userId = ? 
             ORDER BY m.createdAt ASC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching history' });
    }
};

exports.clearHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        await pool.query(
            'DELETE FROM messages WHERE chatId IN (SELECT id FROM chats WHERE userId = ?)',
            [userId]
        );
        await pool.query('DELETE FROM chats WHERE userId = ?', [userId]);
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error clearing history' });
    }
};

const crypto = require('crypto');

exports.shareChat = async (req, res) => {
    const { messages, title, options } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Messages are required and must be an array.' });
    }
    try {
        const shareId = crypto.randomBytes(8).toString('hex');
        await pool.query(
            'INSERT INTO shared_chats (id, title, messages, options) VALUES (?, ?, ?, ?)',
            [shareId, title || 'Shared Chat', JSON.stringify(messages), JSON.stringify(options || {})]
        );
        
        const baseUrl = (process.env.FRONTEND_URL || 'https://hirenextai.com').replace(/\/$/, '');
        const shareUrl = `${baseUrl}/share/${shareId}`;
        res.json({ shareUrl, shareId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error generating share link' });
    }
};

exports.getSharedChat = async (req, res) => {
    const { shareId } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT title, messages, options, createdAt FROM shared_chats WHERE id = ?',
            [shareId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Shared chat not found' });
        }
        const chat = rows[0];
        const options = JSON.parse(chat.options || '{}');
        
        if (options.expiresAt) {
            const expiry = new Date(options.expiresAt);
            if (expiry < new Date()) {
                return res.status(410).json({ message: 'This shared chat has expired' });
            }
        }
        
        res.json({
            title: chat.title,
            messages: JSON.parse(chat.messages || '[]'),
            options,
            createdAt: chat.createdAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error loading shared chat' });
    }
};
