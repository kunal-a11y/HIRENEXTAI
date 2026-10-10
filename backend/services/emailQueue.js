const pool = require('../config/db');
const crypto = require('crypto');

// Global SMTP Diagnostic Stats
const smtpStats = {
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
  totalSendTimeMs: 0,
  totalSentCount: 0,
  averageSendTimeMs: 0,
};

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitStatus = 'CLOSED'; // 'CLOSED' or 'OPEN'
let circuitOpenUntil = null;

// Helper to check circuit status
const checkCircuit = () => {
  if (circuitStatus === 'OPEN') {
    if (Date.now() > circuitOpenUntil) {
      circuitStatus = 'CLOSED';
      consecutiveFailures = 0;
      circuitOpenUntil = null;
      console.log('⚡ SMTP Circuit Breaker reset to CLOSED.');
    } else {
      throw new Error('Email service is temporarily unavailable. Please try again later.');
    }
  }
};

// Helper to classify SMTP errors
const classifySmtpError = (errMessage) => {
  const msg = String(errMessage).toLowerCase();
  if (msg.includes('auth') || msg.includes('login') || msg.includes('credentials') || msg.includes('authentication')) {
    return 'Authentication Error';
  }
  if (msg.includes('dns') || msg.includes('getaddrinfo') || msg.includes('host') || msg.includes('enotfound')) {
    return 'DNS Error';
  }
  if (msg.includes('ptr') || msg.includes('reverse dns') || msg.includes('550 5.7.25') || msg.includes('fcrdns')) {
    return 'PTR / Reverse DNS Error';
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout')) {
    return 'Connection Timeout';
  }
  if (msg.includes('rate limit') || msg.includes('421') || msg.includes('too many') || msg.includes('throttled')) {
    return 'Rate Limited';
  }
  if (msg.includes('full') || msg.includes('quota') || msg.includes('exceeded')) {
    return 'Mailbox Full';
  }
  if (msg.includes('recipient') || msg.includes('reject') || msg.includes('550')) {
    return 'Recipient Rejected';
  }
  return 'Unknown Error';
};

