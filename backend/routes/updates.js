const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const router = express.Router();
const subscribeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Please wait a little before subscribing again.' } });

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    await pool.query('INSERT INTO update_subscribers (email) VALUES (?) ON DUPLICATE KEY UPDATE email = VALUES(email)', [email]);
    res.json({ message: 'Thank you for subscribing.' });
  } catch (err) {
    console.error('Subscription could not be saved:', err.code);
    res.status(503).json({ error: 'We could not save your email. Please try again.' });
  }
});
module.exports = router;
