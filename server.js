const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
require("dotenv").config();
const { readOpenRouterConfig, generateImageViaOpenRouter, extensionForMime, decodeDataUrl } = require("./lib/openrouter");
const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TITLE = process.env.TITLE || "nummer12";
const NUMMER12_RELAY_BASE_URL = process.env.NUMMER12_RELAY_BASE_URL || "http://127.0.0.1:8090";
const NUMMER12_RELAY_API_PATH = process.env.NUMMER12_RELAY_API_PATH || "/api/chat";
const NUMMER12_RELAY_HEALTH_PATH = process.env.NUMMER12_RELAY_HEALTH_PATH || "/api/health";
const NUMMER12_RELAY_TIMEOUT_MS = Number(process.env.NUMMER12_RELAY_TIMEOUT_MS || 15000);

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
const TASKS_FILE = path.join(STATE_ROOT, "tasks.json");
const NOTES_FILE = path.join(STATE_ROOT, "notes.json");
const ACADEMICS_FILE = path.join(STATE_ROOT, "academics.json");
const SCHEDULES_FILE = path.join(STATE_ROOT, "schedules.json");
const TOKENS_FILE = path.join(STATE_ROOT, "google_tokens.json");
const DROPBOX_INDEX_FILE = path.join(STATE_ROOT, "dropbox-index.json");
const IMAGE_INDEX_FILE = path.join(STATE_ROOT, "images.json");
const MEAL_HISTORY_FILE = path.join(STATE_ROOT, "meal-history.json");
const openRouterConfig = readOpenRouterConfig(process.env);
const DEFAULT_PROFILE_TEMPLATES = {
  nina: {
    age: "",
    summary: "Organisation, Familie und ein ruhiger Blick auf den Alltag.",
    interests: ["Haushalt", "Termine", "Erziehung", "Schule", "Garten", "Lesen"],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  },
  martin: {
    age: "",
    summary: "Pragmatisch, techniknah und interessiert an grossen Zusammenhaengen.",
    interests: ["AI", "Bitcoin", "World Politics", "Solar", "Technik"],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  },
  olivia: {
    age: 10,
    summary: "Kreativ, musikbegeistert und gern in Bewegung.",
    interests: ["Ballett", "Schule", "Gitarre", "Zeichnen", "Musik", "Kreativ"],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  },
  yuna: {
    age: 8,
    summary: "Neugierig, musikalisch und voller Bewegungsdrang.",
    interests: ["Musik", "Nina Chuba", "Schule", "Tanzen", "Playmobil"],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  },
  selma: {
    age: 4,
    summary: "Verspielt, kreativ und nah an Musik und Bewegung.",
    interests: ["Malen", "Ausmalen", "Playmobil", "Barbie", "Musik", "Tanzen"],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  }
};

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
  ensureFile(IMAGE_INDEX_FILE, []);
  ensureFile(TASKS_FILE, []);
  ensureFile(MEAL_HISTORY_FILE, []);
  ensureFile(ACADEMICS_FILE, {});
  ensureFile(SCHEDULES_FILE, {});
}

function validateStorageLayout() {
  if (DATA_ROOT === PRODUCTION_DATA_ROOT && !fs.existsSync("/mnt/storage")) {
    throw new Error("External storage mount /mnt/storage is missing");
  }
  ensureStorageLayout();
}

validateStorageLayout();

app.use(express.json({ limit: "20mb" }));
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

