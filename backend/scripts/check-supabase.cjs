// Read-only connectivity check. Does not create tables or transfer local data.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local'), quiet: true });
const { PrismaClient } = require('@prisma/client');

async function check(name) {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error('Missing connection configuration'), { code: 'MISSING_URL' });
  const url = new URL(value);
  if (url.searchParams.get('sslmode') !== 'require' || url.searchParams.get('sslaccept') !== 'strict') {
    throw Object.assign(new Error('Certificate verification is required'), { code: 'TLS_REQUIRED' });
  }
  const client = new PrismaClient({ datasources: { db: { url: value } } });
  try {
    await client.$queryRaw`SELECT 1 AS connected`;
    console.log(`${name}: connected over verified TLS (read-only check).`);
  } finally {
    await client.$disconnect();
  }
}

(async () => {
  for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
    try { await check(name); }
    catch (error) {
      // Connection errors may contain URLs or credentials; never print them.
      const tlsFailure = /TLS connection|certificate|SSL/i.test(String(error.message));
      const reason = tlsFailure ? 'TLS_CERTIFICATE_ERROR' : (error.errorCode || error.code || 'DATABASE_ERROR');
      console.error(`${name}: connection failed (${reason}). Check project status, password, pooler address, network access and trusted CA.`);
      process.exitCode = 1;
    }
  }
})();
