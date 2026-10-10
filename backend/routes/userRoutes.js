const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

const pool = require('../config/db');
const { PLAN_LIMITS } = require('../middleware/checkCredits');

router.put('/profile', authenticateToken, userController.updateProfile);
router.get('/me', authenticateToken, require('../controllers/authController').getMe);
router.delete('/account', authenticateToken, userController.deleteAccount);
router.get('/export', authenticateToken, userController.exportData);

router.get('/credits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT plan FROM users WHERE id = ?', [userId]);
    const plan = rows[0]?.plan || 'free';
    const limits = PLAN_LIMITS[plan.toLowerCase()] || PLAN_LIMITS.free;
    
    const [dailyUsed] = await pool.query(
      `SELECT COUNT(*) as count FROM ai_usage 
       WHERE userId = ? AND type = 'dailyAI' 
       AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [userId]
    );
    
    res.json({
      plan,
      credits: {
        daily: { used: dailyUsed[0].count, limit: limits.dailyAI },
      }
    });
  } catch(e) {
    console.error('Credits check error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
