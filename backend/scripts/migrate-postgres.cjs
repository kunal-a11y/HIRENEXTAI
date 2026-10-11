// Explicit one-time migration. Refuses to overwrite any destination schema/role.
// Source remains intact; a private JSON snapshot is saved before cloud writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
require('dotenv').config({ path: path.join(root, 'backend/.env.local'), quiet: true });
const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { postgresOptions } = require('../config/postgresOptions');
const tables = require('../../database/postgres/tables.json');
const qi = value => '"' + value.replaceAll('"', '""') + '"';
const schema = 'hirenext';
const role = 'hirenext_app';

async function migrate() {
  if (!process.argv.includes('--apply')) throw new Error('Pass --apply after stopping the local API; destination must be empty.');
  if (!['127.0.0.1', 'localhost'].includes(process.env.DB_HOST) || process.env.DB_NAME !== 'hirenextai_local') throw new Error('Unexpected source database');
  const source = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, timezone: '+05:30' });
  const destination = new Client(postgresOptions(process.env.DIRECT_URL));
  let transaction = false;
  try {
    await destination.connect();
    const existing = await destination.query('SELECT nspname FROM pg_namespace WHERE nspname=$1 UNION ALL SELECT rolname FROM pg_roles WHERE rolname=$2', [schema, role]);
    if (existing.rows.length) throw new Error('Destination application schema or role already exists; refusing to overwrite.');
    await source.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await source.beginTransaction();
    const snapshot = { version: '001_initial', capturedAt: new Date().toISOString(), tables: {} };
    for (const table of tables) {
      const [rows] = await source.query('SELECT * FROM ?? ORDER BY ??', [table.name, table.columns.find(c => c.identity)?.name || table.columns[0].name]);
      snapshot.tables[table.name] = rows;
    }
    await source.commit();
    const folder = path.join(root, '.local/backups'); fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'mysql-before-postgres-' + Date.now() + '.json'), JSON.stringify(snapshot));
    const password = crypto.randomBytes(36).toString('hex');
    const runtime = new URL(process.env.DATABASE_URL);
    runtime.username = role + '.' + runtime.username.split('.').slice(1).join('.');
    runtime.password = password;
    runtime.searchParams.set('schema', schema);
    const prepared = path.join(root, '.local/postgres-runtime.env');
    fs.writeFileSync(prepared, `DB_CLIENT=postgres\nDB_SCHEMA=${schema}\nDATABASE_URL="${runtime}"\n`);

    await destination.query('BEGIN'); transaction = true;
    await destination.query(`CREATE SCHEMA ${qi(schema)}; REVOKE ALL ON SCHEMA ${qi(schema)} FROM PUBLIC, anon, authenticated; SET LOCAL search_path TO ${qi(schema)}, pg_catalog; SET LOCAL TIME ZONE 'Asia/Kolkata'`);
    await destination.query(fs.readFileSync(path.join(root, 'database/postgres/001_initial.sql'), 'utf8'));
    for (const table of tables) {
      const rows = snapshot.tables[table.name];
      const columns = table.columns.map(c => c.name);
      for (const row of rows) {
        await destination.query(`INSERT INTO ${qi(table.name)} (${columns.map(qi).join(',')}) VALUES (${columns.map((_, i) => '$' + (i + 1)).join(',')})`, columns.map(c => row[c]));
      }
      const identity = table.columns.find(c => c.identity);
      if (identity) await destination.query(`SELECT setval(pg_get_serial_sequence($1,$2), COALESCE(MAX(${qi(identity.name)}),1), COUNT(*)>0) FROM ${qi(table.name)}`, [`${schema}.${table.name}`, identity.name]);
      const result = await destination.query(`SELECT COUNT(*) n FROM ${qi(table.name)}`);
      if (Number(result.rows[0].n) !== rows.length) throw new Error('Migration row count mismatch: ' + table.name);
      const copied = await destination.query(`SELECT * FROM ${qi(table.name)} ORDER BY ${qi(identity?.name || columns[0])}`);
      const normalize = records => records.map(row => columns.map(name => {
        const value = row[name];
        if (value === null) return null;
        if (value instanceof Date) return value.toISOString();
        return String(value);
      }));
      if (JSON.stringify(normalize(copied.rows)) !== JSON.stringify(normalize(rows))) throw new Error('Migration content mismatch: ' + table.name);
      console.log(`${table.name}: ${rows.length} rows copied.`);
    }
    // This role can read/write application tables but cannot create/drop schema,
    // access Supabase auth tables, grant roles or bypass row-level security.
    await destination.query(`CREATE ROLE ${qi(role)} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
    await destination.query(`REVOKE ALL ON ALL TABLES IN SCHEMA ${qi(schema)} FROM PUBLIC, anon, authenticated;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${qi(schema)} FROM PUBLIC, anon, authenticated;
      REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${qi(schema)} FROM PUBLIC, anon, authenticated;
      GRANT USAGE ON SCHEMA ${qi(schema)} TO ${qi(role)};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${qi(schema)} TO ${qi(role)};
      REVOKE INSERT, UPDATE, DELETE ON schema_migrations FROM ${qi(role)};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${qi(schema)} TO ${qi(role)};
      GRANT EXECUTE ON FUNCTION touch_updated_at() TO ${qi(role)}`);
    await destination.query('COMMIT'); transaction = false;
    console.log('Migration committed. Local MySQL preserved. Private runtime config: .local/postgres-runtime.env');
  } finally {
    if (transaction) await destination.query('ROLLBACK');
    await source.end(); await destination.end();
  }
}
migrate().catch(error => { console.error('Migration failed:', error.code || 'MIGRATION_ERROR', String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[REDACTED]')); process.exitCode = 1; });
