/**
 * API Pool Manager — Multi-Key Rotation, Load Balancing & Failover
 * 
 * Core engine for managing multiple Gemini API keys with:
 * - Round-robin load balancing
 * - Automatic failover on quota/rate-limit/billing errors
 * - AES-256 encrypted key storage
 * - Per-key usage tracking (requests, tokens, errors)
 * - Cooldown-based recovery for rate-limited keys
 * - Daily/monthly counter resets
 */

const crypto = require('crypto');
const pool = require('../config/db');

// ==========================================
// ENCRYPTION HELPERS (AES-256-CBC)
// ==========================================
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'hirenextai-default-secret-key-32';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ==========================================
// IN-MEMORY STATE
// ==========================================
let keyCache = [];              // Cached API key records from DB
let roundRobinIndex = 0;        // Current round-robin pointer
let lastCacheRefresh = 0;       // Timestamp of last DB sync
const CACHE_TTL = 30 * 1000;    // Refresh from DB every 30 seconds
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown for rate-limited keys

// Errors that should trigger automatic key rotation
const ROTATION_ERRORS = [
  'quota',
  'rate limit',
  'rate_limit',
  'resource_exhausted',
  'resource has been exhausted',
  'billing',
  'exceeded',
  '429',
  '503',
  'unavailable',
  'too many requests',
  'permission denied',
  'api key not valid',
  'api_key_invalid',
];

function isRotatableError(errorMessage) {
  const lower = String(errorMessage).toLowerCase();
  return ROTATION_ERRORS.some(pattern => lower.includes(pattern));
}

// ==========================================
// CACHE MANAGEMENT
// ==========================================

/**
 * Load all active, non-disabled keys from the database
 */
async function refreshKeyCache() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM api_keys WHERE isDisabled = false ORDER BY id ASC'
    );

    // Reset daily counters if needed
    const now = new Date();
    for (const row of rows) {
      // Daily reset check
      if (row.dailyResetAt && new Date(row.dailyResetAt).toDateString() !== now.toDateString()) {
        await pool.query(
          'UPDATE api_keys SET dailyRequests = 0, dailyTokens = 0, dailyResetAt = NOW() WHERE id = ?',
          [row.id]
        );
        row.dailyRequests = 0;
        row.dailyTokens = 0;
      }

      // Monthly reset check
      if (row.monthlyResetAt) {
        const resetDate = new Date(row.monthlyResetAt);
        if (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
          await pool.query(
            'UPDATE api_keys SET monthlyRequests = 0, monthlyTokens = 0, monthlyResetAt = NOW() WHERE id = ?',
            [row.id]
          );
          row.monthlyRequests = 0;
          row.monthlyTokens = 0;
        }
      }

      // Clear expired cooldowns
      if (row.cooldownUntil && new Date(row.cooldownUntil) <= now) {
        await pool.query('UPDATE api_keys SET cooldownUntil = NULL, isActive = true WHERE id = ?', [row.id]);
        row.cooldownUntil = null;
        row.isActive = true;
      }
    }

    keyCache = rows;
    lastCacheRefresh = Date.now();
  } catch (err) {
    console.error('[API Pool] Failed to refresh key cache:', err.message);
  }
}

/**
 * Get cached keys, refreshing from DB if stale
 */
async function getKeys() {
  if (Date.now() - lastCacheRefresh > CACHE_TTL || keyCache.length === 0) {
    await refreshKeyCache();
  }
  return keyCache;
}

// ==========================================
// KEY SELECTION (Round-Robin with Failover)
// ==========================================

/**
 * Get the next available, healthy API key (decrypted)
 * @returns {{ id: number, name: string, provider: string, model: string, customEndpoint: string, decryptedKey: string }} or null
 */
