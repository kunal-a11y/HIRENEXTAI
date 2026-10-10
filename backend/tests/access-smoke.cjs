const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config({path:require('node:path').join(__dirname,'../.env'),quiet:true});
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const ids=[];let count=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);count++;};
const call=async(path,token,body)=>{const res=await fetch('http://127.0.0.1:5000/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
(async()=>{
 if(process.env.NODE_ENV!=='development'||process.env.DB_NAME!=='hirenextai_local')throw Error('Only run against the local test database.');
 for(let i=0;i<2;i++){const [r]=await db.query("INSERT INTO users(firstName,email,role,plan,tokenVersion) VALUES('Disposable',?,'user','free',1)",[`access-${crypto.randomBytes(8).toString('hex')}@example.invalid`]);ids.push(r.insertId);}
 const token=id=>jwt.sign({id,tokenVersion:1},process.env.JWT_SECRET,{expiresIn:'5m'});
 check((await call('/ai/chat',token(ids[0]),{message:'test',model:'hirenext-pro',plan:'pro'})).status,403);
 await db.query("UPDATE users SET plan='plus' WHERE id=?",[ids[0]]);
 check((await call('/ai/chat',token(ids[0]),{message:'test',model:'hirenext-pro'})).status,403);
 await db.query("UPDATE users SET plan='pro',planExpiresAt=DATE_ADD(NOW(),INTERVAL 1 DAY) WHERE id=?",[ids[0]]);
 const models=await call('/ai/model-settings',token(ids[0]));check(models.data.plan,'pro');
 check(models.data.configs['hirenext-pro'].limits.pro>0,true);
 check((await call('/ai/chat',token(ids[0]),{message:'test',model:'invented'})).status,400);
 await db.query("UPDATE users SET planExpiresAt=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE id=?",[ids[0]]);
 check((await call('/ai/chat',token(ids[0]),{message:'test',model:'hirenext-pro'})).status,403);
 check((await call('/auth/me',token(ids[0]))).data.plan,'free');
 await db.query("UPDATE users SET githubUrl='https://github.com/test-profile-a' WHERE id=?",[ids[0]]);
 check((await call('/user/me',token(ids[0]))).data.githubUrl,'https://github.com/test-profile-a');
 check((await call('/user/me',token(ids[1]))).data.githubUrl,null);
 check((await call('/admin/session',token(ids[1]))).status,403);
 check((await call('/auth/linkedin/connect',null,{})).status,401);
 console.log(`${count} live plan-access and account-isolation checks passed.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{for(const id of ids){await db.query('DELETE FROM security_logs WHERE userId=?',[id]).catch(()=>{});await db.query('DELETE FROM users WHERE id=?',[id]);}await db.end();});
