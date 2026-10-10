const BaseProvider = require('./BaseProvider');

class JSearchProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'jsearch',
      displayName: 'JSearch (RapidAPI)',
      ...config
    });
  }

  async searchJobs(query, location) {
    if (!this.apiKey) {
      throw new Error('JSearch API key is missing.');
    }

    const searchQuery = location ? `${query} in ${location}` : query;
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JSearch API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return this.normalizeResponse(result.data || []);
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      if (!this.apiKey) {
        return { success: false, latencyMs: 0, error: 'API key is not configured.' };
      }
      // Simple lookup query with 1 page to minimize quota usage
      await this.searchJobs('healthcheck-test-query', 'Remote');
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

  async validateKey(key) {
    if (!key) return false;
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=test&page=1&num_pages=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': key,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  normalizeResponse(jobs) {
    return jobs.map(job => {
      let salaryStr = '';
      if (job.job_min_salary && job.job_max_salary) {
        const currency = job.job_salary_currency || '$';
        salaryStr = `${currency}${job.job_min_salary.toLocaleString()} - ${currency}${job.job_max_salary.toLocaleString()}`;
        if (job.job_salary_period) {
          salaryStr += ` per ${job.job_salary_period.toLowerCase()}`;
        }
      } else if (job.job_min_salary) {
        const currency = job.job_salary_currency || '$';
        salaryStr = `From ${currency}${job.job_min_salary.toLocaleString()}`;
      }

      // Estimate location string
      const locParts = [];
      if (job.job_city) locParts.push(job.job_city);
      if (job.job_state) locParts.push(job.job_state);
      if (job.job_country) locParts.push(job.job_country);
      const location = locParts.join(', ') || 'Remote';

      // Estimate posted time
      let postedTime = 'Recently';
      if (job.job_posted_at_datetime_utc) {
        const diffMs = Date.now() - new Date(job.job_posted_at_datetime_utc).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        postedTime = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      return {
        id: `jsearch-${job.job_id}`,
        title: job.job_title || 'Software Engineer',
        company: job.employer_name || 'Technology Company',
        companyLogo: job.employer_logo || null,
        location: location,
        salary: salaryStr || 'Competitive Salary',
        description: job.job_description || '',
        url: job.job_apply_link || '#',
        platform: 'JSearch',
        postedTime: postedTime,
        employmentType: job.job_employment_type || 'Full-time',
        remoteOrHybrid: job.job_is_remote ? 'Remote' : 'On-site',
        experience: job.job_required_experience?.required_experience_in_months
          ? `${Math.ceil(job.job_required_experience.required_experience_in_months / 12)}+ years`
          : 'Not Specified',
        companyWebsite: job.employer_website || null
      };
    });
  }
}

module.exports = JSearchProvider;
