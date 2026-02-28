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
const NUMMER12_API_KEY = process.env.NUMMER12_API_KEY || "";

const DASHBOARD_FILE = path.join(__dirname, "config", "dashboard.json");

app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readDashboardConfig() {
  try {
    return JSON.parse(fs.readFileSync(DASHBOARD_FILE, "utf8"));
  } catch {
    return { rooms: [], info: [], quickActions: [] };
  }
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
  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    return String(payload.choices[0].message.content);
  }
  return null;
}

function normalizeNummer12Url() {
  const base = NUMMER12_BASE_URL.replace(/\/$/, "");
  const pathPart = NUMMER12_API_PATH.startsWith("/") ? NUMMER12_API_PATH : `/${NUMMER12_API_PATH}`;
  return `${base}${pathPart}`;
}

function isLightEntity(state) {
  if (!state || !state.entity_id) return false;
  const entityId = String(state.entity_id).toLowerCase();
  const domain = entityId.split(".")[0];
  const friendly = String(state.attributes?.friendly_name || "").toLowerCase();

  if (domain === "light") return true;
  if (domain === "switch") {
    return entityId.includes("licht") || entityId.includes("light") || friendly.includes("licht") || friendly.includes("light");
  }
  return false;
}

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
  if (!message) {
    return res.status(400).json({ ok: false, error: "message required" });
  }

  const url = normalizeNummer12Url();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(NUMMER12_API_KEY ? { authorization: `Bearer ${NUMMER12_API_KEY}`, "x-api-key": NUMMER12_API_KEY } : {})
      },
      body: JSON.stringify({ message })
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: `nummer12 backend error (${response.status})` });
    }

    return res.json({ ok: true, reply: extractReply(payload) || "No reply content from nummer12 backend." });
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
        .map((state) => ({
          label: state.attributes?.friendly_name || state.entity_id,
          entity_id: state.entity_id
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    for (const state of Array.isArray(allStates) ? allStates : []) {
      states[state.entity_id] = state;
    }
  } catch {
    // Keep fallback config-based rooms and per-entity lookups below.
  }

  const entityIds = [
    ...rooms.map((item) => item.entity_id),
    ...(config.info || []).map((item) => item.entity_id)
  ];

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

  res.json({
    config: {
      ...config,
      rooms
    },
    states,
    title: TITLE,
    ts: new Date().toISOString()
  });
});

app.post("/api/toggle", async (req, res) => {
  const { entity_id } = req.body || {};
  if (!entity_id) {
    return res.status(400).json({ ok: false, error: "entity_id required" });
  }

  try {
    const currentState = await haFetch(`/api/states/${encodeURIComponent(entity_id)}`);
    if (!isLightEntity(currentState)) {
      return res.status(403).json({ ok: false, error: "entity is not recognized as a light" });
    }

    const domain = String(entity_id).split(".")[0];
    await haFetch(`/api/services/${domain}/toggle`, {
      method: "POST",
      body: JSON.stringify({ entity_id })
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.message,
      details: error.payload || null
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`${TITLE} home UI running at http://${HOST}:${PORT}`);
});
