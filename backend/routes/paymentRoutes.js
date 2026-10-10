const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
router.post('/webhook', paymentController.webhook);
router.get('/catalog', (req, res) => res.json({ plans: require('../config/billingCatalog'), currency: 'INR', configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) }));

// @route   POST api/payment/create-order
// @desc    Create Razorpay order
// @access  Private
router.post('/create-order', auth, paymentController.createOrder);

// @route   POST api/payment/verify
// @desc    Verify Razorpay payment
// @access  Private
router.post('/verify', auth, paymentController.verifyPayment);

// @route   POST api/payment/failed
// @desc    Log failed/cancelled Razorpay order
// @access  Private
router.post('/failed', auth, paymentController.failedPayment);

module.exports = router;
