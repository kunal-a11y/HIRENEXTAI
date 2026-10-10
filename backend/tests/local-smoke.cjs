// Explicitly opt-in local integration checks. Never run against a deployed database.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const env = process.env;
assert.equal(env.NODE_ENV, 'development');
assert.equal(env.DB_NAME, 'hirenextai_local');
assert.equal(env.DB_HOST, '127.0.0.1');
assert.ok(!env.SMTP_HOST, 'Tests require email to be unconfigured');
const base = 'http://127.0.0.1:5000';
const users = [];
let count = 0;
async function request(route, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}
function check(label, result, expected) {
  assert.equal(result.status, expected, label); count++; console.log(`PASS ${label}`);
}
(async () => {
  const db = await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME});
  try {
    let r = await request('/health'); check('database health',r,200); assert.equal(r.data.database,'connected');
    assert.equal(r.data.email,'unavailable'); assert.equal(r.data.gemini,'missing');
    check('protected data requires authentication',await request('/api/applications'),401);
    check('untrusted website origin rejected',await request('/api/plans',{headers:{Origin:'https://untrusted.example'}}),403);
    check('arbitrary extension origin rejected',await request('/api/plans',{headers:{Origin:'chrome-extension://untrusted'}}),403);
    check('localhost origin accepted',await request('/api/plans',{headers:{Origin:'http://localhost:3003'}}),200);
    check('email debug endpoint absent',await request('/api/test-email',{method:'POST',body:{}}),404);
    check('Google unavailable without credentials',await request('/api/auth/google'),503);
    check('forged OAuth callback rejected',await request('/api/auth/google/callback?code=bad&state=bad'),400);
    check('forged LinkedIn callback rejected',await request('/api/auth/linkedin/callback?code=bad&state=bad'),400);
    check('SMS unavailable without credentials',await request('/api/auth/send-otp',{method:'POST',body:{phone:'9999999999'}}),503);
    check('password recovery reports unconfigured email',await request('/api/auth/forgot-password',{method:'POST',body:{email:'local@example.test'}}),503);
    const email = `security-${crypto.randomBytes(8).toString('hex')}@example.test`;
    const password = crypto.randomBytes(24).toString('base64url');
    r = await request('/api/auth/signup',{method:'POST',body:{name:'Local Security Test',email,password,role:'owner',plan:'ultimate'}});
    check('signup works without email service',r,201); users.push(r.data.user.id);
    assert.equal(r.data.user.role,'user'); assert.equal(r.data.user.plan,'free');
    const id = r.data.user.id; let token = r.data.token;
    check('current user loads',await request('/api/auth/me',{token}),200);
    check('normal user cannot access admin panel API',await request('/api/admin/stats',{token}),403);
    check('unconfigured payments cannot be forged',await request('/api/payment/verify',{method:'POST',token,body:{}}),503);
    check('AI reports missing configuration',await request('/api/ai/chat',{method:'POST',token,body:{message:'Hello'}}),503);
    check('versionless token rejected',await request('/api/auth/me',{token:jwt.sign({id},env.JWT_SECRET)}),401);
    check('logout succeeds',await request('/api/auth/logout',{method:'POST',token,body:{}}),200);
    check('logged-out token rejected',await request('/api/auth/me',{token}),401);
    r=await request('/api/auth/login',{method:'POST',body:{email,password}});check('password login works',r,200);token=r.data.token;
    const nextPassword=crypto.randomBytes(24).toString('base64url');
    check('password change succeeds',await request('/api/auth/change-password',{method:'PUT',token,body:{currentPassword:password,newPassword:nextPassword}}),200);
    check('password change revokes previous token',await request('/api/auth/me',{token}),401);
    r=await request('/api/auth/login',{method:'POST',body:{email,password:nextPassword}});check('new password login works',r,200);token=r.data.token;
    await db.query('UPDATE users SET isSuspended = TRUE WHERE id = ?',[id]);
    check('suspended account session rejected',await request('/api/auth/me',{token}),403);
    check('suspended account login rejected',await request('/api/auth/login',{method:'POST',body:{email,password:nextPassword}}),403);
    await db.query("UPDATE users SET isSuspended = FALSE, role = 'admin', adminPermissions = '[]' WHERE id = ?",[id]);
    check('admin session without MFA rejected',await request('/api/admin/stats',{token}),403);
    const [rows]=await db.query('SELECT tokenVersion FROM users WHERE id = ?',[id]);
    const adminToken=jwt.sign({id,tokenVersion:rows[0].tokenVersion,mfa:true},env.JWT_SECRET);
    check('admin without application permission rejected',await request('/api/admin/applications',{token:adminToken}),403);
    check('admin unknown permissions fail closed',await request('/api/admin/api-keys',{token:adminToken}),403);
    await db.query("UPDATE users SET role = 'user' WHERE id = ?",[id]);
    const resetToken=crypto.randomBytes(32).toString('hex');
    await db.query("INSERT INTO auth_tokens (userId, type, tokenHash, expiresAt) VALUES (?, 'password_reset', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))",[id,crypto.createHash('sha256').update(resetToken).digest('hex')]);
    const resetResults=await Promise.all([1,2].map(()=>request('/api/auth/reset-password',{method:'POST',body:{token:resetToken,newPassword:nextPassword}})));
    assert.deepEqual(resetResults.map(r=>r.status).sort(),[200,400]);count++;console.log('PASS concurrent password-reset replay rejected');
    check('password reset revokes prior sessions',await request('/api/auth/me',{token}),401);
    const blocked=[];for(let i=0;i<27;i++) blocked.push((await request('/api/auth/login',{method:'POST',body:{}})).status);
    assert.ok(blocked.includes(429));count++;console.log('PASS login rate limit enforced');
    console.log(`Passed ${count} local integration checks.`);
  } finally {
    for(const id of users){
      for(const table of ['auth_tokens','security_logs','verification_logs','login_audit_logs','ai_usage']) await db.query(`DELETE FROM ${table} WHERE userId = ?`,[id]);
      await db.query('DELETE FROM users WHERE id = ?',[id]);
    }
    await db.end();
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
