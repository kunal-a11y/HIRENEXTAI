const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const inMemoryTickets = require('../models/inMemoryTickets');
const { sendSupportNotification, sendUserConfirmation } = require('../services/emailService');
const xss = require('xss');

const rateLimit = require('express-rate-limit');

const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 tickets per hour
  message: { message: 'Too many support tickets submitted from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/ticket', ticketLimiter, async (req, res) => {
  try {
    let { name, email, subject, message, category } = req.body;

    if (typeof name === 'string') name = xss(name);
    if (typeof email === 'string') email = xss(email);
    if (typeof subject === 'string') subject = xss(subject);
    if (typeof message === 'string') message = xss(message);
    if (typeof category === 'string') category = xss(category);

    console.log('Submitting form:', { name, email, subject, message });

    if (typeof name !== 'string' || typeof email !== 'string' || typeof subject !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ message: 'All fields must be valid strings.' });
    }

    name = name.trim();
    email = email.trim();
    subject = subject.trim();
    message = message.trim();
    category = typeof category === 'string' ? category.trim() : 'general';

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: 'Name cannot exceed 100 characters.' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ message: 'Subject cannot exceed 200 characters.' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ message: 'Message length cannot exceed 5000 characters.' });
    }

    // Save ticket to DB (wrapped in try-catch so it succeeds even if the table or service is down)
    let ticketSavedToDb = false;
    try {
      await pool.query(
        'INSERT INTO support_tickets (name, email, subject, message, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, subject, message, category, 'new']
      );
      ticketSavedToDb = true;
      console.log('Ticket successfully saved to database');
    } catch (dbErr) {
      console.error('DB save failed (continuing):', dbErr.message);
    }

    // Store in memory regardless
    const ticketId = Date.now();
    const inMemTicket = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      category,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryTickets.push(inMemTicket);
    console.log('Ticket stored in memory:', ticketId);

    // Send emails in the background
    sendSupportNotification({ name, email, subject, message })
      .then(() => console.log('Support notification sent'))
      .catch(emailErr => console.error('Support email failed:', emailErr.message));

    sendUserConfirmation({ name, email, subject })
      .then(() => console.log('User confirmation sent'))
      .catch(emailErr => console.error('User confirmation failed:', emailErr.message));

    res.status(200).json({ 
      message: 'Message received! We will get back to you within 24 hours.',
      ticketId: ticketId.toString()
    });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ message: 'Failed to submit. Please try again.' });
  }
});

module.exports = router;