function sanitizeFilename(value) {
  return String(value || "image")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function buildImagePrompt({ persona, prompt }) {
  const personaLabel = isValidPersona(persona) ? persona : "family";
  return [
    "Erzeuge ein warmes, hochwertiges Bild fur das Familienarchiv von Nummer12.",
    `Persona-Kontext: ${personaLabel}.`,
    "Stil: naturlich, freundlich, wohnlich, alltagstauglich, nicht kitschig.",
    "Wenn Menschen vorkommen, dann ohne identifizierbare echte Personen zu imitieren.",
    prompt
  ].join(" ");
}

function imagePublicPath(filePath) {
  const relative = path.relative(DATA_ROOT, filePath).split(path.sep).join("/");
  return `/api/files/${encodeURIComponent(relative)}`;
}

function addImageIndexEntry(entry) {
  const items = readJson(IMAGE_INDEX_FILE, []);
  items.unshift(entry);
  writeJson(IMAGE_INDEX_FILE, items.slice(0, 2000));
}

function listRecentImages(persona = "family", limit = 12) {
  const items = readJson(IMAGE_INDEX_FILE, []);
  return items
    .filter((item) => !persona || item.persona === persona || item.persona === "family")
    .slice(0, limit)
    .map((item) => ({
      ...item,
      url: imagePublicPath(item.filePath)
    }));
}

function storeImageAsset({ persona, kind, prompt, source, buffer, mimeType, originalName = "" }) {
  const now = new Date();
  const personaPaths = getPersonaPaths(persona);
  const rootDir = kind === "upload" ? personaPaths.uploadDir : personaPaths.generatedDir;
  const monthDir = path.join(rootDir, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  ensureDir(monthDir);

  const ext = extensionForMime(mimeType);
  const baseName = sanitizeFilename(`${now.toISOString().replace(/[:.]/g, "-")}-${slugify(originalName || prompt || kind)}`);
  const filePath = path.join(monthDir, `${baseName}.${ext}`);
  const metaPath = path.join(monthDir, `${baseName}.json`);

  fs.writeFileSync(filePath, buffer);

  const entry = {
    id: now.getTime(),
    persona,
    kind,
    source,
    prompt: prompt || "",
    originalName: originalName || "",
    mimeType,
    filePath,
    createdAt: now.toISOString()
  };

  fs.writeFileSync(metaPath, JSON.stringify(entry, null, 2), "utf8");
  addImageIndexEntry(entry);

  return {
    ...entry,
    url: imagePublicPath(filePath)
  };
}

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

async function relayFetchJson(apiPath, payload) {
  const url = normalizeUrl(NUMMER12_RELAY_BASE_URL, apiPath);
  const { controller, timeout } = withTimeout(NUMMER12_RELAY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: payload ? "POST" : "GET",
      signal: controller.signal,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { ok: false, error: text || `relay error (${response.status})` };
    }

    if (!response.ok) {
      const error = new Error(data?.error || `relay error (${response.status})`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function readDashboardConfig() {
  return readJson(DASHBOARD_FILE, { rooms: [], info: [], quickActions: [] });
}

function readFamilyConfig() {
  return readJson(FAMILY_FILE, { members: [] });
}

function defaultProfileForPersona(persona) {
  const familyMember = readFamilyConfig().members?.find((entry) => entry.id === persona) || null;
  const template = DEFAULT_PROFILE_TEMPLATES[persona] || {
    age: "",
    summary: "",
    interests: [],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: []
  };

  return {
    id: persona,
    displayName: familyMember?.name || persona.charAt(0).toUpperCase() + persona.slice(1),
    age: template.age,
    summary: template.summary,
    interests: template.interests,
    currentFavorites: template.currentFavorites,
    currentTopics: template.currentTopics,
    notesForNummer12: template.notesForNummer12,
    updatedAt: null
  };
}

function normalizeProfilePayload(persona, payload = {}) {
  return {
    id: persona,
    displayName: String(payload.displayName || defaultProfileForPersona(persona).displayName).trim() || defaultProfileForPersona(persona).displayName,
    age: payload.age === "" || payload.age == null ? "" : Number(payload.age),
    summary: String(payload.summary || "").trim(),
    interests: Array.isArray(payload.interests)
      ? payload.interests.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.interests || "").split(",").map((item) => item.trim()).filter(Boolean),
    currentFavorites: Array.isArray(payload.currentFavorites)
      ? payload.currentFavorites.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.currentFavorites || "").split(",").map((item) => item.trim()).filter(Boolean),
    currentTopics: Array.isArray(payload.currentTopics)
      ? payload.currentTopics.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.currentTopics || "").split(",").map((item) => item.trim()).filter(Boolean),
    notesForNummer12: Array.isArray(payload.notesForNummer12)
      ? payload.notesForNummer12.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.notesForNummer12 || "").split("\n").map((item) => item.trim()).filter(Boolean),
    updatedAt: new Date().toISOString()
  };
}

function readProfile(persona) {
  const personaPaths = getPersonaPaths(persona);
  const stored = readJson(personaPaths.profileFile, {});
  return {
    ...defaultProfileForPersona(persona),
    ...stored,
    id: persona
  };
}

function readAcademicProfile(persona) {
  const all = readJson(ACADEMICS_FILE, {});
  return all[persona] || {
    timetableNotes: "",
    grades: [],
    notes: ""
  };
}

function writeAcademicProfile(persona, payload) {
  const all = readJson(ACADEMICS_FILE, {});
  all[persona] = {
    timetableNotes: String(payload.timetableNotes || "").trim(),
    notes: String(payload.notes || "").trim(),
    grades: Array.isArray(payload.grades)
      ? payload.grades
          .map((entry) => ({
            subject: String(entry.subject || "").trim(),
            grade: String(entry.grade || "").trim()
          }))
          .filter((entry) => entry.subject || entry.grade)
      : []
  };
  writeJson(ACADEMICS_FILE, all);
  return all[persona];
}

function defaultScheduleProfile(persona) {
  const isKindergarten = persona === "selma";
  return {
    activePlan: "default",
    plans: {
      default: {
        label: isKindergarten ? "Kindergartenwoche" : "Stundenplan",
        weekModel: "single",
        days: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: []
        }
      }
    }
  };
}

