/**
 * Base Provider Class for Job Search APIs
 */
class BaseProvider {
  constructor(config = {}) {
    this.name = config.name || 'base';
    this.displayName = config.displayName || 'Base Provider';
    this.apiKey = config.apiKey || null;
    this.appId = config.appId || null;
    this.priority = config.priority || 1;
    this.status = config.status || 'disabled';
  }

  /**
   * Search for jobs matching query and location
   * @param {string} query - Job query
   * @param {string} location - Location filter
   * @returns {Promise<Array>} - Standardized job list
   */
  async searchJobs(query, location) {
    throw new Error('searchJobs() must be implemented by subclass');
  }

  /**
   * Run a health check on the provider
   * @returns {Promise<{ success: boolean, latencyMs: number, error: string|null }>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Validate if the provided key/credentials are correct
   * @param {string} key - API Key
   * @param {string} [appId] - Optional App ID
   * @returns {Promise<boolean>}
   */
  async validateKey(key, appId) {
    throw new Error('validateKey() must be implemented by subclass');
  }

  /**
   * Normalize response details into standard Job format
   * @param {any} data - Raw data from API
   * @returns {Array} - Standardized jobs
   */
  normalizeResponse(data) {
    throw new Error('normalizeResponse() must be implemented by subclass');
  }
}

module.exports = BaseProvider;
