const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const { sendWelcomeEmail } = require('../services/emailService');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email || profile._json?.email_verified !== true) {
      return done(new Error('Google account did not provide an email address'), null);
    }
    const firstName = profile.name.givenName || 'User';
    const lastName = profile.name.familyName || '';
    
    // Check if user exists
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let user = rows[0];
    
    if (!user) {
      // Create new user
      const [result] = await db.query(
        'INSERT INTO users (firstName, lastName, email, plan, role, isVerified) VALUES (?, ?, ?, ?, ?, ?)',
        [firstName, lastName, email, 'free', 'user', true]
      );
      const [newRows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newRows[0];
      
      // Send welcome email
      sendWelcomeEmail({ firstName, email })
        .catch((e) => console.error('Welcome email failed:', e.message));
    }
    
    return done(null, user);
  } catch(err) {
    return done(err, null);
  }
}));