function normalizeScheduleEntries(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry, index) => ({
      slot: Number(entry.slot || index + 1),
      start: String(entry.start || "").trim(),
      end: String(entry.end || "").trim(),
      subject: String(entry.subject || "").trim(),
      note: String(entry.note || "").trim()
    }))
    .filter((entry) => entry.subject || entry.start || entry.end || entry.note)
    .sort((a, b) => a.slot - b.slot);
}

function readScheduleProfile(persona) {
  const all = readJson(SCHEDULES_FILE, {});
  const stored = all[persona] || {};
  const fallback = defaultScheduleProfile(persona);
  const activePlan = stored.activePlan || fallback.activePlan;
  const plans = stored.plans && typeof stored.plans === "object" ? stored.plans : fallback.plans;
  const normalizedPlans = Object.fromEntries(
    Object.entries(plans).map(([planId, plan]) => [
      planId,
      {
        label: String(plan.label || "Stundenplan").trim(),
        weekModel: plan.weekModel === "a_b" ? "a_b" : "single",
        days: {
          monday: normalizeScheduleEntries(plan.days?.monday),
          tuesday: normalizeScheduleEntries(plan.days?.tuesday),
          wednesday: normalizeScheduleEntries(plan.days?.wednesday),
          thursday: normalizeScheduleEntries(plan.days?.thursday),
          friday: normalizeScheduleEntries(plan.days?.friday)
        }
      }
    ])
  );
  return {
    activePlan,
    plans: Object.keys(normalizedPlans).length ? normalizedPlans : fallback.plans
  };
}

function writeScheduleProfile(persona, payload) {
  const all = readJson(SCHEDULES_FILE, {});
  const current = readScheduleProfile(persona);
  const activePlan = String(payload.activePlan || current.activePlan || "default").trim() || "default";
  const sourcePlans = payload.plans && typeof payload.plans === "object" ? payload.plans : current.plans;
  const plans = Object.fromEntries(
    Object.entries(sourcePlans).map(([planId, plan]) => [
      planId,
      {
        label: String(plan.label || "Stundenplan").trim(),
        weekModel: plan.weekModel === "a_b" ? "a_b" : "single",
        days: {
          monday: normalizeScheduleEntries(plan.days?.monday),
          tuesday: normalizeScheduleEntries(plan.days?.tuesday),
          wednesday: normalizeScheduleEntries(plan.days?.wednesday),
          thursday: normalizeScheduleEntries(plan.days?.thursday),
          friday: normalizeScheduleEntries(plan.days?.friday)
        }
      }
    ])
  );
  all[persona] = {
    activePlan,
    plans: Object.keys(plans).length ? plans : current.plans
  };
  writeJson(SCHEDULES_FILE, all);
  return readScheduleProfile(persona);
}

