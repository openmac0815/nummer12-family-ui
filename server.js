const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TITLE = process.env.TITLE || "nummer12";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://192.168.178.64:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const OLLAMA_MODEL_FALLBACK_TO_FIRST = process.env.OLLAMA_MODEL_FALLBACK_TO_FIRST !== "false";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);

const FALLBACK_API_BASE_URL = process.env.FALLBACK_API_BASE_URL || "https://api.openai.com/v1";
const FALLBACK_API_PATH = process.env.FALLBACK_API_PATH || "/chat/completions";
const FALLBACK_API_KEY = process.env.FALLBACK_API_KEY || "";
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "gpt-4o-mini";
const FALLBACK_TIMEOUT_MS = Number(process.env.FALLBACK_TIMEOUT_MS || 18000);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

const DATA_DIR = path.join(__dirname, "data");
const DASHBOARD_FILE = path.join(__dirname, "config", "dashboard.json");
const FAMILY_FILE = path.join(__dirname, "config", "family.json");
const SHOPPING_FILE = path.join(DATA_DIR, "shopping.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const TOKENS_FILE = path.join(DATA_DIR, "google_tokens.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readDashboardConfig() {
  return readJson(DASHBOARD_FILE, { rooms: [], info: [], quickActions: [] });
}

function readFamilyConfig() {
  return readJson(FAMILY_FILE, { members: [] });
}

function mustHaveHAEnv() {
  if (!process.env.HA_BASE_URL || !process.env.HA_TOKEN) {
    const error = new Error("HA_BASE_URL or HA_TOKEN missing");
    error.status = 500;
    throw error;
  }
}

async function haFetch(endpoint, options = {}) {
  mustHaveHAEnv();
  const base = process.env.HA_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.HA_TOKEN}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(`HA request failed (${response.status})`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
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

function normalizeUrl(baseUrl, apiPath) {
  const base = baseUrl.replace(/\/$/, "");
  const p = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return `${base}${p}`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

async function getAvailableOllamaModels() {
  const url = normalizeUrl(OLLAMA_BASE_URL, "/api/tags");
  const response = await fetch(url, {
    headers: { "content-type": "application/json" }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Ollama tags error (${response.status})`);
  }
  return Array.isArray(payload?.models) ? payload.models.map((model) => model.name).filter(Boolean) : [];
}

async function runOllamaGenerate(message, model) {
  const url = normalizeUrl(OLLAMA_BASE_URL, "/api/generate");
  const { controller, timeout } = withTimeout(OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: message,
        stream: false
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`Ollama error (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const reply = extractReply(payload);
    if (!reply) {
      throw new Error("Ollama returned no reply");
    }

    return { reply, backend: "ollama", endpoint: url, model };
  } finally {
    clearTimeout(timeout);
  }
}

async function ollamaGenerate(message) {
  try {
    return await runOllamaGenerate(message, OLLAMA_MODEL);
  } catch (error) {
    if (!OLLAMA_MODEL_FALLBACK_TO_FIRST || error?.status !== 404) {
      throw error;
    }

    const models = await getAvailableOllamaModels();
    const fallbackModel = models.find((model) => model && model !== OLLAMA_MODEL);
    if (!fallbackModel) {
      throw error;
    }

    const result = await runOllamaGenerate(message, fallbackModel);
    return {
      ...result,
      modelFallbackReason: `Configured model unavailable: ${OLLAMA_MODEL}`
    };
  }
}

async function fallbackGenerate(message) {
  if (!FALLBACK_API_KEY) {
    throw new Error("Fallback API key not configured");
  }

  const url = normalizeUrl(FALLBACK_API_BASE_URL, FALLBACK_API_PATH);
  const { controller, timeout } = withTimeout(FALLBACK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${FALLBACK_API_KEY}`
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        messages: [
          { role: "system", content: "You are nummer12, a warm and helpful home AI assistant." },
          { role: "user", content: message }
        ]
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const details = payload?.error?.message || response.status;
      throw new Error(`Fallback API error (${details})`);
    }

    const reply = extractReply(payload);
    if (!reply) {
      throw new Error("Fallback API returned no reply");
    }

    return { reply, backend: "fallback", endpoint: url, model: FALLBACK_MODEL };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateNummer12Reply(message) {
  try {
    return await ollamaGenerate(message);
  } catch (ollamaError) {
    try {
      const fallback = await fallbackGenerate(message);
      return {
        ...fallback,
        fallbackReason: ollamaError instanceof Error ? ollamaError.message : "Ollama failed"
      };
    } catch (fallbackError) {
      const error = new Error(
        `Ollama failed: ${ollamaError instanceof Error ? ollamaError.message : "unknown"}. Fallback failed: ${fallbackError instanceof Error ? fallbackError.message : "unknown"}`
      );
      error.status = 502;
      throw error;
    }
  }
}

function isLightEntity(state) {
  if (!state?.entity_id) return false;
  const id = String(state.entity_id).toLowerCase();
  const domain = id.split(".")[0];
  const friendly = String(state.attributes?.friendly_name || "").toLowerCase();
  if (domain === "light") return true;
  if (domain === "switch") {
    return id.includes("licht") || id.includes("light") || friendly.includes("licht") || friendly.includes("light");
  }
  return false;
}

let googleTokens = readJson(TOKENS_FILE, null);

function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly"
    ].join(" "),
    access_type: "offline",
    prompt: "consent"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function refreshGoogleToken() {
  if (!googleTokens?.refresh_token) throw new Error("No refresh token stored");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: googleTokens.refresh_token,
      grant_type: "refresh_token"
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Token refresh failed: ${data.error}`);
  googleTokens = { ...googleTokens, ...data, obtained_at: Date.now() };
  writeJson(TOKENS_FILE, googleTokens);
  return googleTokens;
}

async function getValidGoogleToken() {
  if (!googleTokens) throw new Error("Not authenticated with Google");
  const expiresAt = (googleTokens.obtained_at || 0) + (googleTokens.expires_in || 3600) * 1000 - 60000;
  if (Date.now() > expiresAt) await refreshGoogleToken();
  return googleTokens.access_token;
}

async function gcalFetch(endpoint) {
  const token = await getValidGoogleToken();
  const r = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`GCal error: ${data.error?.message || r.status}`);
  return data;
}

app.get("/auth/google", (_req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "GOOGLE_CLIENT_ID not set" });
  res.redirect(getGoogleAuthUrl());
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(`<h2>Auth error: ${error}</h2>`);
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
        code
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    googleTokens = { ...data, obtained_at: Date.now() };
    writeJson(TOKENS_FILE, googleTokens);
    res.send('<h2 style="font-family:sans-serif;color:green">Google Calendar verbunden. Du kannst dieses Fenster schliessen.</h2>');
  } catch (err) {
    res.status(500).send(`<h2>Fehler: ${err.message}</h2>`);
  }
});

app.get("/auth/google/status", (_req, res) => {
  res.json({ connected: !!googleTokens, hasClientId: !!GOOGLE_CLIENT_ID });
});

app.get("/api/calendar/events", async (req, res) => {
  const { timeMin, timeMax } = req.query;
  try {
    const params = new URLSearchParams({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: timeMin || new Date(Date.now() - 7 * 86400000).toISOString(),
      timeMax: timeMax || new Date(Date.now() + 60 * 86400000).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100"
    });
    const data = await gcalFetch(`/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params}`);
    res.json({ ok: true, events: data.items || [] });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message, events: [] });
  }
});

