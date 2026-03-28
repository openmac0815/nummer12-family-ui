const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TITLE = process.env.TITLE || "nummer12";

const NUMMER12_BACKEND_URL = process.env.NUMMER12_BACKEND_URL || "";
const NUMMER12_API_KEY = process.env.NUMMER12_API_KEY || "";
const NUMMER12_BACKEND_TIMEOUT_MS = Number(process.env.NUMMER12_BACKEND_TIMEOUT_MS || 45000);

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://192.168.178.64:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const OLLAMA_MODEL_FALLBACK_TO_FIRST = process.env.OLLAMA_MODEL_FALLBACK_TO_FIRST !== "false";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90000);

const FALLBACK_API_BASE_URL = process.env.FALLBACK_API_BASE_URL || "https://api.openai.com/v1";
const FALLBACK_API_PATH = process.env.FALLBACK_API_PATH || "/chat/completions";
const FALLBACK_API_KEY = process.env.FALLBACK_API_KEY || "";
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "gpt-4o-mini";
const FALLBACK_TIMEOUT_MS = Number(process.env.FALLBACK_TIMEOUT_MS || 18000);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

const PERSONAS = ["family", "nina", "martin", "olivia", "yuna", "selma"];
const PRODUCTION_DATA_ROOT = "/mnt/storage/family-ai";
const DATA_ROOT = process.env.DATA_ROOT || PRODUCTION_DATA_ROOT;
const STATE_ROOT = process.env.STATE_ROOT || path.join(DATA_ROOT, "state");
const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(DATA_ROOT, "media");
const ARCHIVE_ROOT = process.env.ARCHIVE_ROOT || path.join(DATA_ROOT, "archive");
const PROFILES_ROOT = process.env.PROFILES_ROOT || path.join(DATA_ROOT, "profiles");
const CACHE_ROOT = process.env.CACHE_ROOT || path.join(DATA_ROOT, "cache");
const LOG_ROOT = process.env.LOG_ROOT || path.join(DATA_ROOT, "logs");
const BACKUP_ROOT = process.env.BACKUP_ROOT || path.join(DATA_ROOT, "backups");
const DROPBOX_ROOT = path.join(DATA_ROOT, "dropbox");
const DASHBOARD_FILE = path.join(__dirname, "config", "dashboard.json");
const FAMILY_FILE = path.join(__dirname, "config", "family.json");
const MEAL_PLAN_FILE = path.join(__dirname, "config", "meal-plan.json");
const CALENDAR_MAP_FILE = path.join(__dirname, "config", "calendar-map.json");
const SHOPPING_FILE = path.join(STATE_ROOT, "shopping.json");
const NOTES_FILE = path.join(STATE_ROOT, "notes.json");
const TOKENS_FILE = path.join(STATE_ROOT, "google_tokens.json");
const DROPBOX_INDEX_FILE = path.join(STATE_ROOT, "dropbox-index.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, typeof fallback === "string" ? fallback : JSON.stringify(fallback, null, 2), "utf8");
  }
}

function ensureStorageLayout() {
  [DATA_ROOT, STATE_ROOT, MEDIA_ROOT, ARCHIVE_ROOT, PROFILES_ROOT, CACHE_ROOT, LOG_ROOT, BACKUP_ROOT, DROPBOX_ROOT].forEach(ensureDir);
  [
    path.join(STATE_ROOT, "sessions"),
    path.join(STATE_ROOT, "summaries"),
    path.join(STATE_ROOT, "reminders"),
    path.join(STATE_ROOT, "inbox"),
    path.join(STATE_ROOT, "health"),
    path.join(STATE_ROOT, "tasks")
  ].forEach(ensureDir);

  PERSONAS.forEach((persona) => {
    ensureDir(path.join(STATE_ROOT, "sessions", persona));
    ensureDir(path.join(STATE_ROOT, "summaries", persona));
    ensureDir(path.join(ARCHIVE_ROOT, persona));
    ensureDir(path.join(PROFILES_ROOT, persona));
    ensureDir(path.join(MEDIA_ROOT, persona));
    ensureDir(path.join(MEDIA_ROOT, persona, "photos"));
    ensureDir(path.join(MEDIA_ROOT, persona, "uploads"));
    ensureDir(path.join(MEDIA_ROOT, persona, "generated"));
    ensureDir(path.join(DROPBOX_ROOT, persona));

    ensureFile(
      path.join(PROFILES_ROOT, persona, "profile.json"),
      {
        id: persona,
        displayName: persona === "family" ? "Familie Wurm" : persona.charAt(0).toUpperCase() + persona.slice(1),
        visibilityDefault: persona === "family" ? "family" : `private:${persona}`,
        mediaRoot: path.join(MEDIA_ROOT, persona),
        dropboxRoot: path.join(DROPBOX_ROOT, persona)
      }
    );

    ensureFile(
      path.join(PROFILES_ROOT, persona, "memory.md"),
      `# ${persona}\n\n- Long-term memory for ${persona}.\n`
    );
  });

  ensureDir(path.join(DROPBOX_ROOT, "general"));
  ensureDir(path.join(DROPBOX_ROOT, "family"));
  ensureFile(DROPBOX_INDEX_FILE, []);
}