function readMealPlanConfig() {
  return readJson(MEAL_PLAN_FILE, { weekdayMeals: {} });
}

function readMealHistory() {
  return readJson(MEAL_HISTORY_FILE, []);
}

function buildMealFinder() {
  const config = readMealPlanConfig();
  const history = readMealHistory();
  const catalog = Object.entries(config.weekdayMeals || {}).flatMap(([weekday, entries]) =>
    (entries || []).map((entry) => ({ ...entry, weekday: Number(weekday) }))
  );

  const counts = new Map();
  const lastCooked = new Map();
  for (const item of history) {
    counts.set(item.title, (counts.get(item.title) || 0) + 1);
    lastCooked.set(item.title, item.ts);
  }

  const uniqueMeals = [];
  const seen = new Set();
  for (const item of catalog) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    uniqueMeals.push(item);
  }

  const today = new Date().getDay();
  const todaySuggestions = (config.weekdayMeals?.[String(today)] || []).map((entry) => ({
    ...entry,
    timesCooked: counts.get(entry.title) || 0,
    lastCookedAt: lastCooked.get(entry.title) || null
  }));

  const favorites = [...uniqueMeals]
    .sort((a, b) => (counts.get(b.title) || 0) - (counts.get(a.title) || 0))
    .filter((entry) => (counts.get(entry.title) || 0) > 0)
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      timesCooked: counts.get(entry.title) || 0,
      lastCookedAt: lastCooked.get(entry.title) || null
    }));

  const quickOptions = uniqueMeals
    .filter((entry) => /schnell|leicht|ohne viel stress|wenig aufwand|unkompliziert/i.test(entry.notes || ""))
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      timesCooked: counts.get(entry.title) || 0
    }));

  const sortedByOldest = [...uniqueMeals].sort((a, b) => {
    const aTs = lastCooked.get(a.title) ? new Date(lastCooked.get(a.title)).getTime() : 0;
    const bTs = lastCooked.get(b.title) ? new Date(lastCooked.get(b.title)).getTime() : 0;
    return aTs - bTs;
  });

  const tryAgain = sortedByOldest.slice(0, 6).map((entry) => ({
    ...entry,
    timesCooked: counts.get(entry.title) || 0,
    lastCookedAt: lastCooked.get(entry.title) || null
  }));

  const currentYear = new Date().getFullYear();
  const mostCookedThisYear = [...history]
    .filter((item) => new Date(item.ts).getFullYear() === currentYear)
    .reduce((acc, item) => {
      acc[item.title] = (acc[item.title] || 0) + 1;
      return acc;
    }, {});

  const topThisYear = Object.entries(mostCookedThisYear)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, count]) => ({ title, count }));

  return {
    todaySuggestions,
    favorites,
    quickOptions,
    tryAgain,
    stats: {
      historyCount: history.length,
      topThisYear
    }
  };
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
      "https://www.googleapis.com/auth/calendar.events",
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

async function gcalRequest(endpoint, options = {}) {
  const token = await getValidGoogleToken();
  const r = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const error = new Error(`GCal error: ${data?.error?.message || r.status}`);
    error.status = r.status;
    error.payload = data;
    throw error;
  }
  return data;
}

async function loadEventsForWindow({ timeMin, timeMax }) {
  const sources = getCalendarSources();
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50"
      });
      const data = await gcalFetch(`/calendars/${encodeURIComponent(source.id)}/events?${params}`);
      return (Array.isArray(data.items) ? data.items : []).map((item) => ({
        ...item,
        calendar_id: source.id,
        calendar_label: source.label,
        member_id: source.member_id || null,
        member_name: source.member_name || null,
        member_color: source.color || null
      }));
    })
  );
  return settled
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

function detectPersonasInText(text) {
  const lower = String(text || "").toLowerCase();
  return readFamilyConfig()
    .members
    .filter((member) => lower.includes(member.name.toLowerCase()) || lower.includes(member.id.toLowerCase()))
    .map((member) => member.id);
}

