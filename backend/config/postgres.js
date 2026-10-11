const { Pool, types } = require('pg');
const { postgresOptions } = require('./postgresOptions');
const { compile } = require('./postgresSql');

// mysql2 returned numeric COUNT/int8 values and string DECIMALs. Preserve that
// contract without silently truncating values outside JavaScript's safe range.
const typeOverrides = { getTypeParser(oid, format) {
  if (oid === 20) return value => { const n = Number(value); return Number.isSafeInteger(n) ? n : value; };
  if (oid === 1082) return value => new Date(value + 'T00:00:00+05:30');
  return types.getTypeParser(oid, format);
} };
const native = new Pool({ ...postgresOptions(process.env.DATABASE_URL), types: typeOverrides });
native.on('error', error => console.error('PostgreSQL idle connection error:', error.code || 'CONNECTION_ERROR'));
const schema = process.env.DB_SCHEMA || 'hirenext';
if (!/^hirenext(?:_[a-z0-9_]+)?$/.test(schema)) throw new Error('Invalid application schema');

async function getConnection() {
  const client = await native.connect(); let active = false;
  async function beginTransaction() {
    if (active) throw new Error('Transaction is already active');
    // SET LOCAL survives transaction pooling correctly and cannot leak to another request.
    await client.query(`BEGIN; SET LOCAL search_path TO "${schema}", pg_catalog; SET LOCAL TIME ZONE 'Asia/Kolkata'`);
    active = true;
  }
  async function commit() { if (active) { await client.query('COMMIT'); active = false; } }
  async function rollback() { if (active) { await client.query('ROLLBACK'); active = false; } }
  async function query(sql, params = []) {
    const ownTransaction = !active;
    if (ownTransaction) await beginTransaction();
    try {
      const result = await client.query(compile(sql, params));
      if (ownTransaction) await commit();
      return result.command === 'SELECT' || result.command === 'SHOW'
        ? [result.rows, result.fields]
        : [{ affectedRows: result.rowCount, insertId: result.rows[0]?.id, rows: result.rows }, result.fields];
    } catch (error) {
      if (ownTransaction) await rollback();
      throw error;
    }
  }
  return {
    query, execute: query, beginTransaction, commit, rollback,
    release() { client.release(active ? new Error('Unclosed transaction discarded') : undefined); },
  };
}

module.exports = {
  dialect: 'postgres', getConnection,
  async query(sql, params) { const c = await getConnection(); try { return await c.query(sql, params); } finally { c.release(); } },
  async verifySchema() {
    const [rows] = await this.query('SELECT version FROM schema_migrations WHERE version = ?', ['001_initial']);
    if (!rows.length) throw new Error('PostgreSQL migration 001_initial must be applied before startup');
    return true;
  },
  end: () => native.end(),
};
