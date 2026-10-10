const express = require('express');
const router = express.Router();
const {
  sendWelcomeEmail,
  sendSupportNotification,
  sendUserConfirmation,
  sendPasswordResetEmail,
  sendPlanPurchaseEmail
} = require('../services/emailService');

router.post('/api/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    const { type, email } = req.body;
    if (type === 'welcome') {
      await sendWelcomeEmail({ firstName: 'Test User', email });
    } else if (type === 'contact') {
      await sendSupportNotification({ name: 'Test', email, subject: 'Test', message: 'Test message' });
      await sendUserConfirmation({ name: 'Test', email, subject: 'Test' });
    } else if (type === 'reset') {
      await sendPasswordResetEmail({ firstName: 'Test', email, token: 'test-token-123' });
    } else if (type === 'plan') {
      await sendPlanPurchaseEmail({ firstName: 'Test', email, planName: 'Pro' });
    }
    res.json({ success: true, message: 'Email sent to ' + email });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