function parseActionDate(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("morgen")) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return { isoDate: date.toISOString().slice(0, 10), allDay: true };
  }
  if (lower.includes("heute")) {
    return { isoDate: now.toISOString().slice(0, 10), allDay: true };
  }

  const dateMatch = text.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
  if (!dateMatch) return null;
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = dateMatch[3] ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : now.getFullYear();
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  const timeMatch = text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (timeMatch) {
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    const end = new Date(date);
    end.setHours(end.getHours() + 2);
    return {
      isoDateTime: date.toISOString(),
      endIsoDateTime: end.toISOString(),
      allDay: false
    };
  }

  return { isoDate: date.toISOString().slice(0, 10), allDay: true };
}

function parseAssistantActions(message) {
  const lower = String(message || "").toLowerCase().trim();
  if (!lower) return null;

  const shouldCreateEvent = /\b(trage|eintragen|plane|erstelle)\b/.test(lower) && (
    lower.includes("geburtstag") || lower.includes("party") || lower.includes("termin")
  );
  const shouldCreateTask = /\b(todo|aufgabe|besorgen|geschenk|denk dran|erinnere)\b/.test(lower);

  if (!shouldCreateEvent && !shouldCreateTask) return null;

  const personas = detectPersonasInText(message);
  const date = parseActionDate(message);
  const locationMatch = message.match(/\bbei\s+([^,.;]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : "";
  const actions = [];

  if (shouldCreateEvent) {
    let title = "Neuer Familientermin";
    if (lower.includes("geburtstag")) {
      title = location ? `Geburtstagsfeier bei ${location}` : "Geburtstagsfeier";
    } else if (lower.includes("party")) {
      title = location ? `Party bei ${location}` : "Party";
    }

    actions.push({
      type: "calendar.create",
      title,
      personas,
      location,
      date,
      missingDate: !date
    });
  }

  if (shouldCreateTask) {
    let text = "Neue Aufgabe";
    const giftMatch = message.match(/geschenk(?:\s+f[üu]r)?\s+([^,.;]+)/i);
    if (giftMatch) {
      text = `Geschenk fur ${giftMatch[1].trim()} besorgen`;
    } else if (/besorgen/i.test(message)) {
      text = message.trim();
    } else {
      text = "Offene Aufgabe aus Chat";
    }
    actions.push({
      type: "task.create",
      text,
      personas
    });
  }

  return actions;
}

async function createCalendarEventFromAction(action) {
  if (!action?.date) {
    return { ok: false, type: "calendar.create", error: "missing-date" };
  }

  const sources = getCalendarSources();
  const familySource = sources.find((source) => source.member_id === "family" && source.writable);
  const target = action.personas?.length === 1
    ? (sources.find((source) => source.member_id === action.personas[0] && source.writable) || familySource)
    : familySource;

  if (!target?.id) {
    return { ok: false, type: "calendar.create", error: "no-writable-calendar" };
  }

  const body = action.date.allDay
    ? {
        summary: action.title,
        location: action.location || undefined,
        description: action.personas?.length ? `Betrifft: ${action.personas.join(", ")}` : undefined,
        start: { date: action.date.isoDate },
        end: { date: action.date.isoDate }
      }
    : {
        summary: action.title,
        location: action.location || undefined,
        description: action.personas?.length ? `Betrifft: ${action.personas.join(", ")}` : undefined,
        start: { dateTime: action.date.isoDateTime },
        end: { dateTime: action.date.endIsoDateTime }
      };

  try {
    const event = await gcalRequest(`/calendars/${encodeURIComponent(target.id)}/events`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    return { ok: true, type: "calendar.create", calendarId: target.id, eventId: event.id, title: action.title };
  } catch (error) {
    return { ok: false, type: "calendar.create", error: error.message };
  }
}

function createTaskFromAction(action) {
  const items = readJson(TASKS_FILE, []);
  const item = {
    id: Date.now(),
    text: action.text,
    personas: action.personas || [],
    done: false,
    createdAt: new Date().toISOString(),
    source: "nummer12-chat"
  };
  items.push(item);
  writeJson(TASKS_FILE, items);
  return { ok: true, type: "task.create", task: item };
}

function currentSeasonLabel(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month === 12 || month <= 2) return "Winter";
  if (month <= 5) return "Fruehling";
  if (month <= 8) return "Sommer";
  return "Herbst";
}

function findRecentReferenceImages(persona, limit = 2) {
  const items = readJson(IMAGE_INDEX_FILE, []);
  return items
    .filter((item) => item.persona === persona && item.kind === "upload")
    .slice(0, limit)
    .map((item) => ({ dataUrl: `data:${item.mimeType};base64,${fs.readFileSync(item.filePath).toString("base64")}` }));
}

async function getOrCreateDailyImage(persona = "family") {
  const today = new Date().toISOString().slice(0, 10);
  const existing = readJson(IMAGE_INDEX_FILE, []).find((item) => (
    item.persona === persona &&
    item.kind === "generated" &&
    item.source === "openrouter-daily" &&
    String(item.createdAt || "").startsWith(today)
  ));

  if (existing) {
    return { ...existing, url: imagePublicPath(existing.filePath), reused: true };
  }

  let eventSummary = "";
  try {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);
    const events = await loadEventsForWindow({ timeMin: from.toISOString(), timeMax: to.toISOString() });
    const relevant = events.filter((event) => persona === "family" || event.member_id === persona).slice(0, 4);
    eventSummary = relevant.map((event) => event.summary).filter(Boolean).join(", ");
  } catch {
    eventSummary = "";
  }

  const season = currentSeasonLabel();
  const prompt = [
    `Ein hochwertiges Bild des Tages fuer ${persona}.`,
    `Jahreszeit: ${season}.`,
    eventSummary ? `Naechste Termine oder Themen: ${eventSummary}.` : "Kein besonderer Terminbezug erkannt.",
    "Freundlich, warm, familientauglich, bildstark, nicht kitschig."
  ].join(" ");

  const result = await generateImageViaOpenRouter(openRouterConfig, {
    prompt,
    referenceImages: findRecentReferenceImages(persona, 1)
  });

  const stored = storeImageAsset({
    persona,
    kind: "generated",
    prompt,
    source: "openrouter-daily",
    buffer: result.images[0].buffer,
    mimeType: result.images[0].mimeType,
    originalName: `daily-${persona}`
  });

  return { ...stored, reused: false };
}

async function executeAssistantActions(actions = []) {
  const results = [];
  for (const action of actions) {
    if (action.type === "calendar.create") {
      results.push(await createCalendarEventFromAction(action));
    } else if (action.type === "task.create") {
      results.push(createTaskFromAction(action));
    }
  }
  return results;
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

app.get("/api/tasks", (_req, res) => {
  res.json({ ok: true, items: readJson(TASKS_FILE, []) });
});

app.post("/api/tasks", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  const items = readJson(TASKS_FILE, []);
  const item = {
    id: Date.now(),
    text,
    personas: Array.isArray(req.body?.personas) ? req.body.personas : [],
    done: false,
    createdAt: new Date().toISOString(),
    source: req.body?.source || "ui"
  };
  items.push(item);
  writeJson(TASKS_FILE, items);
  res.json({ ok: true, item });
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const items = readJson(TASKS_FILE, []);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });
  items[idx] = { ...items[idx], ...req.body };
  writeJson(TASKS_FILE, items);
  res.json({ ok: true, item: items[idx] });
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const items = readJson(TASKS_FILE, []).filter((item) => item.id !== id);
  writeJson(TASKS_FILE, items);
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

app.get("/api/academics/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family") {
    return res.status(400).json({ ok: false, error: "valid member persona required" });
  }
  return res.json({ ok: true, academic: readAcademicProfile(member) });
});

