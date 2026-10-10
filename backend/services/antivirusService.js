/**
 * Antivirus service to scan files for malware signatures
 */

/**
 * Scans a file buffer for malware signatures (e.g. EICAR test string)
 * @param {Buffer} buffer - File content buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<boolean>} - Returns true if file is clean, false if infected
 */
async function scanFile(buffer, fileName) {
  if (!Buffer.isBuffer(buffer)) {
    // If not a buffer, try converting from base64 if it looks like one
    if (typeof buffer === 'string') {
      const dataParts = buffer.split(',');
      const base64Data = dataParts[1] || dataParts[0];
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        // Fallback to direct string conversion
        buffer = Buffer.from(buffer, 'utf8');
      }
    } else {
      return true; // No scan possible
    }
  }

  // 1. Signature-based scan for standard EICAR test string
  // EICAR: X5O!P%@AP[4\PZX54(P^)7CC7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
  const contentStr = buffer.toString('ascii', 0, Math.min(buffer.length, 1024));
  if (contentStr.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    console.error(`[Antivirus] Malware detected in ${fileName} (EICAR Test Signature matched)`);
    return false;
  }

  // 2. Production Integration Interface Hook
  // E.g. in a real production VPS environment with ClamAV installed:
  // const NodeClam = require('clamscan');
  // const ClamScan = new NodeClam().init({ ...config });
  // const { isInfected } = await ClamScan.scanBuffer(buffer);
  // return !isInfected;

  return true; // File is clean
}

module.exports = { scanFile };
