const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'mail.reaverhosting.in';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'support@hirenextai.com';
const isProd = process.env.NODE_ENV === 'production';
const frontendUrl = (process.env.FRONTEND_URL || 'https://hirenextai.com').replace(/\/$/, '');

const { transporter } = require('../config/mailTransport');

transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP Connection failed:');
    console.error(error.message);
  } else {
    console.log('✅ SMTP Connected');
    console.log('✅ SMTP Authentication Successful');
    console.log('✅ SMTP Server Ready');
  }
});

// SMTP Mail Sender helper with timeout and automatic retries (up to 3 times)
const sendMailWithRetry = async (mailOptions, retries = 3, delays = [2000, 5000, 10000]) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      console.log(`Connecting SMTP (Attempt ${attempt + 1}/${retries})...`);
      
      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SMTP Timeout (12s)')), 12000);
      });

      const response = await Promise.race([emailPromise, timeoutPromise]);
      console.log('SMTP Connected.');
      console.log('Sending Email...');
      console.log('SMTP Response:', response.response || 'Success');
      console.log('Email Sent Successfully.');
      return response;
    } catch (err) {
      attempt++;
      console.log(`SMTP Failed (Attempt ${attempt}/${retries}):`, err.message);
      if (attempt >= retries) {
        throw err;
      }
      const delayMs = delays[attempt - 1] || 2000;
      console.log(`Waiting ${delayMs / 1000}s before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

// A shared premium white HTML template wrapper with logo and soft borders
const wrapEmailContent = (bodyContent) => {
  return `
    <div style="background-color: #F9FAFB; padding: 40px 20px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #374151; min-height: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
        <!-- Header -->
        <div style="padding: 32px 32px 24px; text-align: center; background-color: #FFFFFF; border-bottom: 1px solid #F3F4F6;">
          <a href="https://hirenextai.com" style="text-decoration: none; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 24px; font-weight: 800; color: #111827; display: block; text-align: center;">
            <img src="https://hirenextai.com/assets/logo.png" alt="HirenextAI" width="180" style="display: block; margin: 0 auto; border: 0; width: 180px; height: auto; font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; color: #111827; text-align: center;" />
          </a>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 32px; line-height: 1.6; color: #374151; background-color: #FFFFFF; font-size: 15px;">
          ${bodyContent}
        </div>
        
        <!-- Footer -->
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
};

// Email to support inbox — notification of new ticket
const sendSupportNotification = async ({ name, email, subject, message }) => {
  const tableContent = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 24px; font-size: 20px; font-weight: 700; border-left: 4px solid #000000; padding-left: 12px;">New Support Ticket</h2>
    <p style="color: #555555; font-size: 14px; margin-bottom: 24px;">A user has submitted a request via the HirenextAI Contact Form:</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; color: #000000;">
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; color: #555555; font-weight: 500; width: 100px;">Name</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; font-weight: 600; color: #000000;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; color: #555555; font-weight: 500;">Email</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; color: #000000;"><a href="mailto:${email}" style="color: #000000; text-decoration: underline;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; color: #555555; font-weight: 500;">Subject</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E0E0E0; font-weight: 600; color: #000000;">${subject}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; color: #555555; font-weight: 500; vertical-align: top;">Message</td>
        <td style="padding: 12px 8px; color: #000000; white-space: pre-line; line-height: 1.5;">${message}</td>
      </tr>
    </table>
    <div style="background-color: #F7F7F7; border-left: 3px solid #000000; padding: 16px; border-radius: 8px;">
      <p style="margin: 0; color: #555555; font-size: 13px;">
        You can reply directly to this notification email to respond to the user at their email address: <strong>${email}</strong>.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: 'support@hirenextai.com',
    subject: `[Contact Form] ${subject} — from ${name}`,
    html: wrapEmailContent(tableContent),
    replyTo: email,
  });
};

// Auto-reply email to user confirming their message was received
const sendUserConfirmation = async ({ name, email, subject }) => {
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700;">Hey ${name}, thanks for reaching out! 👋</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px;">
      We've received your request about <strong style="color: #000000;">"${subject}"</strong>.
    </p>
    <div style="background-color: #F7F7F7; border: 1px solid #E0E0E0; padding: 20px; border-radius: 12px; margin-bottom: 28px;">
      <p style="margin: 0 0 8px 0; color: #555555; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Expected Response Time</p>
      <p style="margin: 0; color: #000000; font-size: 15px; font-weight: 600;">
        Within 24 hours on business days
      </p>
    </div>
    <p style="color: #555555; font-size: 15px; margin-bottom: 28px; line-height: 1.6;">
      Our support team will get back to you within 24 hours. While we look into your request, you can check out our Help Center for answers to frequently asked questions.
    </p>
    <div style="text-align: center; margin-bottom: 12px;">
      <a href="${frontendUrl}/help" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Visit Help Center
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `We received your message — HirenextAI Support`,
    html: wrapEmailContent(content),
  });
};

