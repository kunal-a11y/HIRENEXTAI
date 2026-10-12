const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

function load(relative, mocks = {}, env = {}) {
  const filename = path.join(__dirname, '..', relative);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name),
    process: { env }, console, Buffer, URL, Date, setTimeout, clearTimeout,
  }, { filename });
  return module.exports;
}
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const secret = 'test-only-secret-which-is-more-than-32-characters';

test('authentication rejects missing IDs, missing versions and revoked sessions', async () => {
  const pool = { query: async () => [[{ tokenVersion: 4, isSuspended: 0 }]] };
  const auth = load('middleware/auth.js', { '../config/db': pool }, { JWT_SECRET: secret });
  for (const claims of [{}, { id: 1 }, { id: 1, tokenVersion: 3 }, { id: 1, tokenVersion: 4, purpose: 'admin-otp' }]) {
    const res = response(); let passed = false;
    await auth({ headers: { authorization: 'Bearer ' + jwt.sign(claims, secret) } }, res, () => { passed = true; });
    assert.equal(res.statusCode, 401); assert.equal(passed, false);
  }
  let passed = false;
  await auth({ headers: { authorization: 'Bearer ' + jwt.sign({id:1,tokenVersion:4}, secret) } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test('admin access requires MFA and explicit application permission', async () => {
  for (const item of [{mfa:false,permissions:['applications'], expected:403}, {mfa:true,permissions:[],expected:403}, {mfa:true,permissions:['applications'],expected:200}]) {
    const pool = { query: async sql => sql.startsWith('SELECT') ? [[{id:1, role:'admin',tokenVersion:1, adminPermissions:JSON.stringify(item.permissions)}]] : [{}] };
    const admin = load('middleware/admin.js', {
      '../config/db': pool, '../services/securityLogger': { logSecurityEvent: async () => {} },
      '../utils/ipHelper': { getRealIp: () => '127.0.0.1', getOSFromUA: () => 'Test', getGeoLocation: async () => ({}) },
    }, { JWT_SECRET: secret });
    const res = response(); let passed = false;
    await admin({ headers: {authorization:'Bearer '+jwt.sign({id:1,tokenVersion:1,mfa:item.mfa},secret)}, method:'GET',path:'/applications',baseUrl:'/api/admin' }, res, () => { passed = true; });
    assert.equal(res.statusCode,item.expected); assert.equal(passed,item.expected===200);
  }
});

test('OAuth state is browser-bound and single-use', () => {
  const oauth = load('utils/oauthState.js');
  let cookie;
  const res = { cookie(name,value,options) { cookie=`${name}=${value}`; assert.equal(options.httpOnly,true); }, clearCookie() {} };
  const state = oauth.begin({},res,'google');
  assert.equal(oauth.consume({query:{state},headers:{}},res,'google'),null);
  assert.equal(oauth.consume({query:{state},headers:{cookie}},res,'linkedin'),null);
  assert.ok(oauth.consume({query:{state},headers:{cookie}},res,'google'));
  assert.equal(oauth.consume({query:{state},headers:{cookie}},res,'google'),null);
});

test('forwarded headers from an untrusted client do not override the client IP', () => {
  const helper = load('utils/ipHelper.js');
  assert.equal(helper.getRealIp({ip:'192.0.2.1',headers:{'cf-connecting-ip':'1.2.3.4','x-forwarded-for':'1.2.3.4'}}),'192.0.2.1');
});

test('payment verification fails closed when provider credentials are absent', async () => {
  const payments = load('services/payments.js', {'../config/db':{ query:async()=>{throw new Error('Must not query');} }});
  const res = response(); await payments.verifyPayment({body:{},user:{id:1}},res);
  assert.equal(res.statusCode,503);
});

function paymentFixture({ owner = 1, paid = false, providerStatus = 'captured', amount = 14900, emailFails = false } = {}) {
  const updates = []; const emails = []; let committed = false;
  const order = { orderId:'order_abc', userId:owner, planName:'plus',amount:14900,currency:'INR',status:paid?'paid':'pending' };
  const conn = {beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{},release(){},query:async(sql,params)=>{if(sql.startsWith('SELECT'))return [[order]];updates.push({sql,params});return [{}];}};
  const pool = {query:async(sql,params)=>sql.startsWith('SELECT firstName') ? [[{firstName:'Test',email:'test@example.invalid'}]] : [[...(params[1]===owner?[order]:[])]],getConnection:async()=>conn};
  const payments = load('services/payments.js', {'./emailService':{sendPlanPurchaseEmail:async message=>{assert.equal(committed,true);emails.push(message);if(emailFails)throw Error('SMTP unavailable');}},'../config/db':pool,razorpay:class{constructor(){this.payments={fetch:async()=>({order_id:'order_abc',status:providerStatus,amount,currency:'INR'})};}}}, {RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:secret});
  const signature=crypto.createHmac('sha256',secret).update('order_abc|pay_abc').digest('hex');
  const req={user:{id:1},body:{razorpay_order_id:'order_abc',razorpay_payment_id:'pay_abc',razorpay_signature:signature,plan:'pro',planId:3}};
  return {payments,req,updates,emails};
}
test('a valid payment cannot be replayed by a different account', async()=>{
  const {payments,req,updates}=paymentFixture({owner:2});const res=response();await payments.verifyPayment(req,res);
  assert.equal(res.statusCode,404);assert.equal(updates.length,0);
});
test('uncaptured and wrong-amount payments cannot upgrade an account',async()=>{
  for(const options of [{providerStatus:'authorized'},{amount:1}]){
    const {payments,req,updates}=paymentFixture(options);const res=response();await payments.verifyPayment(req,res);
    assert.equal(res.statusCode,400);assert.equal(updates.length,0);
  }
});
test('plan comes from the saved order, never the client request',async()=>{
  const {payments,req,updates}=paymentFixture();const res=response();await payments.verifyPayment(req,res);
  assert.equal(res.statusCode,200);assert.equal(res.body.plan,'plus');
  assert.equal(updates.find(u=>u.sql.startsWith('UPDATE users')).params[0],'plus');
});
test('repeated payment verification does not reapply a subscription',async()=>{
  const {payments,req,updates}=paymentFixture({paid:true});const res=response();await payments.verifyPayment(req,res);
  assert.equal(res.statusCode,200);assert.equal(updates.length,0);
});

test('a formerly hardcoded admin email stays an ordinary user at login', async () => {
  const queries = [];
  const pool = { query: async sql => {
    queries.push(sql);
    if (sql.startsWith('SELECT')) return [[{ id: 1, email: 'demo@hirenextai.com', role: 'user', passwordHash: 'hash', tokenVersion: 1, isSuspended: 0 }]];
    return [{}];
  } };
  const controller = load('controllers/authController.js', {
    '../config/db': pool, bcryptjs: { compare: async () => true },
    '../services/emailService': {}, '../services/securityLogger': { logSecurityEvent: async () => {}, logVerificationEvent: async () => {} },
    '../utils/ipHelper': { getRealIp: () => '127.0.0.1' },
  }, { JWT_SECRET: secret });
  const res = response();
  await controller.login({ body: { email: 'demo@hirenextai.com', password: 'test-password' }, headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.user.role, 'user');
  assert.ok(!queries.some(sql => /SET role/.test(sql)));
});

test('credit checks fail closed when the database is unavailable', async () => {
  const { checkCredits } = load('middleware/checkCredits.js', { '../config/db': { query: async () => { throw new Error('Test database unavailable'); } } });
  const res = response(); let passed = false;
  await checkCredits('dailyAI')({ user: { id: 1 }, body: {} }, res, () => { passed = true; });
  assert.equal(res.statusCode, 503); assert.equal(passed, false);
});

test('yearly checkout uses the server catalog and ignores a forged amount', async () => {
  const orders = []; const writes = [];
  const payments = load('services/payments.js', {
    '../config/db': { query: async (sql, values) => { writes.push(values); return [{}]; } },
    razorpay: class { constructor() { this.orders = { create: async input => { orders.push(input); return { id: 'order_annual', ...input }; } }; } },
  }, { RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: secret });
  const res = response();
  await payments.createOrder({ user: { id: 5 }, body: { planId: 2, billing: 'annual', currency: 'INR', amount: 1 } }, res);
  assert.equal(res.statusCode, 200); assert.equal(orders[0].amount, 142800); assert.equal(writes[0][5], 'annual');
  const invalid = response(); await payments.createOrder({ user: { id: 5 }, body: { planId: 2, billing: 'forever' } }, invalid);
  assert.equal(invalid.statusCode, 400); assert.equal(orders.length, 1);
});

test('OAuth exchange does not expose a token without the browser cookie or on replay', () => {
  const exchange = load('utils/oauthExchange.js'); let cookie;
  const responseWithCookie = { ...response(), cookie(name, value) { cookie = `${name}=${value}`; }, clearCookie() {}, set() {} };
  const code = exchange.issue(responseWithCookie, 'private-token');
  exchange.exchange({ body: { code }, headers: {} }, responseWithCookie);
  assert.equal(responseWithCookie.statusCode, 400);
  const valid = { ...response(), clearCookie() {}, set() {} };
  exchange.exchange({ body: { code }, headers: { cookie } }, valid);
  assert.equal(valid.body.token, 'private-token');
  const replay = { ...response(), set() {} }; exchange.exchange({ body: { code }, headers: { cookie } }, replay);
  assert.equal(replay.statusCode, 400);
});

test('a read-only admin cannot suspend a user or read subscriber emails without permission', async () => {
  const pool = { query: async sql => sql.startsWith('SELECT') ? [[{ id: 1, role: 'admin', tokenVersion: 1, adminPermissions: '["users_view"]' }]] : [{}] };
  const admin = load('middleware/admin.js', {
    '../config/db': pool, '../services/securityLogger': { logSecurityEvent: async () => {} },
    '../utils/ipHelper': { getRealIp: () => '127.0.0.1', getOSFromUA: () => 'Test', getGeoLocation: async () => ({}) },
  }, { JWT_SECRET: secret });
  for (const [method, path, expected] of [['GET', '/users', 200], ['PUT', '/users/5/suspend', 403], ['GET', '/alerts/subscribers', 403]]) {
    const res = response(); let passed = false;
    await admin({ headers: { authorization: 'Bearer ' + jwt.sign({ id: 1, tokenVersion: 1, mfa: true }, secret) }, method, path, baseUrl: '/api/admin' }, res, () => { passed = true; });
    assert.equal(res.statusCode, expected); assert.equal(passed, expected === 200);
  }
});

test('webhooks reject invalid signatures before any database operation', async () => {
  let queried = false;
  const payments = load('services/payments.js', { '../config/db': { query: async () => { queried = true; } } }, { RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: 'webhook-test-only' });
  const res = response();
  await payments.webhook({ rawBody: Buffer.from('{}'), headers: { 'x-razorpay-signature': '0'.repeat(64) }, body: {} }, res);
  assert.equal(res.statusCode, 400); assert.equal(queried, false);
});

test('admin email verification requires a first-factor challenge for the same account', () => {
  const challenge = load('utils/adminChallenge.js', {}, { JWT_SECRET: secret });
  let cookie;
  challenge.issue({ cookie(name, value, options) { cookie = `${name}=${value}`; assert.equal(options.httpOnly, true); } }, { id: 4, email: 'admin@example.test', tokenVersion: 3 });
  for (const scenario of [{ cookie: '', email: 'admin@example.test', expected: 401 }, { cookie, email: 'other@example.test', expected: 401 }, { cookie, email: 'admin@example.test', expected: 200 }]) {
    let passed = false; const res = response();
    challenge.requireChallenge({ headers: { cookie: scenario.cookie }, body: { email: scenario.email } }, res, () => { passed = true; });
    assert.equal(res.statusCode, scenario.expected); assert.equal(passed, scenario.expected === 200);
  }
});


test('model access follows stored plans, rejects unknown models and downgrades expired subscriptions', async () => {
  for (const item of [
    { plan: 'free', model: 'hirenext-pro', status: 403 },
    { plan: 'plus', model: 'hirenext-pro', status: 403 },
    { plan: 'pro', model: 'hirenext-pro', status: 200 },
    { plan: 'free', model: 'hirenext-flash', status: 200 },
    { plan: 'plus', model: 'hirenext-0.1', status: 200 },
    { plan: 'pro', model: 'hirenext-pro', expired: true, status: 403 },
    { plan: 'pro', model: 'unknown-model', status: 400 },
  ]) {
    const pool = { query: async sql => sql.includes('SELECT plan') ? [[{ plan: item.plan, planExpiresAt: item.expired ? '2020-01-01' : null }]] : [[{ count: 0 }]] };
    const { checkCredits } = load('middleware/checkCredits.js', { '../config/db': pool });
    const res = response(); let passed = false;
    await checkCredits('dailyAI')({ user: { id: 1 }, body: { model: item.model, plan: 'ultimate' } }, res, () => { passed = true; });
    assert.equal(res.statusCode, item.status); assert.equal(passed, item.status === 200);
  }
});

 test('purchase confirmation follows commit and is skipped for replay',async()=>{
  for(const paid of [false,true]) {
   const {payments,req,emails}=paymentFixture({paid});const res=response();await payments.verifyPayment(req,res);
   assert.equal(res.statusCode,200);assert.equal(emails.length,paid?0:1);
   if(!paid)assert.equal(emails[0].planName,'plus');
  }
 });
 test('SMTP failure does not undo a verified purchase',async()=>{
  const {payments,req,emails}=paymentFixture({emailFails:true});const res=response();await payments.verifyPayment(req,res);
  assert.equal(res.statusCode,200);assert.equal(res.body.plan,'plus');assert.equal(emails.length,1);
 });
