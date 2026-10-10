const pool = require('../config/db');
const ProviderManager = require('../providers/ProviderManager');
const jobCache = require('../services/jobCache');

/**
 * Search for real jobs using the Job Provider Engine
 * Uses ProviderManager for automatic failover across configured providers
 */
exports.searchJobs = async (req, res) => {
  const { query, location } = req.query;
  const userId = req.user.id;

  if (!query || !query.trim()) {
    return res.status(400).json({ message: 'Search query is required.' });
  }

  try {
    // Check cache first
    const cached = await jobCache.get(query, location);
    if (cached && cached.length > 0) {
      return res.json({
        success: true,
        jobs: cached,
        source: 'cache',
        count: cached.length
      });
    }

    // Fetch user profile for match scoring
    let userProfile = {};
    try {
      const [userRows] = await pool.query(
        'SELECT firstName, lastName, email, phone, linkedinUrl, githubUrl FROM users WHERE id = ?',
        [userId]
      );
      if (userRows.length > 0) {
        userProfile = userRows[0];
      }
    } catch (dbErr) {
      console.warn('[JobController] User profile fetch failed:', dbErr.message);
    }

    // Call real providers via ProviderManager
    const jobs = await ProviderManager.getJobs(query, location, userProfile);

    if (!jobs || jobs.length === 0) {
      return res.json({
        success: true,
        jobs: [],
        source: 'providers',
        count: 0,
        message: 'No matching jobs were found from the currently available providers. Please try different search criteria.'
      });
    }

    // Cache results
    await jobCache.set(query, location, jobs);

    // Save jobs to DB for reference
    for (const job of jobs) {
      try {
        await pool.query(
          'INSERT INTO jobs (title, company, location, description, url, platform, match_score) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE match_score = VALUES(match_score)',
          [job.title, job.company, job.location, (job.description || '').substring(0, 5000), job.url, job.platform, job.match || 0]
        );
      } catch (insertErr) {
        // Silently skip DB cache failures
      }
    }

    res.json({
      success: true,
      jobs,
      source: 'providers',
      count: jobs.length
    });
  } catch (error) {
    console.error('[JobController] Search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Job search temporarily unavailable. Please try again.',
      jobs: []
    });
  }
};

/**
 * Get details for a specific cached job
 */
exports.getJobDetails = async (req, res) => {
  const jobId = req.params.id;

  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Job not found. It may have been removed or expired.' });
    }
    res.json({ success: true, job: rows[0] });
  } catch (error) {
    console.error('[JobController] Job details error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve job details.' });
  }
};
