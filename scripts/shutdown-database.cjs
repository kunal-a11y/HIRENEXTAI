const mysql = require('../backend/node_modules/mysql2/promise');
const secrets = require('../.local/database-secrets.json');
(async () => {
  const db = await mysql.createConnection({host:'127.0.0.1',port:3307,user:'root',password:secrets.rootPassword});
  await db.query('SHUTDOWN');
  await db.end();
})().catch(error=>{ console.error(error.message); process.exitCode=1; });