app.get("/api/energy", async (_req, res) => {
  try {
    const allStates = await haFetch("/api/states");
    const energy = {};

    const preferredEntityIds = [
      "sensor.solarnet_power_load_consumed",
      "sensor.solarnet_power_photovoltaics",
      "sensor.byd_battery_box_premium_hv_state_of_charge",
      "sensor.solarnet_power_grid_import",
      "sensor.solarnet_power_grid_export",
      "sensor.smart_meter_ts_65a_3_real_power",
      "sensor.smart_meter_ts_65a_3_real_energy_consumed",
      "sensor.smart_meter_ts_65a_3_real_energy_produced"
    ];

    for (const id of preferredEntityIds) {
      const state = Array.isArray(allStates) ? allStates.find((s) => s.entity_id === id) : null;
      if (state) {
        energy[id] = {
          state: state.state,
          unit: state.attributes?.unit_of_measurement || "",
          friendly_name: state.attributes?.friendly_name || id
        };
      }
    }

    if (Array.isArray(allStates)) {
      for (const s of allStates) {
        const id = s.entity_id;
        if (energy[id]) continue;
        if (id.startsWith("sensor.") && (id.includes("energy") || id.includes("power") || id.includes("solar") || id.includes("battery") || id.includes("grid"))) {
          energy[id] = {
            state: s.state,
            unit: s.attributes?.unit_of_measurement || "",
            friendly_name: s.attributes?.friendly_name || id
          };
        }
      }
    }

    res.json({ ok: true, energy });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message, energy: {} });
  }
});

app.get("/api/shopping", (_req, res) => {
  const list = readJson(SHOPPING_FILE, []);
  res.json({ ok: true, items: list });
});

app.post("/api/shopping", (req, res) => {
  const { text, addedBy } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ ok: false, error: "text required" });
  const list = readJson(SHOPPING_FILE, []);
  const item = { id: Date.now(), text: text.trim(), addedBy: addedBy || "Familie", done: false, createdAt: new Date().toISOString() };
  list.push(item);
  writeJson(SHOPPING_FILE, list);
  res.json({ ok: true, item });
});

