const crypto = require('crypto');
const pool = require('../config/db');

class JobCache {
  constructor() {
    this.memoryCache = new Map();
    this.MEMORY_TTL = 5 * 60 * 1000; // 5 minutes
    this.DB_TTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  _generateKey(query, location) {
    const normalized = `${(query || '').toLowerCase().trim()}|${(location || '').toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async get(query, location) {
    const key = this._generateKey(query, location);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() - cached.timestamp < this.MEMORY_TTL) {
        console.log('[JobCache] Memory cache hit');
        return cached.jobs;
      }
      this.memoryCache.delete(key);
    }

    // Check DB cache
    try {
      const [rows] = await pool.query(
        'SELECT * FROM job_search_cache WHERE cacheKey = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1',
        [key]
      );
      if (rows.length > 0) {
        const jobs = JSON.parse(rows[0].results);
        // Store in memory for faster subsequent access
        this.memoryCache.set(key, { jobs, timestamp: Date.now() });
        console.log('[JobCache] DB cache hit');
        return jobs;
      }
    } catch (dbErr) {
      // Table might not exist yet, silently fail
      console.warn('[JobCache] DB cache lookup failed:', dbErr.message);
    }

    return null;
  }

  async set(query, location, jobs) {
    const key = this._generateKey(query, location);

    // Store in memory
    this.memoryCache.set(key, { jobs, timestamp: Date.now() });

    // Store in DB
    try {
      await pool.query(
        'INSERT INTO job_search_cache (cacheKey, query, location, results, resultCount) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE results = VALUES(results), resultCount = VALUES(resultCount), createdAt = NOW()',
        [key, query || '', location || '', JSON.stringify(jobs), jobs.length]
      );
    } catch (dbErr) {
      console.warn('[JobCache] DB cache write failed:', dbErr.message);
    }
  }

  // Evict stale memory entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, val] of this.memoryCache) {
      if (now - val.timestamp > this.MEMORY_TTL) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Singleton instance
const jobCache = new JobCache();

// Periodic cleanup every 5 minutes
setInterval(() => jobCache.cleanup(), 5 * 60 * 1000);

module.exports = jobCache;
