const pool = require('../config/db');
const { transporter } = require('./emailService');

/**
 * Sends a security alert notification to all owner-level administrators
 * @param {string} subject - Brief summary of the alert
 * @param {string} message - Detailed alert content (e.g. offending IP, threat detail)
 */
async function alertOwner(subject, message) {
  try {
    // 1. Get all owners from the database
    const [owners] = await pool.query("SELECT email FROM users WHERE role = 'owner'");
    if (owners.length === 0) {
      console.warn('[Alert Service] No owner found in database to receive alert.');
      return;
    }

    const recipientEmails = owners.map(o => o.email).join(', ');
    
    // 2. Prepare security email body
    const emailHtml = `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; background-color: #FFFFFF; color: #000000; padding: 40px 24px; border: 1px solid #E0E0E0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
        <div style="margin-bottom: 24px; text-align: left; border-bottom: 2px solid #CC0000; padding-bottom: 16px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #CC0000;">⚠️ HirednextAI Security Alert</span>
        </div>
        
        <p style="font-size: 15px; font-weight: 700; color: #000000; margin-bottom: 16px;">Dear Administrator,</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #333333; margin-bottom: 24px;">
          An automated security alert has been triggered on the platform:
        </p>

        <div style="background-color: #F9F9F9; border-left: 4px solid #CC0000; padding: 16px; font-size: 13px; font-family: monospace; line-height: 1.5; color: #111111; margin-bottom: 24px; white-space: pre-wrap;"><strong>Subject:</strong> ${subject}\n\n<strong>Details:</strong>\n${message}</div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #333333; margin-bottom: 24px;">
          Please review the admin logs and take appropriate actions immediately if necessary.
        </p>
        
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 32px 0 24px 0;" />
        
        <div style="font-size: 11px; color: #777777; line-height: 1.6;">
          This is an automated system notification. Please do not reply directly to this email.
        </div>
      </div>
    `;

    // 3. Send email alert
    await transporter.sendMail({
      from: `"HirenextAI Security" <security@hirenextai.com>`,
      to: recipientEmails,
      subject: `[SECURITY ALERT] ${subject}`,
      html: emailHtml
    });
    console.log(`[Alert Service] Security alert sent to owners: ${recipientEmails}`);
  } catch (err) {
    console.error('[Alert Service] Failed to send security alert:', err.message);
  }
}

module.exports = { alertOwner };
