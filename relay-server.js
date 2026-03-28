const express = require("express");
require("dotenv").config();

const { readChatConfig } = require("./lib/chat/config");
const { createChatService } = require("./lib/chat/service");
const { resolveStoragePaths, validateStorageLayout } = require("./lib/storage");

const app = express();
const PORT = Number(process.env.NUMMER12_RELAY_PORT || 8090);
const HOST = process.env.NUMMER12_RELAY_HOST || "127.0.0.1";
const TITLE = process.env.NUMMER12_RELAY_TITLE || "nummer12-relay";

const storage = resolveStoragePaths(process.env);
validateStorageLayout(storage);

const chatService = createChatService({
  config: readChatConfig(process.env),
  archiveRoot: storage.archiveRoot,
  profilesRoot: storage.profilesRoot
});

app.use(express.json({ limit: "300kb" }));

app.get("/api/health", async (_req, res) => {
  const status = await chatService.health();
  res.json({
    ...status,
    title: TITLE,
    storage: {
      dataRoot: storage.dataRoot,
      archiveRoot: storage.archiveRoot,
      profilesRoot: storage.profilesRoot
    }
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const result = await chatService.chat(req.body || {});
    return res.json({
      ok: true,
      reply: result.reply,
      backend: result.backend,
      activeBackend: result.backend,
      preferredBackendMode: result.preferredBackendMode,
      persona: result.persona,
      model: result.model || null,
      runtimeSessionId: result.runtimeSessionId || null,
      memoryLoaded: result.memoryLoaded,
      attempts: result.attempts || []
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      error: error.message,
      persona: String(req.body?.persona || "family").toLowerCase(),
      attempts: error.attempts || []
    });
  }
});

app.listen(PORT, HOST, () => {
  const chatConfig = readChatConfig(process.env);
  console.log(`${TITLE} running at http://${HOST}:${PORT}`);
  console.log(`  chat mode: ${chatConfig.backendMode}`);
  console.log(`  runtime backend: ${chatConfig.runtime.baseUrl ? `${chatConfig.runtime.baseUrl}${chatConfig.runtime.apiPath}` : "not configured"}`);
  console.log(`  ollama backend: ${chatConfig.ollama.baseUrl}`);
  console.log(`  fallback backend: ${chatConfig.fallback.apiKey ? "enabled" : "disabled"}`);
  console.log(`  durable data root: ${storage.dataRoot}`);
});