app.get("/api/schedules/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family" || member === "nina" || member === "martin") {
    return res.status(400).json({ ok: false, error: "valid school persona required" });
  }
  return res.json({ ok: true, schedule: readScheduleProfile(member) });
});

app.post("/api/schedules/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family" || member === "nina" || member === "martin") {
    return res.status(400).json({ ok: false, error: "valid school persona required" });
  }
  return res.json({ ok: true, schedule: writeScheduleProfile(member, req.body || {}) });
});

app.post("/api/academics/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family") {
    return res.status(400).json({ ok: false, error: "valid member persona required" });
  }
  return res.json({ ok: true, academic: writeAcademicProfile(member, req.body || {}) });
});

app.get("/api/profiles/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family") {
    return res.status(400).json({ ok: false, error: "valid member persona required" });
  }
  return res.json({ ok: true, profile: readProfile(member) });
});

app.post("/api/profiles/:member", (req, res) => {
  const member = String(req.params.member || "").toLowerCase();
  if (!isValidPersona(member) || member === "family") {
    return res.status(400).json({ ok: false, error: "valid member persona required" });
  }

  const personaPaths = getPersonaPaths(member);
  const profile = normalizeProfilePayload(member, req.body || {});
  writeJson(personaPaths.profileFile, profile);
  return res.json({ ok: true, profile: readProfile(member) });
});

