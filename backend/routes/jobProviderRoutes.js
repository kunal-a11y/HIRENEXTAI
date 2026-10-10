const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const adminMiddleware = require('../middleware/admin');
const { encrypt, decrypt } = require('../utils/cryptoHelper');
const ProviderManager = require('../providers/ProviderManager');

// Helper middleware to restrict to Owner only
const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Owner privileges required.' });
  }
};

/**
 * GET /api/job-providers
 * Retrieve all job search providers with masked credentials
 */
router.get('/', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM job_providers ORDER BY priority ASC');
    const sanitized = rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      apiKey: row.apiKey ? '••••••••••••' : '',
      appId: row.appId ? '••••••••••••' : '',
      priority: row.priority,
      status: row.status,
      latencyMs: row.latencyMs,
      errorRate: row.errorRate,
      dailyRequests: row.dailyRequests,
      healthScore: row.healthScore,
      updatedAt: row.updatedAt
    }));
    res.json({ success: true, providers: sanitized });
  } catch (err) {
    console.error('[JobProviderRoutes] GET error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve job providers.' });
  }
});

/**
 * PUT /api/job-providers/:name
 * Update configuration for a specific provider
 */
router.put('/:name', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name } = req.params;
    const { apiKey, appId, priority, status } = req.body;

    // Check if provider exists
    const [rows] = await pool.query('SELECT * FROM job_providers WHERE name = ?', [name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job provider not found.' });
    }

    let updateFields = ['priority = ?', 'status = ?'];
    let params = [parseInt(priority, 10) || 1, status || 'disabled'];

    if (apiKey && apiKey !== '••••••••••••') {
      updateFields.push('apiKey = ?');
      params.push(encrypt(apiKey));
    } else if (apiKey === '') {
      updateFields.push('apiKey = NULL');
    }

    if (appId && appId !== '••••••••••••') {
      updateFields.push('appId = ?');
      params.push(encrypt(appId));
    } else if (appId === '') {
      updateFields.push('appId = NULL');
    }

    params.push(name);

    await pool.query(
      `UPDATE job_providers SET ${updateFields.join(', ')} WHERE name = ?`,
      params
    );

    // Fetch the updated entry to re-instantiate or return
    const [updatedRows] = await pool.query('SELECT * FROM job_providers WHERE name = ?', [name]);
    const updated = updatedRows[0];

    res.json({
      success: true,
      message: `${updated.displayName} configuration updated successfully.`,
      provider: {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName,
        apiKey: updated.apiKey ? '••••••••••••' : '',
        appId: updated.appId ? '••••••••••••' : '',
        priority: updated.priority,
        status: updated.status,
        latencyMs: updated.latencyMs,
        healthScore: updated.healthScore
      }
    });

  } catch (err) {
    console.error('[JobProviderRoutes] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update job provider.' });
  }
});

/**
 * POST /api/job-providers/:name/test
 * Test provider credentials validation
 */
router.post('/:name/test', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name } = req.params;
    const { apiKey, appId } = req.body;

    const [rows] = await pool.query('SELECT * FROM job_providers WHERE name = ?', [name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job provider not found.' });
    }

    const dbConfig = rows[0];
    
    // Use test credentials if provided, otherwise decrypt DB ones
    let testKey = apiKey;
    if (testKey === '••••••••••••') {
      testKey = dbConfig.apiKey ? decrypt(dbConfig.apiKey) : null;
    }
    let testAppId = appId;
    if (testAppId === '••••••••••••') {
      testAppId = dbConfig.appId ? decrypt(dbConfig.appId) : null;
    }

    const testConfig = {
      ...dbConfig,
      apiKey: testKey,
      appId: testAppId
    };

    const providerInstance = ProviderManager.createProviderInstance(testConfig);
    if (!providerInstance) {
      return res.status(400).json({ error: 'Unsupported provider.' });
    }

    const isValid = await providerInstance.validateKey(testKey, testAppId);
    res.json({ success: true, valid: isValid });

  } catch (err) {
    console.error('[JobProviderRoutes] Test error:', err.message);
    res.status(500).json({ error: `Connection test failed: ${err.message}` });
  }
});

