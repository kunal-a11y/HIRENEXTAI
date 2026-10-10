const pool = require('../config/db');

exports.getPlans = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM plans');
        res.json(rows);
    } catch (error) {
        console.warn('plans table query failed, returning default fallback plans list:', error.message);
        res.json([
            { id: 1, name: 'free', price_inr: 0, price_usd: 0, features: 'Basic match score, 1 Mock interview/week', limits: '{"messages": 10}' },
            { id: 2, name: 'pro', price_inr: 299, price_usd: 9, features: 'Detailed match score, Apply with AI, Priority support', limits: '{"messages": -1}' }
        ]);
    }
};