app.get("/api/images/status", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(openRouterConfig.apiKey),
    model: openRouterConfig.imageModel,
    provider: "openrouter"
  });
});

app.get("/api/images", (req, res) => {
  const persona = String(req.query.persona || "family").toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 36);
  res.json({
    ok: true,
    configured: Boolean(openRouterConfig.apiKey),
    model: openRouterConfig.imageModel,
    items: listRecentImages(isValidPersona(persona) ? persona : "family", limit)
  });
});

app.get("/api/images/daily", async (req, res) => {
  const persona = String(req.query.persona || "family").toLowerCase();
  if (!isValidPersona(persona)) {
    return res.status(400).json({ ok: false, error: "valid persona required" });
  }
  try {
    const item = await getOrCreateDailyImage(persona);
    res.json({
      ok: true,
      configured: Boolean(openRouterConfig.apiKey),
      model: openRouterConfig.imageModel,
      item
    });
  } catch (error) {
    res.status(error.status || 502).json({
      ok: false,
      error: error.message,
      configured: Boolean(openRouterConfig.apiKey),
      model: openRouterConfig.imageModel
    });
  }
});

app.get("/api/files/:encodedPath", (req, res) => {
  const relative = decodeURIComponent(String(req.params.encodedPath || ""));
  const absolute = path.resolve(DATA_ROOT, relative);
  if (!absolute.startsWith(DATA_ROOT)) {
    return res.status(400).json({ ok: false, error: "invalid file path" });
  }
  if (!fs.existsSync(absolute)) {
    return res.status(404).json({ ok: false, error: "file not found" });
  }
  return res.sendFile(absolute);
});

app.post("/api/images/upload", (req, res) => {
  const persona = String(req.body?.persona || "family").toLowerCase();
  const filename = String(req.body?.filename || "upload");
  const dataUrl = String(req.body?.dataUrl || "");
  const caption = String(req.body?.caption || "").trim();

  if (!isValidPersona(persona)) {
    return res.status(400).json({ ok: false, error: "valid persona required" });
  }

  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) {
    return res.status(400).json({ ok: false, error: "valid image dataUrl required" });
  }

  const item = storeImageAsset({
    persona,
    kind: "upload",
    prompt: caption,
    source: "camera-upload",
    buffer: decoded.buffer,
    mimeType: decoded.mimeType,
    originalName: filename
  });

  res.json({ ok: true, item });
});

