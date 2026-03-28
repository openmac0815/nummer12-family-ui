const fs = require("node:fs");
const path = require("node:path");
const { appendChatArchive } = require("./archive");
const { callRuntimeBackend, callOllamaBackend, callFallbackBackend } = require("./backends");
const { normalizePersona, PERSONAS } = require("./personas");

function resolveBackendSequence(config) {
  switch (config.backendMode) {
    case "runtime":
      return ["runtime", "ollama", "fallback"];
    case "runtime-only":
      return ["runtime"];
    case "ollama":
      return ["ollama", "fallback"];
    case "fallback":
      return ["fallback"];
    case "auto":
    default:
      return ["runtime", "ollama", "fallback"];
  }
}

function loadPersonaMemory(profilesRoot, persona) {
  if (!profilesRoot) return "";
  const file = path.join(profilesRoot, persona, "memory.md");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

function buildPrompt({ persona, context, message, memory }) {
  const blocks = [
    `Persona: ${persona}`,
    context ? `Client Context:\n${context}` : "",
    memory ? `Profile Memory:\n${memory}` : "",
    `User Message:\n${message}`
  ].filter(Boolean);
  return blocks.join("\n\n");
}

function validateChatRequest(payload = {}) {
  const message = String(payload.message || "").trim();
  if (!message) {
    const error = new Error("message required");
    error.status = 400;
    throw error;
  }

  return {
    message,
    persona: normalizePersona(payload.persona),
    context: String(payload.context || "").trim()
  };
}

function createChatService({ config, archiveRoot, profilesRoot }) {
  async function runBackendChain({ prompt, persona, context, message }) {
    const attempts = [];
    const payload = {
      message,
      persona,
      context,
      session_key: persona,
      thread_id: persona,
      conversation_id: persona,
      source: "nummer12-family-ui"
    };

    for (const backend of resolveBackendSequence(config)) {
      try {
        if (backend === "runtime") {
          const result = await callRuntimeBackend(config.runtime, payload);
          return { ...result, attempts };
        }
        if (backend === "ollama") {
          const result = await callOllamaBackend(config.ollama, prompt);
          return { ...result, attempts };
        }
        if (backend === "fallback") {
          const result = await callFallbackBackend(config.fallback, prompt);
          return { ...result, attempts };
        }
      } catch (error) {
        attempts.push({ backend, error: error.message });
      }
    }

    const summary = attempts.map((entry) => `${entry.backend}: ${entry.error}`).join("; ");
    const error = new Error(summary || "No chat backend available");
    error.status = 502;
    error.attempts = attempts;
    throw error;
  }

  async function chat(payload, options = {}) {
    const { message, persona, context } = validateChatRequest(payload);
    const memory = loadPersonaMemory(profilesRoot, persona);
    const prompt = buildPrompt({ persona, context, message, memory });
    const result = await runBackendChain({ prompt, persona, context, message });

    if (options.archive !== false) {
      appendChatArchive({
        archiveRoot,
        persona,
        entry: {
          ts: new Date().toISOString(),
          persona,
          message,
          context,
          backend: result.backend,
          endpoint: result.endpoint,
          model: result.model || null,
          runtimeSessionId: result.runtimeSessionId || null,
          attempts: result.attempts || [],
          reply: result.reply
        }
      });
    }

    return {
      ...result,
      persona,
      memoryLoaded: Boolean(memory),
      preferredBackendMode: config.backendMode
    };
  }

  async function health() {
    try {
      const result = await chat({ message: "ping", persona: "family", context: "health check" }, { archive: false });
      return {
        ok: true,
        connected: true,
        activeBackend: result.backend,
        endpoint: result.endpoint,
        model: result.model || null,
        preferredBackendMode: config.backendMode,
        supportedPersonas: PERSONAS
      };
    } catch (error) {
      return {
        ok: false,
        connected: false,
        activeBackend: null,
        error: error.message,
        preferredBackendMode: config.backendMode,
        supportedPersonas: PERSONAS
      };
    }
  }

  return {
    chat,
    health,
    validateChatRequest
  };
}

module.exports = {
  createChatService
};