// Render email body content locally to avoid circular dependencies
const renderEmailContent = (templateName, payload) => {
  const wrapEmailContent = (bodyContent) => `
    <div style="background-color: #F9FAFB; padding: 40px 20px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #374151; min-height: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
        <div style="padding: 32px 32px 24px; text-align: center; background-color: #FFFFFF; border-bottom: 1px solid #F3F4F6;">
          <a href="https://hirenextai.com" style="text-decoration: none; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 24px; font-weight: 800; color: #111827; display: block; text-align: center;">
            <img src="https://hirenextai.com/assets/logo.png" alt="HirenextAI" width="180" style="display: block; margin: 0 auto; border: 0; width: 180px; height: auto; font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; color: #111827; text-align: center;" />
          </a>
        </div>
        <div style="padding: 40px 32px; line-height: 1.6; color: #374151; background-color: #FFFFFF; font-size: 15px;">
          ${bodyContent}
        </div>
        <div style="padding: 32px; text-align: center; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #6B7280; font-family: 'Inter', sans-serif;">
            Questions? Contact 
            <a href="mailto:support@hirenextai.com" style="color: #111827; text-decoration: none; font-weight: 600;">support@hirenextai.com</a> | <a href="https://hirenextai.com" style="color: #111827; text-decoration: none; font-weight: 600;">hirenextai.com</a>
          </p>
          <p style="margin: 0 0 16px 0; font-size: 12px; color: #6B7280; font-family: 'Inter', sans-serif;">
            &copy; ${new Date().getFullYear()} HirenextAI. All rights reserved.
          </p>
          <div style="font-size: 11px; color: #9CA3AF; line-height: 1.4; font-family: 'Inter', sans-serif;">
            This is an automated security email.
          </div>
        </div>
      </div>
    </div>
  `;

  if (templateName === 'OTP Email') {
    const { otp } = payload;
    return {
      subject: `Admin Security Verification Code: ${otp} 🔐`,
      html: wrapEmailContent(`
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 800; text-align: center; font-family: 'Inter', system-ui, -apple-system, sans-serif; letter-spacing: -0.5px;">Admin Security Verification</h2>
        <p style="color: #374151; font-size: 15px; margin-bottom: 28px; text-align: center; line-height: 1.6; font-family: 'Inter', sans-serif;">
          HirenextAI detected a login attempt to your administrator account. Enter the verification code below to continue. This code is valid for <strong>5 minutes</strong>.
        </p>
        
        <div style="background-color: #FFFFFF; border: 1.5px solid #E5E7EB; padding: 24px 16px; border-radius: 16px; text-align: center; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
          <span style="font-size: 44px; font-weight: 800; color: #111827; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 10px; padding-left: 10px;">
            ${otp}
          </span>
        </div>
        
        <p style="color: #6B7280; font-size: 13px; text-align: center; line-height: 1.5; margin-top: 28px; font-family: 'Inter', sans-serif;">
          If you did not request this verification code, please ignore this email or notify security immediately.
        </p>
      `)
    };
  }

  if (templateName === 'Diagnostics Test') {
    return {
      subject: 'HirenextAI SMTP Diagnostics Test Email ✉️',
      html: wrapEmailContent(`
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 800; text-align: center; font-family: 'Inter', system-ui, -apple-system, sans-serif;">SMTP Diagnostics Test</h2>
        <p style="color: #374151; font-size: 15px; margin-bottom: 28px; text-align: center; line-height: 1.6; font-family: 'Inter', sans-serif;">
          This is a test email sent from the HirenextAI Diagnostics Panel. If you received this, your SMTP configuration is fully functional.
        </p>
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 20px; border-radius: 12px; font-size: 13px; color: #374151; font-family: monospace; line-height: 1.5;">
          Timestamp: ${new Date().toLocaleString()}<br/>
          Status: Operational<br/>
          Host: ${process.env.SMTP_HOST || 'mail.reaverhosting.in'}
        </div>
      `)
    };
  }

  return {
    subject: 'Notification from HirenextAI',
    html: wrapEmailContent(`<p>${JSON.stringify(payload)}</p>`)
  };
};

// Main Queue Service containing execution loop and diagnostics
class EmailQueue {
  async addJob({ recipient, templateName, templateVersion = 'v1.2', payload }) {
    if (!require('../config/mailTransport').configured) throw new Error('Email is not configured');
    checkCircuit();

    // 1. Insert job into db queue
    const [resInsert] = await pool.query(
      `INSERT INTO email_queue (recipient, templateName, templateVersion, payload, status, attempts, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'pending', 0, NOW(), NOW())`,
      [recipient, templateName, templateVersion, JSON.stringify(payload)]
    );
    const jobId = resInsert.insertId;

    // 2. Process job immediately inside the request chain and await outcome
    return this.processJob(jobId);
  }