app.post("/api/images/generate", async (req, res) => {
  const persona = String(req.body?.persona || "family").toLowerCase();
  const prompt = String(req.body?.prompt || "").trim();
  if (!isValidPersona(persona)) {
    return res.status(400).json({ ok: false, error: "valid persona required" });
  }
  if (!prompt) {
    return res.status(400).json({ ok: false, error: "prompt required" });
  }

  try {
    const result = await generateImageViaOpenRouter(openRouterConfig, {
      prompt: buildImagePrompt({ persona, prompt })
    });

    const items = result.images.map((image, index) => storeImageAsset({
      persona,
      kind: "generated",
      prompt,
      source: "openrouter",
      buffer: image.buffer,
      mimeType: image.mimeType,
      originalName: `${prompt}-${index + 1}`
    }));

    res.json({
      ok: true,
      provider: "openrouter",
      model: result.model,
      items
    });
  } catch (error) {
    res.status(error.status || 502).json({
      ok: false,
      error: error.message,
      provider: "openrouter",
      model: openRouterConfig.imageModel
    });
  }
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

app.get("/api/meals/finder", (_req, res) => {
  res.json({ ok: true, finder: buildMealFinder() });
});

app.post("/api/meals/record", (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ ok: false, error: "title required" });
  const history = readMealHistory();
  const entry = {
    id: Date.now(),
    title,
    notes: String(req.body?.notes || "").trim(),
    rating: String(req.body?.rating || "").trim(),
    ts: new Date().toISOString()
  };
  history.push(entry);
  writeJson(MEAL_HISTORY_FILE, history);
  res.json({ ok: true, entry, finder: buildMealFinder() });
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
    const status = await relayFetchJson(NUMMER12_RELAY_HEALTH_PATH);
    res.json({
      ...status,
      relayBaseUrl: NUMMER12_RELAY_BASE_URL,
      relayApiPath: NUMMER12_RELAY_API_PATH
    });
  } catch (error) {
    res.status(error.status || 502).json({
      ok: false,
      connected: false,
      activeBackend: null,
      error: error.message,
      relayBaseUrl: NUMMER12_RELAY_BASE_URL,
      relayApiPath: NUMMER12_RELAY_API_PATH
    });
  }
});

app.post("/api/nummer12/relay", async (req, res) => {
  try {
    const result = await relayFetchJson(NUMMER12_RELAY_API_PATH, {
      ...(req.body || {}),
      source: "nummer12-family-ui"
    });
    return res.json({
      ...result,
      relay: true,
      relayBaseUrl: NUMMER12_RELAY_BASE_URL
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      relay: true,
      error: error.message,
      attempts: error.payload?.attempts || []
    });
  }
});

app.post("/api/nummer12/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const localActions = parseAssistantActions(message);
  if (localActions?.length) {
    const results = await executeAssistantActions(localActions);
    const parts = [];
    const calendarCreated = results.find((item) => item.type === "calendar.create" && item.ok);
    const calendarMissingDate = results.find((item) => item.type === "calendar.create" && item.error === "missing-date");
    const taskCreated = results.find((item) => item.type === "task.create" && item.ok);

    if (calendarCreated) {
      parts.push(`Ich habe den Termin "${calendarCreated.title}" im Kalender eingetragen.`);
    } else if (calendarMissingDate) {
      parts.push("Ich habe erkannt, dass du einen Termin anlegen willst, aber mir fehlt noch ein Datum.");
    }

    if (taskCreated) {
      parts.push(`Die Aufgabe "${taskCreated.task.text}" steht jetzt auf der Familienliste.`);
    }

    const fallbackReply = parts.length ? parts.join(" ") : "Ich habe die Aktion erkannt, konnte sie aber noch nicht vollstandig ausfuhren.";
    return res.json({
      ok: true,
      reply: fallbackReply,
      backend: "local-actions",
      persona: String(req.body?.persona || "family").toLowerCase(),
      actions: results
    });
  }

  try {
    const result = await relayFetchJson(NUMMER12_RELAY_API_PATH, {
      ...(req.body || {}),
      source: "nummer12-family-ui"
    });
    return res.json({
      ...result,
      relayBaseUrl: NUMMER12_RELAY_BASE_URL
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      error: error.message,
      persona: String(req.body?.persona || "family").toLowerCase(),
      attempts: error.payload?.attempts || []
    });
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
  console.log(`  nummer12 relay: ${NUMMER12_RELAY_BASE_URL}${NUMMER12_RELAY_API_PATH}`);
  console.log(`  durable data root: ${DATA_ROOT}`);
  console.log(`  dropbox root: ${DROPBOX_ROOT}`);
  if (!GOOGLE_CLIENT_ID) {
    console.log(`  Google Calendar: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env`);
    console.log(`  Then visit http://localhost:${PORT}/auth/google to connect`);
  }
});
