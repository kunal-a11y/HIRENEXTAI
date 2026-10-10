const REQUIRED_ENV_VARS = ['JWT_SECRET', 'NODE_ENV', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'FRONTEND_URL'];
function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(name => !String(process.env[name] || '').trim());
  if (missing.length) throw new Error('Missing configuration: ' + missing.join(', '));
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) throw new Error('Invalid NODE_ENV');
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL.startsWith('https://')) throw new Error('Production FRONTEND_URL must use HTTPS');
}
module.exports = { validateEnv, REQUIRED_ENV_VARS };
