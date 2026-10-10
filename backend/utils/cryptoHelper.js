const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'hirenextai-default-encryption-secret-key-32chars';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a text string using AES-256-CBC
 * @param {string} text - text to encrypt
 * @returns {string} - encrypted text in format 'iv:ciphertext'
 */
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a text string in format 'iv:ciphertext'
 * @param {string} encryptedText - text to decrypt
 * @returns {string} - decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length < 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CryptoHelper] Decryption failed:', err.message);
    return '';
  }
}

module.exports = {
  encrypt,
  decrypt
};
