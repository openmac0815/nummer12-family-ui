function normalizeUrl(baseUrl, apiPath) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const pathPart = String(apiPath || "").startsWith("/") ? apiPath : `/${apiPath || ""}`;
  return `${base}${pathPart}`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function extractReply(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload.reply === "string") return payload.reply;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.response === "string") return payload.response;
  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    return String(payload.choices[0].message.content);
  }
  return null;
}

async function getAvailableOllamaModels(config) {
  const url = normalizeUrl(config.baseUrl, "/api/tags");
  const response = await fetch(url, {
    headers: { "content-type": "application/json" }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Ollama tags error (${response.status})`);
  }
  return Array.isArray(payload?.models) ? payload.models.map((model) => model.name).filter(Boolean) : [];
}

async function callRuntimeBackend(config, payload) {
  if (!config.baseUrl) throw new Error("Runtime backend not configured");
  const url = normalizeUrl(config.baseUrl, config.apiPath);
  const { controller, timeout } = withTimeout(config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const details = data?.error || response.status;
      throw new Error(`Runtime backend error (${details})`);
    }
    const reply = extractReply(data);
    if (!reply) throw new Error("Runtime backend returned no reply");
    return {
      reply,
      backend: "runtime",
      endpoint: url,
      model: data?.model || data?.backend || null,
      runtimeSessionId: data?.session_id || data?.thread_id || data?.conversation_id || null,
      runtimePersona: data?.persona || payload.persona || null
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runOllamaGenerate(config, prompt, model) {
  const url = normalizeUrl(config.baseUrl, "/api/generate");
  const { controller, timeout } = withTimeout(config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`Ollama error (${response.status})`);
      error.status = response.status;
      throw error;
    }
    const reply = extractReply(payload);
    if (!reply) throw new Error("Ollama returned no reply");
    return { reply, backend: "ollama", endpoint: url, model };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOllamaBackend(config, prompt) {
  try {
    return await runOllamaGenerate(config, prompt, config.model);
  } catch (error) {
    if (!config.allowModelFallback || error?.status !== 404) throw error;
    const models = await getAvailableOllamaModels(config);
    const fallbackModel = models.find((entry) => entry && entry !== config.model);
    if (!fallbackModel) throw error;
    const result = await runOllamaGenerate(config, prompt, fallbackModel);
    return {
      ...result,
      modelFallbackReason: `Configured model unavailable: ${config.model}`
    };
  }
}

async function callFallbackBackend(config, prompt) {
  if (!config.apiKey) throw new Error("Fallback API key not configured");
  const url = normalizeUrl(config.baseUrl, config.apiPath);
  const { controller, timeout } = withTimeout(config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: "You are nummer12, a warm and helpful home AI assistant." },
          { role: "user", content: prompt }
        ]
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const details = payload?.error?.message || response.status;
      throw new Error(`Fallback API error (${details})`);
    }
    const reply = extractReply(payload);
    if (!reply) throw new Error("Fallback API returned no reply");
    return { reply, backend: "fallback", endpoint: url, model: config.model };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  callRuntimeBackend,
  callOllamaBackend,
  callFallbackBackend
};
