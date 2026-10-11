const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '../.env.local'), quiet: true });
const dialect = process.env.DB_CLIENT || 'mysql';
if (!['mysql', 'postgres'].includes(dialect)) throw new Error('Unsupported DB_CLIENT');
module.exports = dialect === 'postgres' ? require('./postgres') : require('./mysql');
