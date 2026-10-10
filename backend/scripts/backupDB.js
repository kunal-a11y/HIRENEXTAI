const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
const productionEnvPath = path.join(__dirname, '../.env.production');
const defaultEnvPath = path.join(__dirname, '../.env');
dotenv.config({
  path: fs.existsSync(productionEnvPath) ? productionEnvPath : defaultEnvPath,
});

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'hirenextai';
const backupKey = process.env.BACKUP_ENCRYPTION_KEY || 'aSecureEncryptionKey32CharsLong!!'; // Should be rotated in prod env

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const rawDumpPath = path.join(backupDir, `backup-${dbName}-${timestamp}.sql`);
const encDumpPath = path.join(backupDir, `backup-${dbName}-${timestamp}.enc`);

// Build mysqldump command
const dumpCommand = `mysqldump -h ${dbHost} -u ${dbUser} ${dbPass ? `-p"${dbPass}"` : ''} ${dbName} > "${rawDumpPath}"`;

console.log(`[Backup] Starting database backup for ${dbName}...`);

exec(dumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`[Backup Error] mysqldump failed: ${error.message}`);
    return;
  }
  if (stderr && !stderr.includes('Warning')) {
    console.warn(`[Backup Warning] mysqldump: ${stderr}`);
  }

  console.log(`[Backup] Raw dump created at: ${rawDumpPath}`);
  
  // Encrypt the raw SQL dump file using AES-256-CBC
  try {
    const rawData = fs.readFileSync(rawDumpPath);
    
    // Generate a 16-byte random IV
    const iv = crypto.randomBytes(16);
    // Derive key using sha256 hash of the password
    const key = crypto.createHash('sha256').update(backupKey).digest();
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(rawData);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Store IV at the beginning of the file (16 bytes) followed by encrypted data
    const outputBuffer = Buffer.concat([iv, encrypted]);
    
    fs.writeFileSync(encDumpPath, outputBuffer);
    console.log(`[Backup] Encrypted backup successfully created at: ${encDumpPath}`);
    
    // Remove the plaintext raw file
    fs.unlinkSync(rawDumpPath);
    console.log('[Backup] Cleaned up plaintext raw SQL file.');
  } catch (encErr) {
    console.error(`[Backup Error] Encryption failed: ${encErr.message}`);
    if (fs.existsSync(rawDumpPath)) {
      fs.unlinkSync(rawDumpPath); // Secure cleanup even on failure
    }
  }
});
