const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Call universal AI provider APIs
 * @param {string} provider - gemini, openai, claude, grok, deepseek, openrouter, custom
 * @param {string} model - model name (e.g. gpt-4o, claude-3-5-sonnet, gemini-2.5-flash)
 * @param {string} apiKey - decrypted API key value
 * @param {string} customEndpoint - custom endpoint base URL (for custom provider)
 * @param {Array<{role: string, content: string}>} messages - conversation messages
 * @param {string} systemInstruction - optional system instructions
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number}>}
 */
async function callAI(provider, model, apiKey, customEndpoint, messages, systemInstruction = '') {
  // 1. Google Gemini
  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model || 'gemini-2.5-flash',
      systemInstruction: systemInstruction || undefined,
      generationConfig: {
        maxOutputTokens: 4096
      }
    });

    const contents = messages.map(msg => ({
      role: (msg.role === 'user' || msg.role === 'customer') ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const result = await geminiModel.generateContent({ contents });
    const response = await result.response;
    const text = response.text();

    const usage = response.usageMetadata || {};
    return {
      text: text.trim(),
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0
    };
  }

  // 2. Anthropic Claude (Native Messages API)
  if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet',
        max_tokens: 2048,
        system: systemInstruction || undefined,
        messages: messages.map(msg => ({
          role: (msg.role === 'user' || msg.role === 'customer') ? 'user' : 'assistant',
          content: msg.content
        }))
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return {
      text: text.trim(),
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0
    };
  }

  // 3. OpenAI-Compatible Providers (openai, deepseek, grok, openrouter, custom)
  let baseUrl = 'https://api.openai.com/v1';
  if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com';
  else if (provider === 'grok') baseUrl = 'https://api.x.ai/v1';
  else if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
  else if (provider === 'custom') baseUrl = customEndpoint;

  if (!baseUrl) {
    throw new Error(`Custom endpoint base URL is required for custom OpenAI-compatible provider.`);
  }

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  messages.forEach(msg => {
    const role = (msg.role === 'user' || msg.role === 'customer') ? 'user' : 'assistant';
    formattedMessages.push({ role, content: msg.content });
  });

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: formattedMessages
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.toUpperCase()} API error: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return {
    text: text.trim(),
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0
  };
}

module.exports = { callAI };
