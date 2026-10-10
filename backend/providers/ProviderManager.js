const pool = require('../config/db');
const { decrypt } = require('../utils/cryptoHelper');
const JSearchProvider = require('./JSearchProvider');
const AdzunaProvider = require('./AdzunaProvider');
const RemotiveProvider = require('./RemotiveProvider');
const ArbeitnowProvider = require('./ArbeitnowProvider');
const { generateContent } = require('../services/geminiService');

class ProviderManager {
  /**
   * Instantiate provider class based on DB config
   */
  static createProviderInstance(dbConfig) {
    const decApiKey = dbConfig.apiKey ? decrypt(dbConfig.apiKey) : null;
    const decAppId = dbConfig.appId ? decrypt(dbConfig.appId) : null;

    const config = {
      name: dbConfig.name,
      displayName: dbConfig.displayName,
      apiKey: decApiKey,
      appId: decAppId,
      priority: dbConfig.priority,
      status: dbConfig.status
    };

    switch (dbConfig.name) {
      case 'jsearch':
        return new JSearchProvider(config);
      case 'adzuna':
        return new AdzunaProvider(config);
      case 'remotive':
        return new RemotiveProvider(config);
      case 'arbeitnow':
        return new ArbeitnowProvider(config);
      default:
        return null;
    }
  }

  /**
   * Fetch active providers from DB sorted by priority
   */
  static async getActiveProviders() {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM job_providers WHERE status != "disabled" ORDER BY priority ASC'
      );
      
      if (rows.length === 0) {
        // Fallback: seed-like structure if empty
        return [
          new RemotiveProvider({ name: 'remotive', displayName: 'Remotive', priority: 1, status: 'enabled' }),
          new ArbeitnowProvider({ name: 'arbeitnow', displayName: 'Arbeitnow', priority: 2, status: 'enabled' })
        ];
      }

      return rows
        .map(row => ProviderManager.createProviderInstance(row))
        .filter(p => p !== null);
    } catch (err) {
      console.error('[ProviderManager] Error loading providers from DB:', err.message);
      // Fallback
      return [
        new RemotiveProvider({ name: 'remotive', displayName: 'Remotive', priority: 1, status: 'enabled' }),
        new ArbeitnowProvider({ name: 'arbeitnow', displayName: 'Arbeitnow', priority: 2, status: 'enabled' })
      ];
    }
  }

  /**
   * Query providers with automatic failover and de-duplicate results
   */
  static async getJobs(query, location, userProfileMemory = null) {
    const providers = await this.getActiveProviders();
    let rawJobs = [];
    let activeProviderUsed = null;

    // Failover Loop: find first provider that works
    for (const provider of providers) {
      try {
        console.log(`[ProviderManager] Attempting job search using: ${provider.displayName}`);
        // Log request count in background
        pool.query('UPDATE job_providers SET dailyRequests = dailyRequests + 1 WHERE name = ?', [provider.name])
          .catch(e => console.warn('Daily request log fail:', e.message));

        const startTime = Date.now();
        rawJobs = await provider.searchJobs(query, location);
        const latency = Date.now() - startTime;

        // Log healthy response
        pool.query(
          'UPDATE job_providers SET status = "enabled", latencyMs = ?, healthScore = LEAST(100, healthScore + 5) WHERE name = ?',
          [latency, provider.name]
        ).catch(e => console.warn('Provider latency update fail:', e.message));

        activeProviderUsed = provider.name;
        break; // Successfully got jobs, break failover loop
      } catch (err) {
        console.error(`[ProviderManager] Provider ${provider.displayName} failed:`, err.message);
        
        // Log failure - mark offline and subtract from health score
        pool.query(
          'UPDATE job_providers SET status = "offline", healthScore = GREATEST(0, healthScore - 20) WHERE name = ?',
          [provider.name]
        ).catch(e => console.warn('Provider status offline update fail:', e.message));
      }
    }

    if (rawJobs.length === 0) {
      console.warn('[ProviderManager] All providers failed or returned 0 results.');
      return [];
    }

    // De-duplicate jobs by Title + Company
    const seen = new Set();
    let deduped = [];
    for (const job of rawJobs) {
      const uniqueKey = `${(job.title || '').trim().toLowerCase()}|${(job.company || '').trim().toLowerCase()}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        deduped.push(job);
      }
    }

    // Limit to top 5 jobs for matching and returning
    const targetJobs = deduped.slice(0, 5);

    // Apply match scores using Gemini AI, fallback to heuristic if no profile
    const rankedJobs = await this.applyMatchScoring(targetJobs, userProfileMemory);
    return rankedJobs;
  }

  /**
   * Run Gemini AI score ranking for target jobs
   */
  static async applyMatchScoring(jobs, userProfileMemory) {
    if (!userProfileMemory || Object.keys(userProfileMemory).length === 0) {
      // Fallback: assign simple keyword heuristic if no resume profile exists
      return jobs.map(job => ({
        ...job,
        match: 70,
        matchBreakdown: { resume: 70, skill: 70, experience: 70, salary: 70, location: 70 },
        missingKeywords: [],
        improvements: []
      }));
    }

    try {
      const prompt = `You are a Resume-to-Job Matching Engine for HirenextAI.
Your task is to calculate matching scores for the following job listings based on the user's career profile.

[User Profile Memory]
${JSON.stringify(userProfileMemory)}

[Job Listings to Match]
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company, description: j.description.slice(0, 800), location: j.location })))}

