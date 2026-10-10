const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// @route   GET api/plans
// @desc    Get all subscription plans
// @access  Public
router.get('/', planController.getPlans);

module.exports = router;
