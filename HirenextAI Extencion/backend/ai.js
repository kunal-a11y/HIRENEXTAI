const db = require('./db');

// Supported model names/details
const PROVIDER_CONFIGS = {
  gemini: {
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    formatPayload: (prompt, systemInstruction, jsonMode) => ({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
    }),
    parseResponse: (data) => {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error(data.error?.message || 'Invalid Gemini API response structure');
    }
  },
  openai: {
    url: () => 'https://api.openai.com/v1/chat/completions',
    formatPayload: (prompt, systemInstruction, jsonMode) => ({
      model: 'gpt-4o-mini',
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: prompt }
      ],
      response_format: jsonMode ? { type: 'json_object' } : undefined
    }),
    parseResponse: (data) => {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      throw new Error(data.error?.message || 'Invalid OpenAI API response structure');
    }
  },
  anthropic: {
    url: () => 'https://api.anthropic.com/v1/messages',
    formatPayload: (prompt, systemInstruction, jsonMode) => ({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      system: systemInstruction || undefined,
      messages: [{ role: 'user', content: prompt }]
    }),
    parseResponse: (data) => {
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      throw new Error(data.error?.message || 'Invalid Anthropic API response structure');
    }
  }
};

/**
 * Update provider statistics in the database
 */
async function updateProviderStats(id, success, latency, errorMsg = '') {
  try {
    const provider = await db.dbGet('SELECT * FROM ai_providers WHERE id = ?', [id]);
    if (!provider) return;

    const requests = provider.requests + 1;
    const errors = success ? provider.errors : provider.errors + 1;
    const health = success ? 'healthy' : 'unhealthy';
    
    // Running average for latency (alpha = 0.2)
    let newLatency = provider.latency;
    if (success) {
      newLatency = provider.latency === 0 ? latency : Math.round((provider.latency * 4 + latency) / 5);
    }

    const lastUsed = new Date().toISOString();
    const lastSuccess = success ? lastUsed : provider.last_success;

    await db.dbRun(`
      UPDATE ai_providers
      SET requests = ?, errors = ?, health = ?, latency = ?, last_used = ?, last_success = ?
      WHERE id = ?
    `, [requests, errors, health, newLatency, lastUsed, lastSuccess, id]);
  } catch (err) {
    console.error('Error updating provider stats in DB:', err);
  }
}

/**
 * Execute AI request using the Smart Router
 */
async function executeAIRequest(prompt, systemInstruction = '', jsonMode = false) {
  // 1. Fetch active providers ordered by priority and health status
  const providers = await db.dbAll(`
    SELECT * FROM ai_providers 
    WHERE status = 'active' AND api_key != '' AND api_key IS NOT NULL
    ORDER BY 
      CASE WHEN health = 'healthy' THEN 0 ELSE 1 END,
      priority ASC,
      latency ASC
  `);

  if (!providers || providers.length === 0) {
    throw new Error('No active AI providers with configured API keys are available. Please update settings in the Owner Panel.');
  }

  // 2. Loop through and try each provider
  for (const provider of providers) {
    const config = PROVIDER_CONFIGS[provider.name];
    if (!config) continue;

    const startTime = Date.now();
    try {
      const url = config.url(provider.api_key);
      const payload = config.formatPayload(prompt, systemInstruction, jsonMode);
      
      const headers = {
        'Content-Type': 'application/json'
      };

      if (provider.name === 'openai') {
        headers['Authorization'] = `Bearer ${provider.api_key}`;
      } else if (provider.name === 'anthropic') {
        headers['x-api-key'] = provider.api_key;
        headers['anthropic-version'] = '2023-06-01';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error ${response.status}`);
      }

      const textOutput = config.parseResponse(data);
      const latency = Date.now() - startTime;

      // Update provider success stats asynchronously
      await updateProviderStats(provider.id, true, latency);

      return textOutput;
    } catch (err) {
      const latency = Date.now() - startTime;
      console.warn(`Provider ${provider.name} failed (Latency: ${latency}ms). Error: ${err.message}`);
      
      // Update provider error stats asynchronously
      await updateProviderStats(provider.id, false, latency, err.message);
      
      // Continue to next provider in loop
    }
  }

  // 3. Fallback: if all active providers failed, try to check if we have any provider at all configured, even inactive?
  // Let's check if the owner has configured ANY key.
  throw new Error('All configured AI keys failed or are currently hitting rate limits. Please check key validity/status in the Owner Panel.');
}

/**
 * Utility: Robustly parse JSON from AI responses (handles ```json markers)
 */
function parseAIJSON(rawText) {
  try {
    // If raw text is empty
    if (!rawText || rawText.trim() === '') return null;
    
    let cleanText = rawText.trim();
    
    // Remove markdown codeblock tags if they exist
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    
    return JSON.parse(cleanText.trim());
  } catch (err) {
    console.error('Failed to parse JSON from AI output:', rawText);
    throw new Error('AI output was not in valid JSON format: ' + err.message);
  }
}

module.exports = {
  executeAIRequest,
  parseAIJSON
};
