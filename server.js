const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TITLE = process.env.TITLE || "nummer12 family";

const DASHBOARD_FILE = path.join(__dirname, "config", "dashboard.json");

app.use(express.json({ limit: "200kb" }));
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

app.get("/api/health", async (_req, res) => {
  try {
    await haFetch("/api/");
    res.json({ ok: true, title: TITLE, ts: new Date().toISOString() });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.get("/api/dashboard", async (_req, res) => {
  const config = readDashboardConfig();
  const entityIds = [
    ...config.rooms.map((item) => item.entity_id),
    ...config.info.map((item) => item.entity_id)
  ];

  const states = {};

  await Promise.all(
    entityIds.map(async (entityId) => {
      try {
        states[entityId] = await haFetch(`/api/states/${encodeURIComponent(entityId)}`);
      } catch {
        states[entityId] = null;
      }
    })
  );

  res.json({ config, states, title: TITLE, ts: new Date().toISOString() });
});

app.post("/api/toggle", async (req, res) => {
  const { entity_id } = req.body || {};
  if (!entity_id) {
    return res.status(400).json({ ok: false, error: "entity_id required" });
  }

  const config = readDashboardConfig();
  const allowed = new Set(config.rooms.map((room) => room.entity_id));
  if (!allowed.has(entity_id)) {
    return res.status(403).json({ ok: false, error: "entity_id not allowed" });
  }

  try {
    await haFetch("/api/services/homeassistant/toggle", {
      method: "POST",
      body: JSON.stringify({ entity_id })
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.post("/api/action", async (req, res) => {
  const { label } = req.body || {};
  if (!label) {
    return res.status(400).json({ ok: false, error: "label required" });
  }

  const config = readDashboardConfig();
  const action = config.quickActions.find((item) => item.label === label);
  if (!action) {
    return res.status(404).json({ ok: false, error: "action not found" });
  }

  try {
    await haFetch(`/api/services/${action.domain}/${action.service}`, {
      method: "POST",
      body: JSON.stringify(action.data || {})
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`nummer12-family-ui running at http://${HOST}:${PORT}`);
});