app.patch("/api/shopping/:id", (req, res) => {
  const id = Number(req.params.id);
  const list = readJson(SHOPPING_FILE, []);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });
  list[idx] = { ...list[idx], ...req.body };
  writeJson(SHOPPING_FILE, list);
  res.json({ ok: true, item: list[idx] });
});

app.delete("/api/shopping/:id", (req, res) => {
  const id = Number(req.params.id);
  let list = readJson(SHOPPING_FILE, []);
  list = list.filter((i) => i.id !== id);
  writeJson(SHOPPING_FILE, list);
  res.json({ ok: true });
});

app.get("/api/notes/:member", (req, res) => {
  const notes = readJson(NOTES_FILE, {});
  const member = req.params.member;
  res.json({ ok: true, notes: notes[member] || { mood: "", text: "", updatedAt: null } });
});

app.post("/api/notes/:member", (req, res) => {
  const member = req.params.member;
  const notes = readJson(NOTES_FILE, {});
  notes[member] = { ...req.body, updatedAt: new Date().toISOString() };
  writeJson(NOTES_FILE, notes);
  res.json({ ok: true, notes: notes[member] });
});

app.get("/api/health", async (_req, res) => {
  try {
    await haFetch("/api/");
    res.json({ ok: true, title: TITLE, ts: new Date().toISOString() });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.get("/api/nummer12/health", async (_req, res) => {
  try {
    const result = await generateNummer12Reply("ping");
    res.json({
      ok: true,
      connected: true,
      backend: result.backend,
      endpoint: result.endpoint,
      model: result.model || null,
      modelFallbackReason: result.modelFallbackReason || null,
      fallbackReason: result.fallbackReason || null
    });
  } catch (error) {
    res.json({
      ok: false,
      connected: false,
      backend: null,
      error: error.message
    });
  }
});

app.post("/api/nummer12/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context || "";
  if (!message) return res.status(400).json({ ok: false, error: "message required" });

  const fullMessage = context ? `[Kontext: ${context}]\n${message}` : message;

  try {
    const result = await generateNummer12Reply(fullMessage);
    return res.json({
      ok: true,
      reply: result.reply,
      backend: result.backend,
      model: result.model || null,
      modelFallbackReason: result.modelFallbackReason || null,
      fallbackReason: result.fallbackReason || null
    });
  } catch (error) {
    return res.status(error.status || 502).json({ ok: false, error: error.message });
  }
});

app.get("/api/family", (_req, res) => {
  const family = readFamilyConfig();
  res.json({ members: family.members || [] });
});

app.get("/api/dashboard", async (_req, res) => {
  const config = readDashboardConfig();
  let rooms = config.rooms || [];
  const states = {};

  try {
    const allStates = await haFetch("/api/states");
    const lightStates = Array.isArray(allStates) ? allStates.filter(isLightEntity) : [];
    if (lightStates.length > 0) {
      rooms = lightStates
        .map((s) => ({ label: s.attributes?.friendly_name || s.entity_id, entity_id: s.entity_id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    for (const state of Array.isArray(allStates) ? allStates : []) {
      states[state.entity_id] = state;
    }
  } catch {
    // Fallback to config-defined entities if HA bulk fetch fails.
  }

  const entityIds = [...rooms.map((i) => i.entity_id), ...(config.info || []).map((i) => i.entity_id)];

  await Promise.all(
    entityIds.map(async (entityId) => {
      if (states[entityId]) return;
      try {
        states[entityId] = await haFetch(`/api/states/${encodeURIComponent(entityId)}`);
      } catch {
        states[entityId] = null;
      }
    })
  );

  res.json({ config: { ...config, rooms }, states, title: TITLE, ts: new Date().toISOString() });
});

app.post("/api/toggle", async (req, res) => {
  const { entity_id } = req.body || {};
  if (!entity_id) return res.status(400).json({ ok: false, error: "entity_id required" });

  try {
    const currentState = await haFetch(`/api/states/${encodeURIComponent(entity_id)}`);
    if (!isLightEntity(currentState)) {
      return res.status(403).json({ ok: false, error: "not a light entity" });
    }

    const domain = String(entity_id).split(".")[0];
    await haFetch(`/api/services/${domain}/toggle`, {
      method: "POST",
      body: JSON.stringify({ entity_id })
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message, details: error.payload || null });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`${TITLE} home UI running at http://${HOST}:${PORT}`);
  console.log(`  nummer12 chat: Ollama first at ${OLLAMA_BASE_URL}, fallback ${FALLBACK_API_KEY ? "enabled" : "disabled"}`);
  if (!GOOGLE_CLIENT_ID) {
    console.log(`  Google Calendar: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env`);
    console.log(`  Then visit http://localhost:${PORT}/auth/google to connect`);
  }
});
