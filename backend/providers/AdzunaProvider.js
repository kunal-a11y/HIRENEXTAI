const BaseProvider = require('./BaseProvider');

class AdzunaProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'adzuna',
      displayName: 'Adzuna',
      ...config
    });
  }

  mapCountryCode(location) {
    if (!location) return 'in';
    const loc = location.toLowerCase();
    if (loc.includes('united states') || loc.includes(' usa') || loc.includes(', us') || loc.includes('america')) return 'us';
    if (loc.includes('united kingdom') || loc.includes(' uk') || loc.includes(', uk') || loc.includes('britain') || loc.includes('london')) return 'gb';
    if (loc.includes('canada') || loc.includes(', ca')) return 'ca';
    if (loc.includes('australia') || loc.includes(', au')) return 'au';
    if (loc.includes('germany') || loc.includes(', de')) return 'de';
    if (loc.includes('france') || loc.includes(', fr')) return 'fr';
    return 'in'; // default to India
  }

  async searchJobs(query, location) {
    if (!this.apiKey || !this.appId) {
      throw new Error('Adzuna API key or App ID is missing.');
    }

    const country = this.mapCountryCode(location);
    const what = query;
    const where = location || '';
    
    let url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${this.appId}&app_key=${this.apiKey}&results_per_page=15&what=${encodeURIComponent(what)}`;
    if (where) {
      url += `&where=${encodeURIComponent(where)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Adzuna API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return this.normalizeResponse(result.results || []);
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      if (!this.apiKey || !this.appId) {
        return { success: false, latencyMs: 0, error: 'API key or App ID is not configured.' };
      }
      await this.searchJobs('healthcheck-test-query', 'Bangalore');
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

  async validateKey(key, appId) {
    if (!key || !appId) return false;
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${key}&results_per_page=1&what=test`;
      const response = await fetch(url);
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  normalizeResponse(jobs) {
    const stripHtml = (html) => (html || '').replace(/<\/?[^>]+(>|$)/g, '').trim();

    return jobs.map(job => {
      let salaryStr = '';
      if (job.salary_min && job.salary_max) {
        salaryStr = `₹${job.salary_min.toLocaleString()} - ₹${job.salary_max.toLocaleString()}`;
      } else if (job.salary_min) {
        salaryStr = `From ₹${job.salary_min.toLocaleString()}`;
      }

      // Convert full_time / part_time
      let empType = 'Full-time';
      if (job.contract_time) {
        empType = job.contract_time.replace('_', '-');
        empType = empType.charAt(0).toUpperCase() + empType.slice(1);
      }

      let postedTime = 'Recently';
      if (job.created) {
        const diffMs = Date.now() - new Date(job.created).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        postedTime = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      return {
        id: `adzuna-${job.id}`,
        title: stripHtml(job.title) || 'Software Engineer',
        company: job.company?.display_name || 'Technology Company',
        companyLogo: null,
        location: job.location?.display_name || 'India',
        salary: salaryStr || 'Competitive Salary',
        description: stripHtml(job.description) || '',
        url: job.redirect_url || '#',
        platform: 'Adzuna',
        postedTime: postedTime,
        employmentType: empType,
        remoteOrHybrid: stripHtml(job.description).toLowerCase().includes('remote') ? 'Remote' : 'On-site',
        experience: 'Not Specified',
        companyWebsite: null
      };
    });
  }
}

module.exports = AdzunaProvider;