Compare each job's requirements against the User's Profile. Return a JSON array matching the number of jobs.
Strict JSON format response ONLY:
\`\`\`json
[
  {
    "id": "job-id",
    "match": 85,
    "matchBreakdown": {
      "resume": 85,
      "skill": 80,
      "experience": 90,
      "salary": 75,
      "location": 95
    },
    "missingKeywords": ["React Native", "TypeScript"],
    "improvements": ["Mention React Native app project in portfolio"]
  }
]
\`\`\`
Return matching items in the exact order requested. No text before or after the JSON block.`;

      const aiResponse = await generateContent(prompt, { endpoint: '/api/ai/job-match-engine' });
      
      let matchData = [];
      try {
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : aiResponse;
        matchData = JSON.parse(jsonText.trim());
      } catch (parseErr) {
        console.warn('[ProviderManager] AI match scoring JSON parse failed:', parseErr.message);
      }

      return jobs.map(job => {
        const aiScore = matchData.find(item => item.id === job.id);
        if (aiScore) {
          return {
            ...job,
            match: aiScore.match || 50,
            matchBreakdown: aiScore.matchBreakdown || { resume: 50, skill: 50, experience: 50, salary: 50, location: 50 },
            missingKeywords: aiScore.missingKeywords || [],
            improvements: aiScore.improvements || []
          };
        }

        // Heuristic fallback for single job failure
        const skillsString = (userProfileMemory.skills || '').toLowerCase();
        const descLower = job.description.toLowerCase();
        const score = descLower.split(' ').filter(w => w.length > 2 && skillsString.includes(w)).length * 5 + 50;
        const boundedScore = Math.min(95, Math.max(50, score));

        return {
          ...job,
          match: boundedScore,
          matchBreakdown: { resume: boundedScore, skill: boundedScore, experience: boundedScore, salary: boundedScore, location: boundedScore },
          missingKeywords: [],
          improvements: []
        };
      });

    } catch (err) {
      console.error('[ProviderManager] Match scoring AI request error:', err.message);
      // Fallback for all
      return jobs.map(job => ({
        ...job,
        match: 75,
        matchBreakdown: { resume: 75, skill: 75, experience: 75, salary: 75, location: 75 },
        missingKeywords: [],
        improvements: []
      }));
    }
  }
}

module.exports = ProviderManager;
