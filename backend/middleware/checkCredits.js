const db = require('../config/db');

const PLAN_LIMITS = {
  free: { 
    dailyAI: 5,
    monthlyCoverLetter: 2,
    monthlyResume: 1,
    weeklyApplyWithAI: 1,
    monthlyMockInterview: 0
  },
  plus: { dailyAI: 10, monthlyCoverLetter: 10, monthlyResume: 5, weeklyApplyWithAI: 0, monthlyMockInterview: 2 },
  pro: { 
    dailyAI: 50,
    monthlyCoverLetter: 20,
    monthlyResume: 10,
    weeklyApplyWithAI: 10,
    monthlyMockInterview: 5
  },
  max: { 
    dailyAI: 200,
    monthlyCoverLetter: -1,
    monthlyResume: -1,
    weeklyApplyWithAI: -1,
    monthlyMockInterview: -1
  },
  ultimate: { 
    dailyAI: -1,
    monthlyCoverLetter: -1,
    monthlyResume: -1,
    weeklyApplyWithAI: -1,
    monthlyMockInterview: -1
  }
};

const MODEL_CREDIT_CONFIGS = {
  'hirenext-0.1': {
    cost: 1000,
    limits: {
      free: 5000,
      plus: 10000,
      pro: 20000,
      max: 200000,
      ultimate: -1
    }
  },
  'hirenext-flash': {
    cost: 1000,
    limits: {
      free: 5000,
      plus: 10000,
      pro: 15000,
      max: 150000,
      ultimate: -1
    }
  },
  'hirenext-pro': {
    cost: 1000,
    limits: {
      free: 0, // Premium required
      plus: 0,
      pro: 8000,
      max: 80000,
      ultimate: -1
    }
  }
};

// Log AI Usage on successful generation
const logAIUsage = async (userId, type) => {
  try {
    await db.query(
      'INSERT INTO ai_usage (userId, type, createdAt) VALUES (?, ?, NOW())',
      [userId, type]
    );
  } catch (err) {
    console.error('[Credits Service] Failed to log AI usage:', err.message);
  }
};

const checkCredits = (type) => async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const [rows] = await db.query('SELECT plan, planExpiresAt FROM users WHERE id = ?', [userId]);
    const plan = rows[0]?.planExpiresAt && new Date(rows[0].planExpiresAt) <= new Date() ? 'free' : (rows[0]?.plan || 'free').toLowerCase();
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    const period = type.includes('weekly') ? 'week' : 
                   type.includes('daily') ? 'day' : 'month';

    // Model specific daily credit limits
    if (type === 'dailyAI') {
      const modelId = req.body.model || 'hirenext-flash';
      if (typeof modelId !== 'string' || !Object.hasOwn(MODEL_CREDIT_CONFIGS, modelId)) return res.status(400).json({ error: 'Unknown AI model' });
      const config = MODEL_CREDIT_CONFIGS[modelId];
      const limit = config.limits[plan] ?? config.limits.free;

      if (limit === 0) {
        return res.status(403).json({
          error: 'Premium Required',
          message: `The model ${modelId} requires a Premium subscription. Please upgrade to Pro or higher.`,
          upgradeUrl: '/pricing',
          plan
        });
      }

      if (limit !== -1) {
        // Query daily usage count
        const [usage] = await db.query(
          `SELECT COUNT(*) as count FROM ai_usage 
           WHERE userId = ? AND type = 'dailyAI' 
           AND createdAt >= CURDATE()`,
          [userId]
        );
        const usedCount = usage[0].count;
        const usedCredits = usedCount * 1000;

        if (usedCredits >= limit) {
          return res.status(429).json({
            error: 'Limit reached',
            message: `You've used ${usedCredits.toLocaleString()}/${limit.toLocaleString()} credits for today. Upgrade your plan for more.`,
            upgradeUrl: '/pricing',
            used: usedCredits,
            limit,
            plan
          });
        }
      }
      return next();
    }

    // Default plan limits check (e.g. cover letters, resumes)
    const limit = limits[type];
    if (limit === -1) return next(); // unlimited

    const [usage] = await db.query(
      `SELECT COUNT(*) as count FROM ai_usage 
       WHERE userId = ? AND type = ? 
       AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 ${period.toUpperCase()})`,
      [userId, type]
    );
    const used = usage[0].count;

    if (used >= limit) {
      return res.status(429).json({
        error: `Limit reached`,
        message: `You've used ${used}/${limit} operations for this ${period}. Upgrade your plan for more.`,
        upgradeUrl: '/pricing',
        used,
        limit,
        plan
      });
    }

    next();
  } catch(e) {
    console.error('Credits check error:', e.message);
    res.status(503).json({ error: 'Unable to verify account limits. Please try again later.' });
  }
};

module.exports = { checkCredits, logAIUsage, PLAN_LIMITS, MODEL_CREDIT_CONFIGS };