/**
 * POST /api/job-providers/:name/health
 * Trigger immediate health check for a provider
 */
router.post('/:name/health', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name } = req.params;

    const [rows] = await pool.query('SELECT * FROM job_providers WHERE name = ?', [name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job provider not found.' });
    }

    const provider = ProviderManager.createProviderInstance(rows[0]);
    if (!provider) {
      return res.status(400).json({ error: 'Unsupported provider.' });
    }

    const statusReport = await provider.healthCheck();
    
    // Update health and latency metrics in the database
    let newStatus = statusReport.success ? 'enabled' : 'offline';
    // If it was disabled, keep it disabled
    if (rows[0].status === 'disabled') {
      newStatus = 'disabled';
    }

    await pool.query(
      `UPDATE job_providers 
       SET latencyMs = ?, status = ?, healthScore = ?
       WHERE name = ?`,
      [
        statusReport.latencyMs,
        newStatus,
        statusReport.success ? Math.min(100, (rows[0].healthScore || 100) + 10) : Math.max(0, (rows[0].healthScore || 100) - 20),
        name
      ]
    );

    res.json({
      success: true,
      report: statusReport,
      currentStatus: newStatus
    });

  } catch (err) {
    console.error('[JobProviderRoutes] Health check error:', err.message);
    res.status(500).json({ error: `Health check failed: ${err.message}` });
  }
});


/**
 * DELETE /api/job-providers/:name
 * Remove a job provider configuration (Owner only)
 */
router.delete('/:name', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name } = req.params;
    const [result] = await pool.query('DELETE FROM job_providers WHERE name = ?', [name]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Job provider not found.' });
    }
    res.json({ success: true, message: `${name} provider removed.` });
  } catch (err) {
    console.error('[JobProviderRoutes] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete job provider.' });
  }
});

/**
 * POST /api/job-providers/:name/rotate-key
 * Update only the API key for a provider (Owner only)
 */
router.post('/:name/rotate-key', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name } = req.params;
    const { apiKey, appId } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'New API key is required.' });
    }

    const [rows] = await pool.query('SELECT * FROM job_providers WHERE name = ?', [name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job provider not found.' });
    }

    const updates = ['apiKey = ?'];
    const params = [encrypt(apiKey)];

    if (appId) {
      updates.push('appId = ?');
      params.push(encrypt(appId));
    }

    params.push(name);
    await pool.query(`UPDATE job_providers SET ${updates.join(', ')} WHERE name = ?`, params);

    res.json({ success: true, message: `API key rotated for ${name}.` });
  } catch (err) {
    console.error('[JobProviderRoutes] Rotate key error:', err.message);
    res.status(500).json({ error: 'Failed to rotate API key.' });
  }
});

/**
 * GET /api/job-providers/stats
 * Aggregate statistics across all providers (Owner only)
 */
router.get('/stats', adminMiddleware, ownerOnly, async (req, res) => {
  try {
    const [providers] = await pool.query('SELECT name, displayName, dailyRequests, monthlyRequests, latencyMs, healthScore, status FROM job_providers ORDER BY priority ASC');
    
    const totalDailyRequests = providers.reduce((sum, p) => sum + (p.dailyRequests || 0), 0);
    const totalMonthlyRequests = providers.reduce((sum, p) => sum + (p.monthlyRequests || 0), 0);
    const avgLatency = providers.length > 0 
      ? Math.round(providers.reduce((sum, p) => sum + (p.latencyMs || 0), 0) / providers.length)
      : 0;
    const avgHealth = providers.length > 0
      ? Math.round(providers.reduce((sum, p) => sum + (p.healthScore || 0), 0) / providers.length)
      : 0;
    const onlineCount = providers.filter(p => p.status === 'enabled').length;
    const offlineCount = providers.filter(p => p.status === 'offline').length;

    res.json({
      success: true,
      stats: {
        totalDailyRequests,
        totalMonthlyRequests,
        avgLatency,
        avgHealth,
        onlineCount,
        offlineCount,
        totalProviders: providers.length,
        providers
      }
    });
  } catch (err) {
    console.error('[JobProviderRoutes] Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch provider statistics.' });
  }
});

module.exports = router;
