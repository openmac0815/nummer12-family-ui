const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TITLE = process.env.TITLE || "nummer12";

const NUMMER12_BASE_URL = process.env.NUMMER12_BASE_URL || "http://192.168.178.105";
const NUMMER12_API_PATH = process.env.NUMMER12_API_PATH || "/api/chat";
const NUMMER12_API_KEY  = process.env.NUMMER12_API_KEY  || "";

// Google Calendar OAuth2
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  || `http://localhost:${PORT}/auth/google/callback`;
const GOOGLE_CALENDAR_ID   = process.env.GOOGLE_CALENDAR_ID   || "primary";

const DATA_DIR        = path.join(__dirname, "data");
const DASHBOARD_FILE  = path.join(__dirname, "config", "dashboard.json");
const SHOPPING_FILE   = path.join(DATA_DIR, "shopping.json");
const NOTES_FILE      = path.join(DATA_DIR, "notes.json");
const TOKENS_FILE     = path.join(DATA_DIR, "google_tokens.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ─────────────────────────────────────────────────────────────────

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readDashboardConfig() {
  return readJson(DASHBOARD_FILE, { rooms: [], info: [], quickActions: [] });
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
  try { data = text ? JSON.parse(text) : null; }
  catch { data = text; }
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
  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content)
    return String(payload.choices[0].message.content);
  return null;
}

function normalizeNummer12Url() {
  const base = NUMMER12_BASE_URL.replace(/\/$/, "");
  const p = NUMMER12_API_PATH.startsWith("/") ? NUMMER12_API_PATH : `/${NUMMER12_API_PATH}`;
  return `${base}${p}`;
}

function isLightEntity(state) {
  if (!state?.entity_id) return false;
  const id = String(state.entity_id).toLowerCase();
  const domain = id.split(".")[0];
  const friendly = String(state.attributes?.friendly_name || "").toLowerCase();
  if (domain === "light") return true;
  if (domain === "switch")
    return id.includes("licht") || id.includes("light") || friendly.includes("licht") || friendly.includes("light");
  return false;
}

// ── Google OAuth2 ────────────────────────────────────────────────────────────

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

// OAuth routes
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
    res.send(`<h2 style="font-family:sans-serif;color:green">✓ Google Calendar verbunden! Du kannst dieses Fenster schließen.</h2>`);
  } catch (err) {
    res.status(500).send(`<h2>Fehler: ${err.message}</h2>`);
  }
});

app.get("/auth/google/status", (_req, res) => {
  res.json({ connected: !!googleTokens, hasClientId: !!GOOGLE_CLIENT_ID });
});

// ── Calendar API ─────────────────────────────────────────────────────────────

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

// ── Energy API ───────────────────────────────────────────────────────────────

app.get("/api/energy", async (_req, res) => {
  try {
    const allStates = await haFetch("/api/states");
    const energy = {};

    const energyEntities = [
      "sensor.energy_consumption_today",
      "sensor.power_consumption",
      "sensor.solar_production",
      "sensor.energy_production_today",
      "sensor.grid_consumption",
      "sensor.battery_level",
    ];

    for (const id of energyEntities) {
      const state = Array.isArray(allStates)
        ? allStates.find(s => s.entity_id === id)
        : null;
      if (state) {
        energy[id] = {
          state: state.state,
          unit: state.attributes?.unit_of_measurement || "",
          friendly_name: state.attributes?.friendly_name || id
        };
      }
    }

    // Also look for any sensor with energy/power keywords
    if (Array.isArray(allStates)) {
      for (const s of allStates) {
        const id = s.entity_id;
        if (energy[id]) continue;
        if (id.startsWith("sensor.") &&
            (id.includes("energy") || id.includes("power") || id.includes("solar") || id.includes("kwh") || id.includes("watt"))) {
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

// ── Shopping List ────────────────────────────────────────────────────────────

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
  const idx = list.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });
  list[idx] = { ...list[idx], ...req.body };
  writeJson(SHOPPING_FILE, list);
  res.json({ ok: true, item: list[idx] });
});

app.delete("/api/shopping/:id", (req, res) => {
  const id = Number(req.params.id);
  let list = readJson(SHOPPING_FILE, []);
  list = list.filter(i => i.id !== id);
  writeJson(SHOPPING_FILE, list);
  res.json({ ok: true });
});

// ── Family Notes ─────────────────────────────────────────────────────────────

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

// ── Existing endpoints ───────────────────────────────────────────────────────

app.get("/api/health", async (_req, res) => {
  try {
    await haFetch("/api/");
    res.json({ ok: true, title: TITLE, ts: new Date().toISOString() });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.get("/api/nummer12/health", async (_req, res) => {
  const url = normalizeNummer12Url();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(NUMMER12_API_KEY ? { authorization: `Bearer ${NUMMER12_API_KEY}`, "x-api-key": NUMMER12_API_KEY } : {})
      },
      body: JSON.stringify({ message: "ping" })
    });
    res.json({ ok: response.ok, connected: response.ok, endpoint: url });
  } catch {
    res.json({ ok: false, connected: false, endpoint: url });
  }
});

app.post("/api/nummer12/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context || "";
  if (!message) return res.status(400).json({ ok: false, error: "message required" });

  const url = normalizeNummer12Url();
  const fullMessage = context ? `[Kontext: ${context}]\n${message}` : message;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(NUMMER12_API_KEY ? { authorization: `Bearer ${NUMMER12_API_KEY}`, "x-api-key": NUMMER12_API_KEY } : {})
      },
      body: JSON.stringify({ message: fullMessage })
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text; }
    if (!response.ok) return res.status(502).json({ ok: false, error: `nummer12 backend error (${response.status})` });
    return res.json({ ok: true, reply: extractReply(payload) || "Keine Antwort erhalten." });
  } catch {
    return res.status(502).json({ ok: false, error: "nummer12 backend request failed" });
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
        .map(s => ({ label: s.attributes?.friendly_name || s.entity_id, entity_id: s.entity_id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    for (const state of Array.isArray(allStates) ? allStates : []) {
      states[state.entity_id] = state;
    }
  } catch { /* fallback */ }

  const entityIds = [
    ...rooms.map(i => i.entity_id),
    ...(config.info || []).map(i => i.entity_id)
  ];

  await Promise.all(entityIds.map(async (entityId) => {
    if (states[entityId]) return;
    try { states[entityId] = await haFetch(`/api/states/${encodeURIComponent(entityId)}`); }
    catch { states[entityId] = null; }
  }));

  res.json({ config: { ...config, rooms }, states, title: TITLE, ts: new Date().toISOString() });
});

app.post("/api/toggle", async (req, res) => {
  const { entity_id } = req.body || {};
  if (!entity_id) return res.status(400).json({ ok: false, error: "entity_id required" });
  try {
    const currentState = await haFetch(`/api/states/${encodeURIComponent(entity_id)}`);
    if (!isLightEntity(currentState)) return res.status(403).json({ ok: false, error: "not a light entity" });
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
  if (!GOOGLE_CLIENT_ID) {
    console.log(`  ⚠  Google Calendar: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env`);
    console.log(`     Then visit http://localhost:${PORT}/auth/google to connect`);
  }
});
