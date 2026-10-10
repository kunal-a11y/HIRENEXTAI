const nodemailer = require('nodemailer');

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
const unavailable = () => Object.assign(new Error('Email is not configured'), { code: 'EMAIL_UNAVAILABLE' });
const transporter = configured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  requireTLS: Number(process.env.SMTP_PORT) !== 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
}) : {
  verify(callback) {
    if (callback) { callback(unavailable()); return; }
    return Promise.reject(unavailable());
  },
  sendMail: async () => { throw unavailable(); },
};

module.exports = { transporter, configured };
