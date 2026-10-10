const crypto = require('crypto');
const pool = require('../config/db');
const Razorpay = require('razorpay');
const catalog = require('../config/billingCatalog');

function client() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret || /^(dummy|your_)/.test(key) || /^(dummy|your_)/.test(secret)) return null;
  return new Razorpay({ key_id: key, key_secret: secret });
}

async function createOrder(req, res) {
  const provider = client();
  if (!provider) return res.status(503).json({ error: 'Payments are not configured' });
  const currency = String(req.body.currency || 'INR').toUpperCase();
  if (!['INR', 'USD'].includes(currency) || !Number.isInteger(Number(req.body.planId))) {
    return res.status(400).json({ error: 'Invalid plan or currency' });
  }
  try {
    const plan = catalog.find(item => item.id === Number(req.body.planId));
    const billing = req.body.billing || 'monthly';
    if (!plan || plan.name === 'free' || !['monthly', 'annual'].includes(billing) || currency !== 'INR') return res.status(400).json({ error: 'Invalid paid plan or billing period' });
    const amount = plan[billing];
    const order = await provider.orders.create({ amount, currency, receipt: `order_${req.user.id}_${Date.now()}` });
    await pool.query('INSERT INTO payment_orders (orderId, userId, planName, amount, currency, billing) VALUES (?, ?, ?, ?, ?, ?)',
      [order.id, req.user.id, plan.name, amount, currency, billing]);
    res.json({ ...order, orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create payment order failed:', error.message);
    res.status(500).json({ error: 'Unable to create payment order' });
  }
}

async function verifyPayment(req, res) {
  const provider = client();
  if (!provider) return res.status(503).json({ error: 'Payments are not configured' });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId) ||
      typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId) ||
      typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) {
    return res.status(400).json({ error: 'Invalid payment parameters' });
  }
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.status(400).json({ error: 'Invalid payment signature' });
  let connection;
  try {
    const [orders] = await pool.query('SELECT * FROM payment_orders WHERE orderId = ? AND userId = ?', [orderId, req.user.id]);
    const order = orders[0];
    if (!order) return res.status(404).json({ error: 'Payment order not found' });
    const payment = await provider.payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.status !== 'captured' || Number(payment.amount) !== Number(order.amount) || payment.currency !== order.currency) {
      return res.status(400).json({ error: 'Payment is not captured or does not match the order' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [locked] = await connection.query('SELECT * FROM payment_orders WHERE orderId = ? AND userId = ? FOR UPDATE', [orderId, req.user.id]);
    if (!locked.length) throw new Error('Order disappeared');
    if (locked[0].status === 'paid') {
      await connection.rollback();
      return res.json({ message: 'Payment already verified', plan: locked[0].planName });
    }
    await connection.query("UPDATE payment_orders SET status = 'paid', paymentId = ? WHERE orderId = ?", [paymentId, orderId]);
    const days = order.billing === 'annual' ? 365 : 30;
    await connection.query('UPDATE users SET planExpiresAt = DATE_ADD(IF(plan = ?, GREATEST(COALESCE(planExpiresAt, NOW()), NOW()), NOW()), INTERVAL ? DAY), plan = ? WHERE id = ?', [order.planName, days, order.planName, req.user.id]);
    await connection.commit();
    res.json({ message: 'Payment verified successfully', plan: order.planName });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Payment verification failed:', error.message);
    res.status(500).json({ error: 'Unable to verify payment' });
  } finally {
    if (connection) connection.release();
  }
}

async function webhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !client()) return res.status(503).json({ error: 'Payment notifications are not configured' });
  const signature = req.headers['x-razorpay-signature'];
  if (!Buffer.isBuffer(req.rawBody) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return res.status(400).json({ error: 'Invalid notification signature' });
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.status(400).json({ error: 'Invalid notification signature' });
  if (!['payment.captured', 'order.paid'].includes(req.body.event)) return res.json({ received: true });
  const payment = req.body.payload?.payment?.entity;
  if (!payment || !/^order_[a-zA-Z0-9]+$/.test(payment.order_id || '') || !/^pay_[a-zA-Z0-9]+$/.test(payment.id || '')) return res.status(400).json({ error: 'Invalid notification payment' });
  try {
    const [orders] = await pool.query('SELECT userId FROM payment_orders WHERE orderId = ?', [payment.order_id]);
    if (!orders.length) return res.json({ received: true }); // Another product may share this merchant account.
    // Reuse provider fetch, amount/currency checks and the idempotent transaction.
    return verifyPayment({ user: { id: orders[0].userId }, body: {
      razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id,
      razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${payment.order_id}|${payment.id}`).digest('hex'),
    } }, res);
  } catch (err) { return res.status(500).json({ error: 'Could not process payment notification' }); }
}

module.exports = { createOrder, verifyPayment, webhook, failedPayment: (req, res) => res.json({ success: true }) };
