const fs = require('node:fs');
const path = require('node:path');

function postgresOptions(value) {
  if (!value) throw new Error('PostgreSQL connection URL is required');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  if (url.searchParams.get('sslaccept') !== 'strict' || url.searchParams.get('sslmode') !== 'require') {
    throw new Error('PostgreSQL requires strict TLS verification');
  }
  const cert = url.searchParams.get('sslcert') || url.searchParams.get('sslrootcert');
  if (!cert) throw new Error('PostgreSQL trusted CA certificate is required');
  // Parse fields explicitly: pg connectionString SSL parameters can overwrite ssl.
  return {
    host: url.hostname, port: Number(url.port || 5432),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(__dirname, '../prisma', cert), 'utf8') },
    max: 5, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000,
    statement_timeout: 30000, application_name: 'hirenext',
  };
}
module.exports = { postgresOptions };
