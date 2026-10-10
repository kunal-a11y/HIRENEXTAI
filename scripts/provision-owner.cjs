// One-time local operator action. Public sign-in never assigns an admin role.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
const pool = require(path.join(root, 'backend/config/db'));
(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Usage: node scripts/provision-owner.cjs approved-owner@example.com');
  if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('This helper is restricted to a local development database.');
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT GET_LOCK('hirenext_initial_owner', 10) AS acquired").then(([rows]) => { if (rows[0].acquired !== 1) throw new Error('Could not acquire setup lock.'); });
    await connection.beginTransaction();
    const [owners] = await connection.query("SELECT id FROM users WHERE role = 'owner' FOR UPDATE");
    if (owners.length) throw new Error('An owner already exists. Use the verified owner dashboard to manage admins.');
    const [users] = await connection.query('SELECT id, passwordHash, isSuspended FROM users WHERE email = ? FOR UPDATE', [email]);
    if (!users.length || !users[0].passwordHash || users[0].isSuspended) throw new Error('First register an active email/password account with this email.');
    await connection.query("UPDATE users SET role = 'owner', tokenVersion = tokenVersion + 1 WHERE id = ?", [users[0].id]);
    await connection.commit();
    console.log('Owner assigned. Sign in again at /admin/login and verify the emailed code.');
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) console.log('Email delivery is not configured. Admin sign-in remains blocked until SMTP is configured; verification is never bypassed.');
  } catch (err) { await connection.rollback(); throw err; }
  finally { await connection.query("SELECT RELEASE_LOCK('hirenext_initial_owner')"); connection.release(); }
})().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => pool.end());