function validateStorageLayout() {
  if (!fs.existsSync("/mnt/storage")) {
    throw new Error("External storage mount /mnt/storage is missing");
  }
  ensureStorageLayout();
}

validateStorageLayout();

app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function isValidPersona(persona) {
  return PERSONAS.includes(String(persona || "").toLowerCase());
}

function getPersonaPaths(persona) {
  const id = String(persona || "").toLowerCase();
  return {
    persona: id,
    profileFile: path.join(PROFILES_ROOT, id, "profile.json"),
    memoryFile: path.join(PROFILES_ROOT, id, "memory.md"),
    archiveDir: path.join(ARCHIVE_ROOT, id),
    sessionDir: path.join(STATE_ROOT, "sessions", id),
    summaryDir: path.join(STATE_ROOT, "summaries", id),
    mediaDir: path.join(MEDIA_ROOT, id),
    uploadDir: path.join(MEDIA_ROOT, id, "uploads"),
    photosDir: path.join(MEDIA_ROOT, id, "photos"),
    generatedDir: path.join(MEDIA_ROOT, id, "generated"),
    dropboxDir: path.join(DROPBOX_ROOT, id)
  };
}

function appendNdjson(file, entry) {
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
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

function readMealPlanConfig() {
  return readJson(MEAL_PLAN_FILE, { weekdayMeals: {} });
}

function readCalendarMapConfig() {
  return readJson(CALENDAR_MAP_FILE, {
    hub_account: "mainbernhheimerstrasse12@gmail.com",
    strategy: "hub-and-member-calendars",
    sources: [
      {
        id: GOOGLE_CALENDAR_ID || "primary",
        label: "Familie",
        member_id: "family",
        color: "#6f9b62",
        enabled: true,
        visible: true,
        writable: true,
        accepts_invites: true
      }
    ]
  });
}

function getCalendarSources() {
  const family = readFamilyConfig();
  const familyById = new Map((family.members || []).map((member) => [member.id, member]));
  const config = readCalendarMapConfig();

  return (config.sources || [])
    .filter((source) => source && source.id && source.enabled !== false && source.visible !== false)
    .map((source) => {
      const member = source.member_id ? familyById.get(source.member_id) : null;
      return {
        ...source,
        label: source.label || member?.name || source.id,
        member_name: source.member_id === "family" ? "Familie" : (member?.name || null),
        color: source.color || member?.color || (source.member_id === "family" ? "#6f9b62" : null)
      };
    });
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

function normalizeNummer12Url() {
  if (!NUMMER12_BACKEND_URL) return "";
  return NUMMER12_BACKEND_URL.replace(/\/$/, "");
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

async function nummer12BackendGenerate(message, persona = "family") {
  const url = normalizeNummer12Url();
  if (!url) {
    throw new Error("NUMMER12_BACKEND_URL not configured");
  }
  if (url === `http://127.0.0.1:${PORT}/api/nummer12/relay` || url === `http://localhost:${PORT}/api/nummer12/relay`) {
    throw new Error("NUMMER12_BACKEND_URL points to self relay; direct relay not implemented yet");
  }

  const { controller, timeout } = withTimeout(NUMMER12_BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(NUMMER12_API_KEY ? { authorization: `Bearer ${NUMMER12_API_KEY}`, "x-api-key": NUMMER12_API_KEY } : {})
      },
      body: JSON.stringify({ message, persona })
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      const error = new Error(`Nummer12 backend error (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const reply = extractReply(payload);
    if (!reply) {
      throw new Error("Nummer12 backend returned no reply");
    }

    return { reply, backend: "openclaw-backend", endpoint: url, model: payload?.model || null };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateNummer12Reply(message, persona = "family") {
  try {
    return await nummer12BackendGenerate(message, persona);
  } catch (backendError) {
    try {
      const ollama = await ollamaGenerate(message);
      return {
        ...ollama,
        fallbackReason: backendError instanceof Error ? backendError.message : "Nummer12 backend failed"
      };
    } catch (ollamaError) {
      try {
        const fallback = await fallbackGenerate(message);
        return {
          ...fallback,
          fallbackReason: [backendError, ollamaError]
            .map((error) => error instanceof Error ? error.message : "unknown")
            .join(" | ")
        };
      } catch (fallbackError) {
        const error = new Error(
          `Nummer12 backend failed: ${backendError instanceof Error ? backendError.message : "unknown"}. Ollama failed: ${ollamaError instanceof Error ? ollamaError.message : "unknown"}. Fallback failed: ${fallbackError instanceof Error ? fallbackError.message : "unknown"}`
        );
        error.status = 502;
        throw error;
      }
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

function isShadeEntity(state) {
  if (!state?.entity_id) return false;
  const id = String(state.entity_id).toLowerCase();
  const friendly = String(state.attributes?.friendly_name || "").toLowerCase();
  return id.startsWith("cover.") || id.includes("jalo") || id.includes("shutter") || id.includes("rollladen") || friendly.includes("jalou") || friendly.includes("rollladen") || friendly.includes("shutter");
}

function areaForEntity(entity) {
  const id = String(entity?.entity_id || "").toLowerCase();
  const friendly = String(entity?.attributes?.friendly_name || entity?.label || "").toLowerCase();
  const haystack = `${id} ${friendly}`;

  if (haystack.includes("garten") || haystack.includes("terrasse") || haystack.includes("balkon") || haystack.includes("aussen") || haystack.includes("außen") || haystack.includes("outdoor")) {
    return "aussen";
  }

  if (haystack.includes("schlaf") || haystack.includes("kinder") || haystack.includes("bad og") || haystack.includes("oben") || haystack.includes("og")) {
    return "og";
  }

  return "eg";
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

app.get("/api/calendar/config", (_req, res) => {
  const config = readCalendarMapConfig();
  res.json({
    ok: true,
    hub_account: config.hub_account || "",
    strategy: config.strategy || "hub-and-member-calendars",
    sources: getCalendarSources()
  });
});

app.get("/api/calendar/calendars", async (_req, res) => {
  try {
    const data = await gcalFetch("/users/me/calendarList");
    const calendars = Array.isArray(data.items)
      ? data.items.map((item) => ({
          id: item.id,
          summary: item.summary,
          primary: Boolean(item.primary),
          selected: Boolean(item.selected),
          accessRole: item.accessRole,
          backgroundColor: item.backgroundColor || "",
          foregroundColor: item.foregroundColor || ""
        }))
      : [];
    res.json({ ok: true, calendars });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message, calendars: [] });
  }
});

app.get("/api/calendar/events", async (req, res) => {
  const { timeMin, timeMax } = req.query;
  try {
    const sources = getCalendarSources();
    const start = timeMin || new Date(Date.now() - 7 * 86400000).toISOString();
    const end = timeMax || new Date(Date.now() + 60 * 86400000).toISOString();

    const settled = await Promise.allSettled(
      sources.map(async (source) => {
        const params = new URLSearchParams({
          timeMin: start,
          timeMax: end,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "100"
        });
        const data = await gcalFetch(`/calendars/${encodeURIComponent(source.id)}/events?${params}`);
        const items = Array.isArray(data.items) ? data.items : [];
        return items.map((item) => ({
          ...item,
          calendar_id: source.id,
          calendar_label: source.label,
          member_id: source.member_id || null,
          member_name: source.member_name || null,
          member_color: source.color || null,
          writable: Boolean(source.writable)
        }));
      })
    );

    const events = [];
    const errors = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        events.push(...result.value);
      } else {
        errors.push(result.reason?.message || "calendar fetch failed");
      }
    }

    events.sort((a, b) => {
      const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return aStart - bStart;
    });

    res.json({ ok: true, events, errors, sources });
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

app.get("/api/meal-plan", (_req, res) => {
  const config = readMealPlanConfig();
  const today = new Date();
  const days = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + offset);
    const weekday = String(day.getDay());
    days.push({
      isoDate: day.toISOString().slice(0, 10),
      weekday: day.getDay(),
      options: config.weekdayMeals?.[weekday] || []
    });
  }

  res.json({ ok: true, days });
});

app.get("/api/shutters", async (_req, res) => {
  try {
    const allStates = await haFetch("/api/states");
    const shutters = Array.isArray(allStates)
      ? allStates
          .filter(isShadeEntity)
          .map((state) => ({
            entity_id: state.entity_id,
            label: state.attributes?.friendly_name || state.entity_id,
            state: state.state,
            current_position: state.attributes?.current_position ?? null,
            area: areaForEntity(state)
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];

    res.json({ ok: true, shutters });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message, shutters: [] });
  }
});

app.post("/api/shutters/action", async (req, res) => {
  const { entity_id, action } = req.body || {};
  if (!entity_id || !action) {
    return res.status(400).json({ ok: false, error: "entity_id and action required" });
  }

  const allowedActions = new Set(["open", "close", "stop", "toggle"]);
  if (!allowedActions.has(action)) {
    return res.status(400).json({ ok: false, error: "invalid action" });
  }

  try {
    const currentState = await haFetch(`/api/states/${encodeURIComponent(entity_id)}`);
    if (!isShadeEntity(currentState)) {
      return res.status(403).json({ ok: false, error: "not a shutter entity" });
    }

    const serviceName = action === "open" ? "open_cover" : action === "close" ? "close_cover" : action === "stop" ? "stop_cover" : "toggle";
    await haFetch(`/api/services/cover/${serviceName}`, {
      method: "POST",
      body: JSON.stringify({ entity_id })
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message, details: error.payload || null });
  }
});

app.get("/api/health", async (_req, res) => {
  const base = {
    ok: true,
    title: TITLE,
    ts: new Date().toISOString(),
    storage: {
      dataRoot: DATA_ROOT,
      externalMountPresent: fs.existsSync("/mnt/storage"),
      dropboxRoot: DROPBOX_ROOT
    },
    personas: PERSONAS
  };

  try {
    await haFetch("/api/");
    res.json({ ...base, homeAssistant: { ok: true } });
  } catch (error) {
    res.status(error.status || 500).json({ ...base, ok: false, homeAssistant: { ok: false, error: error.message } });
  }
});

app.get("/api/nummer12/health", async (_req, res) => {
  try {
    const result = await generateNummer12Reply("ping", "family");
    res.json({
      ok: true,
      connected: true,
      backend: result.backend,
      endpoint: result.endpoint,
      model: result.model || null,
      modelFallbackReason: result.modelFallbackReason || null,
      fallbackReason: result.fallbackReason || null,
      backendConfigured: Boolean(NUMMER12_BACKEND_URL)
    });
  } catch (error) {
    res.json({
      ok: false,
      connected: false,
      backend: null,
      backendConfigured: Boolean(NUMMER12_BACKEND_URL),
      error: error.message
    });
  }
});

app.post("/api/nummer12/relay", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const persona = String(req.body?.persona || "family").toLowerCase();
  if (!message) return res.status(400).json({ ok: false, error: "message required" });
  if (!isValidPersona(persona)) return res.status(400).json({ ok: false, error: "valid persona required" });

  try {
    const result = await ollamaGenerate(message);
    return res.json({ ok: true, persona, reply: result.reply, backend: result.backend, endpoint: result.endpoint || null, model: result.model || null, relay: true });
  } catch (ollamaError) {
    try {
      const fallback = await fallbackGenerate(message);
      return res.json({ ok: true, persona, reply: fallback.reply, backend: fallback.backend, endpoint: fallback.endpoint || null, model: fallback.model || null, relay: true, fallbackReason: ollamaError instanceof Error ? ollamaError.message : "Ollama failed" });
    } catch (fallbackError) {
      return res.status(502).json({ ok: false, persona, relay: true, error: `Relay failed. Ollama: ${ollamaError instanceof Error ? ollamaError.message : "unknown"}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : "unknown"}` });
    }
  }
});

app.post("/api/nummer12/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context || "";
  const persona = String(req.body?.persona || "family").toLowerCase();
  if (!message) return res.status(400).json({ ok: false, error: "message required" });
  if (!isValidPersona(persona)) return res.status(400).json({ ok: false, error: "valid persona required" });

  const personaPaths = getPersonaPaths(persona);
  const profile = readJson(personaPaths.profileFile, { id: persona });
  const memory = fs.existsSync(personaPaths.memoryFile) ? fs.readFileSync(personaPaths.memoryFile, "utf8") : "";
  const archiveFile = path.join(personaPaths.archiveDir, `${new Date().toISOString().slice(0, 10)}.ndjson`);

  const fullMessage = [
    `[Persona: ${persona}]`,
    context ? `[Kontext: ${context}]` : null,
    `[Profil: ${JSON.stringify(profile)}]`,
    memory ? `[Memory]\n${memory}` : null,
    message
  ].filter(Boolean).join("\n\n");

  appendNdjson(archiveFile, {
    timestamp: new Date().toISOString(),
    persona,
    role: "user",
    message,
    context
  });

  try {
    const result = await generateNummer12Reply(fullMessage, persona);
    appendNdjson(archiveFile, {
      timestamp: new Date().toISOString(),
      persona,
      role: "assistant",
      message: result.reply,
      backend: result.backend,
      model: result.model || null
    });
    return res.json({
      ok: true,
      persona,
      reply: result.reply,
      backend: result.backend,
      endpoint: result.endpoint || null,
      model: result.model || null,
      modelFallbackReason: result.modelFallbackReason || null,
      fallbackReason: result.fallbackReason || null
    });
  } catch (error) {
    return res.status(error.status || 502).json({ ok: false, error: error.message, persona });
  }
});

app.get("/api/family", (_req, res) => {
  const family = readFamilyConfig();
  res.json({ members: family.members || [] });
});

app.get("/api/media", async (_req, res) => {
  try {
    const allStates = await haFetch("/api/states");
    const players = Array.isArray(allStates)
      ? allStates
          .filter((state) => state?.entity_id?.startsWith("media_player."))
          .map((state) => ({
            entity_id: state.entity_id,
            label: state.attributes?.friendly_name || state.entity_id,
            state: state.state,
            area: areaForEntity(state),
            app_name: state.attributes?.app_name || "",
            source: state.attributes?.source || "",
            media_title: state.attributes?.media_title || "",
            media_artist: state.attributes?.media_artist || "",
            volume_level: state.attributes?.volume_level ?? null,
            is_spotify: String(state.entity_id).toLowerCase().includes("spotify")
              || String(state.attributes?.friendly_name || "").toLowerCase().includes("spotify")
              || String(state.attributes?.source || "").toLowerCase().includes("spotify")
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];

    res.json({ ok: true, players });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message, players: [] });
  }
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
        .map((s) => ({ label: s.attributes?.friendly_name || s.entity_id, entity_id: s.entity_id, area: areaForEntity(s) }))
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

app.get("/api/storage/layout", (_req, res) => {
  res.json({
    ok: true,
    dataRoot: DATA_ROOT,
    dropboxRoot: DROPBOX_ROOT,
    personas: PERSONAS.map((persona) => ({
      persona,
      paths: getPersonaPaths(persona)
    })),
    generalDropbox: path.join(DROPBOX_ROOT, "general"),
    familyDropbox: path.join(DROPBOX_ROOT, "family")
  });
});

app.get("/api/dropbox", (_req, res) => {
  const entries = readJson(DROPBOX_INDEX_FILE, []);
  res.json({ ok: true, dataRoot: DATA_ROOT, dropboxRoot: DROPBOX_ROOT, entries });
});

app.post("/api/dropbox", (req, res) => {
  const target = String(req.body?.target || "general").toLowerCase();
  const title = String(req.body?.title || "").trim();
  const text = String(req.body?.text || "").trim();
  const source = String(req.body?.source || "ui").trim() || "ui";
  const allowedTargets = new Set(["general", "family", ...PERSONAS]);

  if (!allowedTargets.has(target)) {
    return res.status(400).json({ ok: false, error: "invalid target" });
  }

  if (!title && !text) {
    return res.status(400).json({ ok: false, error: "title or text required" });
  }

  const ts = new Date();
  const slug = `${ts.toISOString().replace(/[:.]/g, "-")}.json`;
  const dir = path.join(DROPBOX_ROOT, target);
  ensureDir(dir);

  const item = {
    id: ts.getTime(),
    target,
    title: title || "Untitled dropbox item",
    text,
    source,
    status: "new",
    createdAt: ts.toISOString(),
    suggestedActions: [
      "analyze",
      "extract dates",
      "propose calendar entry",
      "propose reminders"
    ]
  };

  fs.writeFileSync(path.join(dir, slug), JSON.stringify(item, null, 2), "utf8");
  const index = readJson(DROPBOX_INDEX_FILE, []);
  index.unshift(item);
  writeJson(DROPBOX_INDEX_FILE, index.slice(0, 5000));

  res.json({ ok: true, item, storedAt: path.join(dir, slug) });
});

app.listen(PORT, HOST, () => {
  console.log(`${TITLE} home UI running at http://${HOST}:${PORT}`);
  console.log(`  nummer12 chat: Ollama first at ${OLLAMA_BASE_URL}, fallback ${FALLBACK_API_KEY ? "enabled" : "disabled"}`);
  console.log(`  durable data root: ${DATA_ROOT}`);
  console.log(`  dropbox root: ${DROPBOX_ROOT}`);
  if (!GOOGLE_CLIENT_ID) {
    console.log(`  Google Calendar: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env`);
    console.log(`  Then visit http://localhost:${PORT}/auth/google to connect`);
  }
});
