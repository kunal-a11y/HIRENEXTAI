const BaseProvider = require('./BaseProvider');

class RemotiveProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'remotive',
      displayName: 'Remotive',
      ...config
    });
    // Public API, key is optional/not needed but we mark it enabled/connected
  }

  async searchJobs(query, location) {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=15`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Remotive API returned status ${response.status}`);
    }

    const result = await response.json();
    let jobs = result.jobs || [];

    // Client-side location filtering if specified
    if (location) {
      const locLower = location.toLowerCase();
      jobs = jobs.filter(job => {
        const jobLoc = (job.candidate_required_location || '').toLowerCase();
        return jobLoc.includes(locLower) || locLower.includes(jobLoc) || jobLoc === 'worldwide';
      });
    }

    return this.normalizeResponse(jobs);
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      await this.searchJobs('react', '');
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
    return true; // No credentials required
  }

  normalizeResponse(jobs) {
    const stripHtml = (html) => (html || '').replace(/<\/?[^>]+(>|$)/g, '').trim();

    return jobs.map(job => {
      let postedTime = 'Recently';
      if (job.publication_date) {
        const diffMs = Date.now() - new Date(job.publication_date).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        postedTime = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      return {
        id: `remotive-${job.id}`,
        title: job.title || 'Software Engineer',
        company: job.company_name || 'Remote Company',
        companyLogo: job.company_logo || null,
        location: job.candidate_required_location || 'Remote / Worldwide',
        salary: job.salary || 'Competitive Salary',
        description: stripHtml(job.description) || '',
        url: job.url || '#',
        platform: 'Remotive',
        postedTime: postedTime,
        employmentType: job.job_type || 'Full-time',
        remoteOrHybrid: 'Remote',
        experience: 'Not Specified',
        companyWebsite: null
      };
    });
  }
}

module.exports = RemotiveProvider;