// Password Reset Email
const sendPasswordResetEmail = async ({ firstName, name, email, token }) => {
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const resolvedName = firstName || name || 'there';
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700; text-align: center;">Reset your password</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; text-align: center; line-height: 1.6;">
      Hello ${resolvedName},<br/><br/>
      We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
    </p>
    <div style="text-align: center; margin-bottom: 28px; margin-top: 28px;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Reset Password
      </a>
    </div>
    <p style="color: #555555; font-size: 13px; text-align: center; line-height: 1.5; margin-top: 24px;">
      If you did not request this password reset, please ignore this email or secure your account.
    </p>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `Reset your HirenextAI password 🔐`,
    html: wrapEmailContent(content),
  });
};

// Welcome Onboarding Email
const sendWelcomeEmail = async ({ firstName, name, email }) => {
  const resolvedFirstName = firstName || (name ? name.split(' ')[0] : 'there');
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700;">Hey ${resolvedFirstName}, welcome aboard! 🎉</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">
      Your free account is ready. You have <strong>20 AI credits</strong> to get started. Here is what you can do right now:
    </p>
    <ul style="color: #000000; font-size: 14px; line-height: 1.8; padding-left: 20px; margin-bottom: 28px; list-style-type: none; padding-inline-start: 0;">
      <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
        <span style="position: absolute; left: 0; color: #000000;">🔍</span> <strong>Find jobs with AI</strong> &mdash; Instantly scan and match jobs suited to your profile.
      </li>
      <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
        <span style="position: absolute; left: 0; color: #000000;">📝</span> <strong>Cover letters</strong> &mdash; Write personalized cover letters for every application.
      </li>
      <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
        <span style="position: absolute; left: 0; color: #000000;">📄</span> <strong>Resume optimizer</strong> &mdash; Optimize your resume with industry keywords.
      </li>
      <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
        <span style="position: absolute; left: 0; color: #000000;">🎙️</span> <strong>Mock interviews</strong> &mdash; Practice with AI and get instant feedback.
      </li>
    </ul>
    
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${frontendUrl}/chat" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Go to Dashboard
      </a>
    </div>
    
    <div style="background-color: #F7F7F7; border: 1px solid #E0E0E0; padding: 16px; border-radius: 10px; text-align: center; margin-bottom: 8px;">
      <span style="color: #555555; font-size: 13px;">
        You're on the <strong>Free Plan</strong> &mdash; upgrade anytime for unlimited access.
      </span>
    </div>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `Welcome to HirenextAI! 🚀 Your account is ready`,
    html: wrapEmailContent(content),
  });
};

// Plan Upgrade/Downgrade Confirmation Email
const sendPlanPurchaseEmail = async ({ firstName, name, email, planName, isDowngrade }) => {
  const resolvedFirstName = firstName || (name ? name.split(' ')[0] : 'there');
  const planFeatures = {
    free: [
      '20 AI Credits monthly',
      'Basic AI career chat access',
      'Standard application tracking'
    ],
    pro: [
      'Unlimited AI Cover Letters',
      'Advanced Mock Interview Mode',
      '200 AI Credits per month',
      'Resume optimization analysis',
      'Priority Email Support'
    ],
    max: [
      'Everything in Pro',
      'Unlimited AI Credits',
      'Real-time interview simulator',
      'Direct Job Board integrations',
      '1-on-1 resume feedback sessions'
    ],
    ultimate: [
      'Everything in Max',
      'Dedicated AI Recruiter agent',
      'Personal career coach access',
      'Guaranteed responses within 2 hours',
      'Lifetime system access and updates'
    ]
  };

  const currentFeatures = planFeatures[planName.toLowerCase()] || ['Access to premium AI career features', 'Enhanced credits and limits', 'Priority support'];
  const formattedFeatures = currentFeatures.map(feat => `
    <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
      <span style="position: absolute; left: 0; color: #16A34A;">✓</span> ${feat}
    </li>
  `).join('');

  const statusText = isDowngrade ? 'downgraded' : 'upgraded';
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700;">Hey ${resolvedFirstName}! Your subscription was successfully ${statusText} to ${planName}. 🎉</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">
      Thank you for your update! Your account has been updated successfully. Your new limits and features are active:
    </p>
    
    <div style="background-color: #F7F7F7; border: 1px solid #E0E0E0; padding: 24px; border-radius: 12px; margin-bottom: 28px;">
      <p style="margin: 0 0 12px 0; color: #000000; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What's included in your ${planName} Plan:</p>
      <ul style="color: #000000; font-size: 14px; line-height: 1.6; padding-left: 0; list-style-type: none; margin: 0;">
        ${formattedFeatures}
      </ul>
    </div>
    
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${frontendUrl}/chat" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Go to Dashboard
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `Your HirenextAI subscription plan is updated ✉️`,
    html: wrapEmailContent(content),
  });
};