  async processJob(jobId) {
    const start = Date.now();
    let duration = 0;
    
    // Lock job by updating status to processing
    await pool.query(
      "UPDATE email_queue SET status = 'processing', attempts = attempts + 1, updatedAt = NOW() WHERE id = ?",
      [jobId]
    );

    // Fetch job details
    const [jobs] = await pool.query("SELECT * FROM email_queue WHERE id = ?", [jobId]);
    if (jobs.length === 0) {
      throw new Error('Job not found in queue');
    }
    const job = jobs[0];
    const payload = JSON.parse(job.payload);

    console.log('Connecting SMTP...');
    const { transporter } = require('./emailService');
    const { subject, html } = renderEmailContent(job.templateName, payload);

    try {
      const emailPromise = transporter.sendMail({
        from: `"HirenextAI" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'support@hirenextai.com'}>`,
        to: job.recipient,
        subject: subject,
        html: html,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SMTP Timeout (12s)')), 12000);
      });

      const response = await Promise.race([emailPromise, timeoutPromise]);
      duration = Date.now() - start;

      console.log('SMTP Connected.');
      console.log('Sending Email...');
      console.log('SMTP Response:', response.response || 'Success');
      console.log('Email Sent Successfully.');

      // Update queue job status
      await pool.query("UPDATE email_queue SET status = 'sent', updatedAt = NOW() WHERE id = ?", [jobId]);

      // Save delivery log
      await pool.query(
        `INSERT INTO email_delivery_logs (recipient, templateName, templateVersion, status, providerResponse, smtpCode, sendDurationMs)
         VALUES (?, ?, ?, 'Success', ?, '250', ?)`,
        [job.recipient, job.templateName, job.templateVersion, response.response || 'Accepted', duration]
      );

      // Update stats
      smtpStats.lastSuccessAt = new Date();
      smtpStats.totalSendTimeMs += duration;
      smtpStats.totalSentCount++;
      smtpStats.averageSendTimeMs = Math.round(smtpStats.totalSendTimeMs / smtpStats.totalSentCount);
      consecutiveFailures = 0;

      return { success: true, message: 'Email sent successfully' };
    } catch (err) {
      duration = Date.now() - start;
      const classifiedError = classifySmtpError(err.message);

      console.log(`SMTP Failed:`, err.message);

      // Update queue job status to failed
      await pool.query(
        "UPDATE email_queue SET status = 'failed', lastError = ?, updatedAt = NOW() WHERE id = ?",
        [err.message, jobId]
      );

      // Save delivery log
      await pool.query(
        `INSERT INTO email_delivery_logs (recipient, templateName, templateVersion, status, providerResponse, smtpCode, sendDurationMs)
         VALUES (?, ?, ?, 'Failed', ?, ?, ?)`,
        [job.recipient, job.templateName, job.templateVersion, `${classifiedError}: ${err.message}`, classifiedError, duration]
      );

      // Update stats
      smtpStats.lastFailureAt = new Date();
      smtpStats.lastError = err.message;
      consecutiveFailures++;

      // Trip Circuit Breaker if 10 consecutive failures
      if (consecutiveFailures >= 10) {
        circuitStatus = 'OPEN';
        circuitOpenUntil = Date.now() + 5 * 60 * 1000;
        console.error('⚠️ SMTP Circuit Breaker TRIPPED to OPEN due to 10 consecutive failures!');
      }

      throw err;
    }
  }

  async getDiagnostics() {
    const [pendingRows] = await pool.query("SELECT COUNT(*) as count FROM email_queue WHERE status = 'pending'");
    const [processingRows] = await pool.query("SELECT COUNT(*) as count FROM email_queue WHERE status = 'processing'");
    
    let smtpReadyStatus = 'Connected';
    try {
      const { transporter } = require('./emailService');
      await transporter.verify();
    } catch (e) {
      smtpReadyStatus = 'Error';
    }

    return {
      smtpStatus: smtpReadyStatus,
      smtpHost: process.env.SMTP_HOST || 'mail.reaverhosting.in',
      smtpPort: process.env.SMTP_PORT || '587',
      secure: process.env.SMTP_SECURE === 'true' || false,
      lastSuccessfulEmail: smtpStats.lastSuccessAt,
      lastFailedEmail: smtpStats.lastFailureAt,
      queueLength: pendingRows[0].count + processingRows[0].count,
      lastSMTPError: smtpStats.lastError,
      averageSendTime: smtpStats.averageSendTimeMs,
      circuitBreakerStatus: circuitStatus,
      circuitOpenUntil: circuitStatus === 'OPEN' ? new Date(circuitOpenUntil) : null
    };
  }
}

const emailQueue = new EmailQueue();
module.exports = emailQueue;