async function getNextKey(preferredProvider = null, preferredModel = null) {
  const keys = await getKeys();
  const now = new Date();

  // Filter to only active keys not in cooldown
  let available = keys.filter(k => {
    if (!k.isActive) return false;
    if (k.isDisabled) return false;
    if (k.cooldownUntil && new Date(k.cooldownUntil) > now) return false;
    return true;
  });

  if (available.length === 0) {
    return null;
  }

  // Attempt to filter by provider and model if requested
  if (preferredProvider) {
    let providerKeys = available.filter(k => k.provider && k.provider.toLowerCase() === preferredProvider.toLowerCase());
    if (preferredModel && providerKeys.length > 0) {
      let modelKeys = providerKeys.filter(k => k.model && k.model.toLowerCase() === preferredModel.toLowerCase());
      if (modelKeys.length > 0) {
        providerKeys = modelKeys;
      }
    }
    if (providerKeys.length > 0) {
      available = providerKeys;
    }
  }

  // Round-robin selection
  roundRobinIndex = roundRobinIndex % available.length;
  const selected = available[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % available.length;

  try {
    return {
      id: selected.id,
      name: selected.name,
      provider: selected.provider,
      model: selected.model,
      customEndpoint: selected.customEndpoint,
      decryptedKey: decrypt(selected.apiKey),
    };
  } catch (decErr) {
    console.error(`[API Pool] Failed to decrypt key ${selected.name}:`, decErr.message);
    // Skip this key and try next
    if (available.length > 1) {
      roundRobinIndex = (roundRobinIndex + 1) % available.length;
      const fallback = available[roundRobinIndex];
      roundRobinIndex = (roundRobinIndex + 1) % available.length;
      try {
        return {
          id: fallback.id,
          name: fallback.name,
          provider: fallback.provider,
          model: fallback.model,
          customEndpoint: fallback.customEndpoint,
          decryptedKey: decrypt(fallback.apiKey),
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Get a specific key for retrying after rotation
 */
async function getAlternativeKey(excludeKeyId, preferredProvider = null, preferredModel = null) {
  const keys = await getKeys();
  const now = new Date();

  let available = keys.filter(k => {
    if (k.id === excludeKeyId) return false;
    if (!k.isActive) return false;
    if (k.isDisabled) return false;
    if (k.cooldownUntil && new Date(k.cooldownUntil) > now) return false;
    return true;
  });

  if (available.length === 0) return null;

  // Attempt to filter by provider and model if requested
  if (preferredProvider) {
    let providerKeys = available.filter(k => k.provider && k.provider.toLowerCase() === preferredProvider.toLowerCase());
    if (preferredModel && providerKeys.length > 0) {
      let modelKeys = providerKeys.filter(k => k.model && k.model.toLowerCase() === preferredModel.toLowerCase());
      if (modelKeys.length > 0) {
        providerKeys = modelKeys;
      }
    }
    if (providerKeys.length > 0) {
      available = providerKeys;
    }
  }

  const selected = available[0]; // Pick first alternative
  try {
    return {
      id: selected.id,
      name: selected.name,
      provider: selected.provider,
      model: selected.model,
      customEndpoint: selected.customEndpoint,
      decryptedKey: decrypt(selected.apiKey),
    };
  } catch {
    return null;
  }
}

// ==========================================
// USAGE REPORTING
// ==========================================

/**
 * Report a successful API call
 */
async function reportSuccess(keyId, { inputTokens = 0, outputTokens = 0, responseTimeMs = 0, userId = null, endpoint = '' } = {}) {
  const totalTokens = inputTokens + outputTokens;
  try {
    await pool.query(
      `UPDATE api_keys SET 
        totalRequests = totalRequests + 1,
        totalTokens = totalTokens + ?,
        dailyRequests = dailyRequests + 1,
        dailyTokens = dailyTokens + ?,
        monthlyRequests = monthlyRequests + 1,
        monthlyTokens = monthlyTokens + ?,
        lastUsedAt = NOW(),
        isActive = true
      WHERE id = ?`,
      [totalTokens, totalTokens, totalTokens, keyId]
    );

    // Log to usage log
    await pool.query(
      'INSERT INTO api_usage_log (apiKeyId, userId, endpoint, inputTokens, outputTokens, responseTimeMs, statusCode) VALUES (?, ?, ?, ?, ?, ?, 200)',
      [keyId, userId, endpoint, inputTokens, outputTokens, responseTimeMs]
    );

    // Update in-memory cache
    const cached = keyCache.find(k => k.id === keyId);
    if (cached) {
      cached.totalRequests = (cached.totalRequests || 0) + 1;
      cached.totalTokens = (cached.totalTokens || 0) + totalTokens;
      cached.dailyRequests = (cached.dailyRequests || 0) + 1;
      cached.dailyTokens = (cached.dailyTokens || 0) + totalTokens;
      cached.monthlyRequests = (cached.monthlyRequests || 0) + 1;
      cached.monthlyTokens = (cached.monthlyTokens || 0) + totalTokens;
      cached.lastUsedAt = new Date();
    }
  } catch (err) {
    console.error('[API Pool] Failed to report success:', err.message);
  }
}

/**
 * Report a failed API call — triggers cooldown if rotatable error
 */
async function reportError(keyId, errorMessage, { userId = null, endpoint = '', responseTimeMs = 0 } = {}) {
  const shouldCooldown = isRotatableError(errorMessage);

  try {
    const updates = [
      'totalErrors = totalErrors + 1',
      'lastErrorAt = NOW()',
      'lastErrorMessage = ?',
    ];
    const params = [String(errorMessage).slice(0, 500)];

    if (shouldCooldown) {
      updates.push('isActive = false');
      updates.push('cooldownUntil = DATE_ADD(NOW(), INTERVAL 1 HOUR)');
      console.warn(`[API Pool] Key #${keyId} placed on 1-hour cooldown: ${errorMessage}`);
    }

    params.push(keyId);
    await pool.query(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log to usage log
    await pool.query(
      'INSERT INTO api_usage_log (apiKeyId, userId, endpoint, responseTimeMs, statusCode, errorMessage) VALUES (?, ?, ?, ?, 500, ?)',
      [keyId, userId, endpoint, responseTimeMs, String(errorMessage).slice(0, 500)]
    );

    // Update in-memory cache
    const cached = keyCache.find(k => k.id === keyId);
    if (cached) {
      cached.totalErrors = (cached.totalErrors || 0) + 1;
      cached.lastErrorAt = new Date();
      cached.lastErrorMessage = String(errorMessage).slice(0, 500);
      if (shouldCooldown) {
        cached.isActive = false;
        cached.cooldownUntil = new Date(Date.now() + COOLDOWN_MS);
      }
    }
  } catch (err) {
    console.error('[API Pool] Failed to report error:', err.message);
  }
}

// ==========================================
// ADMIN OPERATIONS
// ==========================================

/**
 * Get all keys for admin display (masked, with stats)
 */
async function getAllKeysForAdmin() {
  try {
    const [rows] = await pool.query('SELECT * FROM api_keys ORDER BY createdAt ASC');
    return rows.map(row => {
      let maskedKey = '****';
      try {
        const decrypted = decrypt(row.apiKey);
        maskedKey = '****' + decrypted.slice(-6);
      } catch {
        maskedKey = '****[decrypt-error]';
      }
      return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        model: row.model || 'gemini-2.5-flash',
        customEndpoint: row.customEndpoint,
        maskedKey,
        isActive: !!row.isActive,
        isDisabled: !!row.isDisabled,
        totalRequests: row.totalRequests || 0,
        totalTokens: row.totalTokens || 0,
        totalErrors: row.totalErrors || 0,
        dailyRequests: row.dailyRequests || 0,
        dailyTokens: row.dailyTokens || 0,
        monthlyRequests: row.monthlyRequests || 0,
        monthlyTokens: row.monthlyTokens || 0,
        lastUsedAt: row.lastUsedAt,
        lastErrorAt: row.lastErrorAt,
        lastErrorMessage: row.lastErrorMessage,
        cooldownUntil: row.cooldownUntil,
        createdAt: row.createdAt,
      };
    });
  } catch (err) {
    console.error('[API Pool] Failed to get all keys:', err.message);
    return [];
  }
}

/**
 * Add a new API key to the pool
 */
async function addKey(name, apiKey, provider = 'gemini', model = 'gemini-2.5-flash', customEndpoint = null) {
  const encryptedKey = encrypt(apiKey);
  const [result] = await pool.query(
    'INSERT INTO api_keys (name, provider, apiKey, model, customEndpoint, isActive) VALUES (?, ?, ?, ?, ?, true)',
    [name, provider, encryptedKey, model, customEndpoint]
  );
  await refreshKeyCache();
  return result.insertId;
}

/**
 * Remove an API key from the pool
 */
async function removeKey(keyId) {
  await pool.query('DELETE FROM api_keys WHERE id = ?', [keyId]);
  await refreshKeyCache();
}

/**
 * Toggle enable/disable state of an API key
 */
async function toggleKey(keyId) {
  const [rows] = await pool.query('SELECT isDisabled FROM api_keys WHERE id = ?', [keyId]);
  if (rows.length === 0) throw new Error('Key not found');

  const newState = !rows[0].isDisabled;
  await pool.query(
    'UPDATE api_keys SET isDisabled = ?, isActive = ?, cooldownUntil = NULL WHERE id = ?',
    [newState, !newState, keyId]
  );
  await refreshKeyCache();
  return { isDisabled: newState };
}

/**
 * Test an API key by making a small request to the designated provider/model
 */
async function testKey(keyId) {
  const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [keyId]);
  if (rows.length === 0) throw new Error('Key not found');

  const row = rows[0];
  let decryptedKey;
  try {
    decryptedKey = decrypt(row.apiKey);
  } catch {
    return { success: false, error: 'Failed to decrypt key', latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const aiProvider = require('./aiProviderService');
    const result = await aiProvider.callAI(
      row.provider,
      row.model,
      decryptedKey,
      row.customEndpoint,
      [{ role: 'user', content: 'Say "OK" in one word.' }]
    );
    const latencyMs = Date.now() - start;

    return { success: true, response: result.text, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { success: false, error: err.message, latencyMs };
  }
}

/**
 * Get aggregated usage statistics for admin dashboard
 */
async function getUsageStats() {
  try {
    // Today's totals
    const [todayRows] = await pool.query(
      `SELECT 
        COUNT(*) as requests,
        COALESCE(SUM(inputTokens + outputTokens), 0) as tokens,
        SUM(CASE WHEN statusCode != 200 THEN 1 ELSE 0 END) as errors
      FROM api_usage_log
      WHERE DATE(createdAt) = CURDATE()`
    );

    // This month's totals
    const [monthRows] = await pool.query(
      `SELECT 
        COUNT(*) as requests,
        COALESCE(SUM(inputTokens + outputTokens), 0) as tokens,
        SUM(CASE WHEN statusCode != 200 THEN 1 ELSE 0 END) as errors
      FROM api_usage_log
      WHERE MONTH(createdAt) = MONTH(NOW()) AND YEAR(createdAt) = YEAR(NOW())`
    );

    // Daily breakdown for charts (last 30 days)
    const [dailyRows] = await pool.query(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as requests,
        COALESCE(SUM(inputTokens + outputTokens), 0) as tokens,
        SUM(CASE WHEN statusCode != 200 THEN 1 ELSE 0 END) as errors
      FROM api_usage_log
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`
    );

    // Per-key daily breakdown
    const [perKeyRows] = await pool.query(
      `SELECT 
        ak.name as keyName,
        DATE(al.createdAt) as date,
        COUNT(*) as requests,
        COALESCE(SUM(al.inputTokens + al.outputTokens), 0) as tokens
      FROM api_usage_log al
      JOIN api_keys ak ON al.apiKeyId = ak.id
      WHERE al.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY ak.name, DATE(al.createdAt)
      ORDER BY date ASC`
    );

    // Active keys count
    const [activeCount] = await pool.query(
      'SELECT COUNT(*) as cnt FROM api_keys WHERE isActive = true AND isDisabled = false'
    );

    const today = todayRows[0] || { requests: 0, tokens: 0, errors: 0 };
    const month = monthRows[0] || { requests: 0, tokens: 0, errors: 0 };

    return {
      activeKeys: activeCount[0]?.cnt || 0,
      today: {
        requests: today.requests || 0,
        tokens: today.tokens || 0,
        errors: today.errors || 0,
        errorRate: today.requests > 0 ? ((today.errors / today.requests) * 100).toFixed(1) : '0.0',
      },
      month: {
        requests: month.requests || 0,
        tokens: month.tokens || 0,
        errors: month.errors || 0,
        errorRate: month.requests > 0 ? ((month.errors / month.requests) * 100).toFixed(1) : '0.0',
      },
      dailyBreakdown: dailyRows,
      perKeyBreakdown: perKeyRows,
    };
  } catch (err) {
    console.error('[API Pool] Failed to get usage stats:', err.message);
    return {
      activeKeys: 0,
      today: { requests: 0, tokens: 0, errors: 0, errorRate: '0.0' },
      month: { requests: 0, tokens: 0, errors: 0, errorRate: '0.0' },
      dailyBreakdown: [],
      perKeyBreakdown: [],
    };
  }
}

module.exports = {
  encrypt,
  decrypt,
  getNextKey,
  getAlternativeKey,
  reportSuccess,
  reportError,
  isRotatableError,
  refreshKeyCache,
  getAllKeysForAdmin,
  addKey,
  removeKey,
  toggleKey,
  testKey,
  getUsageStats,
};
