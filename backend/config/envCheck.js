const REQUIRED_ENV_VARS = ['JWT_SECRET', 'NODE_ENV', 'PORT', 'FRONTEND_URL'];
function validateEnv() {
  // Wasmer managed databases inject DB_USERNAME; existing local installs use DB_USER.
  if (!process.env.DB_USER && process.env.DB_USERNAME) process.env.DB_USER = process.env.DB_USERNAME;
  const databaseVars = process.env.DB_CLIENT === 'postgres' ? ['DATABASE_URL'] : ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = [...REQUIRED_ENV_VARS, ...databaseVars].filter(name => !String(process.env[name] || '').trim());
  if (missing.length) throw new Error('Missing configuration: ' + missing.join(', '));
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) throw new Error('Invalid NODE_ENV');
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL.startsWith('https://')) throw new Error('Production FRONTEND_URL must use HTTPS');
}
module.exports = { validateEnv, REQUIRED_ENV_VARS };
