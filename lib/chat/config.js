function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readChatConfig(env = process.env) {
  return {
    backendMode: String(env.NUMMER12_CHAT_BACKEND_MODE || "runtime").toLowerCase(),
    runtime: {
      baseUrl: env.NUMMER12_RUNTIME_BASE_URL || env.NUMMER12_BASE_URL || "http://127.0.0.1:8080",
      apiPath: env.NUMMER12_RUNTIME_API_PATH || env.NUMMER12_API_PATH || "/api/nummer12/relay",
      apiKey: env.NUMMER12_RUNTIME_API_KEY || env.NUMMER12_API_KEY || "",
      timeoutMs: numberFromEnv(env.NUMMER12_RUNTIME_TIMEOUT_MS, 20000)
    },
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL || "http://192.168.178.64:11434",
      model: env.OLLAMA_MODEL || "qwen2.5:3b",
      allowModelFallback: env.OLLAMA_MODEL_FALLBACK_TO_FIRST !== "false",
      timeoutMs: numberFromEnv(env.OLLAMA_TIMEOUT_MS, 90000)
    },
    fallback: {
      baseUrl: env.FALLBACK_API_BASE_URL || "https://api.openai.com/v1",
      apiPath: env.FALLBACK_API_PATH || "/chat/completions",
      apiKey: env.FALLBACK_API_KEY || "",
      model: env.FALLBACK_MODEL || "gpt-4o-mini",
      timeoutMs: numberFromEnv(env.FALLBACK_TIMEOUT_MS, 18000)
    }
  };
}

module.exports = {
  readChatConfig
};
