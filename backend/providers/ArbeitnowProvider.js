const BaseProvider = require('./BaseProvider');

class ArbeitnowProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'arbeitnow',
      displayName: 'Arbeitnow',
      ...config
    });
    // Public API, no key required
  }

  async searchJobs(query, location) {
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Arbeitnow API returned status ${response.status}`);
    }

    const result = await response.json();
    let jobs = result.data || [];

    // Filter jobs client-side based on query and location
    if (query) {
      const q = query.toLowerCase();
      jobs = jobs.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q) ||
        (j.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (location) {
      const loc = location.toLowerCase();
      jobs = jobs.filter(j =>
        (j.location || '').toLowerCase().includes(loc)
      );
    }

    // Limit to top 15 results
    jobs = jobs.slice(0, 15);

    return this.normalizeResponse(jobs);
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      await this.searchJobs('engineer', '');
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        error: null
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  async validateKey() {
    return true; // No key validation required
  }

  normalizeResponse(jobs) {
    const stripHtml = (html) => (html || '').replace(/<\/?[^>]+(>|$)/g, '').trim();

    return jobs.map(job => {
      // Estimate posted time
      let postedTime = 'Recently';
      if (job.created_at) {
        // Arbeitnow created_at is usually a timestamp or date string
        const dateVal = typeof job.created_at === 'number' ? job.created_at * 1000 : job.created_at;
        const diffMs = Date.now() - new Date(dateVal).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        postedTime = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      return {
        id: `arbeitnow-${job.slug}`,
        title: job.title || 'Software Engineer',
        company: job.company_name || 'Technology Company',
        companyLogo: null,
        location: job.location || 'Germany',
        salary: 'Competitive Salary',
        description: stripHtml(job.description) || '',
        url: job.url || '#',
        platform: 'Arbeitnow',
        postedTime: postedTime,
        employmentType: 'Full-time',
        remoteOrHybrid: job.remote ? 'Remote' : 'On-site',
        experience: 'Not Specified',
        companyWebsite: null
      };
    });
  }
}

module.exports = ArbeitnowProvider;