// Account Verification Link Email
const sendVerificationEmail = async ({ firstName, name, email, token }) => {
  const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const resolvedName = firstName || name || 'there';
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700; text-align: center;">Verify your email address</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; text-align: center; line-height: 1.6;">
      Hi ${resolvedName},<br/><br/>
      Thank you for choosing HirenextAI! Please click the button below to verify your email address and activate your account.
    </p>
    <div style="text-align: center; margin-bottom: 28px; margin-top: 28px;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Verify Email
      </a>
    </div>
    <p style="color: #555555; font-size: 13px; text-align: center; line-height: 1.5; margin-top: 24px;">
      This link expires in <strong>24 hours</strong>. If you did not sign up for HirenextAI, please ignore this email.
    </p>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `Verify your HirenextAI email ✉️`,
    html: wrapEmailContent(content),
  });
};

// Application Status Changed Email
const sendApplicationStatusEmail = async ({ firstName, email, jobTitle, company, status }) => {
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700;">Application Status Update 💼</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">
      Hey ${firstName},<br/><br/>
      The status of your job application for <strong style="color: #000000;">${jobTitle}</strong> at <strong style="color: #000000;">${company}</strong> has changed to:
    </p>
    
    <div style="background-color: #F7F7F7; border: 1px solid #E0E0E0; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 28px;">
      <span style="font-size: 20px; font-weight: 800; color: #000000; letter-spacing: 0.5px; text-transform: uppercase;">
        ${status}
      </span>
    </div>
    
    <p style="color: #555555; font-size: 15px; margin-bottom: 28px; line-height: 1.6;">
      Log in to your HirenextAI career dashboard to see the latest updates, adjust your tracking, or prepare for any potential interviews!
    </p>
    
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${frontendUrl}/chat" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
        View Application Tracker
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: `Status update: ${jobTitle} at ${company} — HirenextAI`,
    html: wrapEmailContent(content),
  });
};

// Admin OTP Login Code Email
const sendAdminOtpEmail = async ({ email, otp }) => {
  const content = `
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
  `;

  await sendMailWithRetry({
    from: `"HirenextAI Security" <support@hirenextai.com>`,
    to: email,
    subject: `Admin Security Verification Code: ${otp} 🔐`,
    html: wrapEmailContent(content),
  });
};

// Support Ticket Reply Email
const sendSupportReplyEmail = async ({ name, email, subject, originalMessage, replyMessage }) => {
  const content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 4px; font-size: 22px; font-weight: 700;">HirenextAI Support</h2>
    <p style="color: #555555; font-size: 13px; margin-bottom: 24px;">Response to your support ticket</p>
    <p style="color: #000000; font-size: 15px;">Hey ${name},</p>
    
    <div style="background: #F7F7F7; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #E0E0E0; border-left: 3px solid #000000;">
      <p style="color: #555555; font-size: 12px; margin: 0 0 8px;">Your original message:</p>
      <p style="color: #000000; font-size: 13px; margin: 0; font-style: italic;">${originalMessage}</p>
    </div>
    
    <div style="margin: 24px 0;">
      <p style="color: #555555; font-size: 12px; margin: 0 0 8px;">Our response:</p>
      <p style="color: #000000; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${replyMessage}</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"HirenextAI Support" <support@hirenextai.com>',
    to: email,
    subject: `Re: ${subject} — HirenextAI Support`,
    replyTo: 'support@hirenextai.com',
    html: wrapEmailContent(content),
  });
};

// Announcement Email Blast (single send helper)
const sendAnnouncementEmail = async ({ email, firstName, subject, message, ctaText, ctaUrl }) => {
  let content = `
    <h2 style="color: #000000; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700;">Hello ${firstName},</h2>
    <p style="color: #555555; font-size: 15px; margin-bottom: 24px; line-height: 1.6; white-space: pre-line;">
      ${message}
    </p>
  `;
  
  if (ctaText && ctaUrl) {
    content += `
      <div style="text-align: center; margin-bottom: 24px; margin-top: 24px;">
        <a href="${ctaUrl}" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px;">
          ${ctaText}
        </a>
      </div>
    `;
  }

  await transporter.sendMail({
    from: `"HirenextAI" <support@hirenextai.com>`,
    to: email,
    subject: subject,
    html: wrapEmailContent(content),
  });
};

module.exports = {
  transporter,
  sendSupportNotification,
  sendUserConfirmation,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPlanPurchaseEmail,
  sendApplicationStatusEmail,
  sendAdminOtpEmail,
  sendSupportReplyEmail,
  sendAnnouncementEmail
};
