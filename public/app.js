const PERSONA_DETAILS = {
  family: {
    id: "family",
    name: "Familie",
    emoji: "🏡",
    title: "Familienmodus",
    intro: "Ich halte Woche, Einkauf und Zuhause zusammen.",
    prompt: "Antworte als warme Familien-KI fur alle im Haus.",
    interests: [
      { title: "Heute im Blick", text: "Fasse auf Wunsch Termine, Einkauf und Abendessen fur die Familie zusammen." },
      { title: "Zuhause helfen", text: "Nummer12 darf bei Licht, Jalousien und Alltagsfragen helfen." }
    ]
  },
  nina: {
    id: "nina",
    name: "Nina",
    emoji: "🌿",
    title: "Organisation & Familie",
    intro: "Planung, Wochenrhythmus und alles, was die Familie zusammenhalt.",
    prompt: "Antworte personlich fur Nina, ruhig, strukturiert und familientauglich.",
    interests: [
      { title: "Familienorganisation", text: "Termine zusammenziehen, Aufgaben sortieren, Wochenrhythmus beruhigen." },
      { title: "Einkauf & Alltag", text: "Fehlende Dinge erkennen und den Alltag vorausschauend strukturieren." }
    ]
  },
  martin: {
    id: "martin",
    name: "Martin",
    emoji: "🗞️",
    title: "News & Technik",
    intro: "Relevante Themen, Einordnung und schnelle Antworten fur den Tag.",
    prompt: "Antworte personlich fur Martin, klar, pragmatisch und informiert.",
    interests: [
      { title: "News Fokus", text: "Spater als Modul: kuratierte Themen, Energie, Politik, Technik." },
      { title: "Technik im Haus", text: "Status, Ideen und direkte Ruckfragen an Nummer12." }
    ]
  },
  olivia: {
    id: "olivia",
    name: "Olivia",
    emoji: "🎨",
    title: "Kreativ & Basteln",
    intro: "Ideen fur Basteln, kleine Projekte und kreative Nachmittage.",
    prompt: "Antworte fur Olivia freundlich, kreativ und altersgerecht.",
    interests: [
      { title: "Bastelvorschlage", text: "Spater als Modul: einfache Ideen fur heute, drinnen oder draussen." },
      { title: "Kreative Fragen", text: "Nummer12 kann Projekte, Materialien und kleine Geschichten vorschlagen." }
    ]
  },
  yuna: {
    id: "yuna",
    name: "Yuna",
    emoji: "🌈",
    title: "Entdecken & Spielen",
    intro: "Leichte, frische Ideen fur kleine Abenteuer und gute Tagesmomente.",
    prompt: "Antworte fur Yuna freundlich, spielerisch und kindgerecht.",
    interests: [
      { title: "Heute entdecken", text: "Kleine Spielideen, Wetterideen und freundliche Begleitung." },
      { title: "Rituale", text: "Nummer12 kann kleine Routinen fur Morgen oder Abend begleiten." }
    ]
  },
  selma: {
    id: "selma",
    name: "Selma",
    emoji: "🌸",
    title: "Sanft & Spielerisch",
    intro: "Liebevolle Ideen, kleine Impulse und ruhige Begleitung im Alltag.",
    prompt: "Antworte fur Selma sanft, verspielt und altersgerecht.",
    interests: [
      { title: "Spielmomente", text: "Kleine Ideen fur zuhause und ruhige gemeinsame Zeit." },
      { title: "Geborgenheit", text: "Nummer12 darf weich und freundlich sprechen und Orientierung geben." }
    ]
  }
};

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "calendar", label: "Kalender" },
  { id: "control", label: "Licht & Jalo" },
  { id: "media", label: "Multimedia" },
  { id: "nina", label: "Nina" },
  { id: "martin", label: "Martin" },
  { id: "olivia", label: "Olivia" },
  { id: "yuna", label: "Yuna" },
  { id: "selma", label: "Selma" }
];

const AREA_LABELS = {
  eg: "EG",
  og: "OG",
  aussen: "Aussen"
};

const state = {
  days: [],
  events: [],
  meals: [],
  mealFinder: { todaySuggestions: [], favorites: [], quickOptions: [], tryAgain: [], stats: { historyCount: 0, topThisYear: [] } },
  lights: [],
  lightStates: {},
  shutters: [],
  shopping: [],
  tasks: [],
  energy: {},
  family: [],
  mediaPlayers: [],
  images: [],
  dailyImages: {},
  imageStatus: { configured: false, model: "" },
  profiles: {},
  academics: {},
  schedules: {},
  familyNotes: { text: "", updatedAt: null },
  calendarConnected: false,
  calendarViewDate: new Date(),
  chats: loadChatStore(),
  mealAssignments: loadMealAssignments(),
  route: "home"
};

const el = {
  weekLabel: document.getElementById("week-label"),
  dotHa: document.getElementById("dot-ha"),
  dotAi: document.getElementById("dot-ai"),
  dotCal: document.getElementById("dot-cal"),
  statusHa: document.getElementById("status-ha"),
  statusAi: document.getElementById("status-ai"),
  statusCal: document.getElementById("status-cal"),
  mainNav: document.getElementById("main-nav"),
  viewRoot: document.getElementById("view-root"),
  chatTemplate: document.getElementById("chat-template"),
  shoppingTemplate: document.getElementById("shopping-template")
};

const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const dayShort = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const monthNames = ["Januar", "Februar", "Marz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

function jsonFetch(url, options) {
  return fetch(url, options).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createNodeFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function setStatus(dot, label, base, ok, extra = "") {
  dot.className = `dot ${ok ? "ok" : "err"}`;
  label.textContent = extra ? `${base} · ${extra}` : `${base} ${ok ? "verbunden" : "offline"}`;
}

function loadChatStore() {
  try {
    return JSON.parse(localStorage.getItem("nummer12-chat-store") || "{}");
  } catch {
    return {};
  }
}

function persistChatStore() {
  localStorage.setItem("nummer12-chat-store", JSON.stringify(state.chats));
}

function loadMealAssignments() {
  try {
    return JSON.parse(localStorage.getItem("nummer12-meal-assignments") || "{}");
  } catch {
    return {};
  }
}

function persistMealAssignments() {
  localStorage.setItem("nummer12-meal-assignments", JSON.stringify(state.mealAssignments));
}

function assignMeal(dayKey, meal) {
  state.mealAssignments[dayKey] = meal;
  persistMealAssignments();
}

function getChatHistory(persona) {
  if (!state.chats[persona]) {
    const details = PERSONA_DETAILS[persona] || PERSONA_DETAILS.family;
    state.chats[persona] = [{ role: "bot", text: `Hallo, ich bin Nummer12 fur ${details.name}. ${details.intro}` }];
    persistChatStore();
  }
  return state.chats[persona];
}

function pushChat(persona, role, text) {
  const history = getChatHistory(persona);
  history.push({ role, text, ts: Date.now() });
  state.chats[persona] = history.slice(-24);
  persistChatStore();
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#/, "").trim();
  return NAV_ITEMS.some((item) => item.id === hash) ? hash : "home";
}

function memberById(id) {
  return state.family.find((entry) => entry.id === id) || null;
}

function profileForPerson(id) {
  const details = PERSONA_DETAILS[id] || {};
  const member = memberById(id) || {};
  return state.profiles[id] || {
    id,
    displayName: member.name || details.name || id,
    age: "",
    summary: details.intro || "",
    interests: [],
    currentFavorites: [],
    currentTopics: [],
    notesForNummer12: [],
    updatedAt: null
  };
}

function colorForMember(id) {
  return id === "family" ? "#6f9b62" : (memberById(id)?.color || "#6f9b62");
}

function guessArea(item) {
  const haystack = `${item?.entity_id || item?.id || ""} ${item?.label || item?.name || ""}`.toLowerCase();
  if (haystack.includes("garten") || haystack.includes("terrasse") || haystack.includes("balkon") || haystack.includes("aussen") || haystack.includes("outdoor")) return "aussen";
  if (haystack.includes("schlaf") || haystack.includes("kinder") || haystack.includes("bad og") || haystack.includes("oben") || haystack.includes("og")) return "og";
  return "eg";
}

function buildDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function updateWeekLabel() {
  const start = state.days[0];
  const end = state.days[state.days.length - 1];
  el.weekLabel.textContent = `${dayNames[start.getDay()]}, ${start.getDate()}.${start.getMonth() + 1}. bis ${dayNames[end.getDay()]}, ${end.getDate()}.${end.getMonth() + 1}.`;
}

function detectMemberForEvent(event) {
  if (event.member_id === "family") {
    return { id: "family", name: event.member_name || event.calendar_label || "Familie", color: event.member_color || colorForMember("family") };
  }
  if (event.member_id) {
    const member = memberById(event.member_id);
    if (member) return member;
  }
  const haystack = [
    event.summary,
    event.description,
    event.organizer?.displayName,
    event.organizer?.email,
    event.creator?.displayName,
    event.creator?.email
  ].filter(Boolean).join(" ").toLowerCase();
  for (const member of state.family) {
    if (haystack.includes(member.name.toLowerCase()) || haystack.includes(member.id.toLowerCase())) return member;
  }
  return null;
}

function formatEventTime(event) {
  if (!event.start?.dateTime) return "Ganztag";
  return new Date(event.start.dateTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function eventsForPersona(persona) {
  if (persona === "family") return [...state.events];
  return state.events.filter((event) => detectMemberForEvent(event)?.id === persona);
}

function upcomingEventsForPersona(persona, limit = 8) {
  return eventsForPersona(persona)
    .slice()
    .sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0))
    .slice(0, limit);
}

function weekdayKeyFromDate(date) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
}

function scheduleForPerson(personId) {
  return state.schedules[personId] || {
    activePlan: "default",
    plans: {
      default: {
        label: personId === "selma" ? "Kindergartenwoche" : "Stundenplan",
        weekModel: "single",
        days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] }
      }
    }
  };
}

function activeSchedulePlan(personId) {
  const schedule = scheduleForPerson(personId);
  return schedule.plans?.[schedule.activePlan] || Object.values(schedule.plans || {})[0] || { days: {} };
}

function eventsByDay() {
  const map = new Map();
  for (const event of state.events) {
    const raw = event.start?.dateTime || event.start?.date;
    if (!raw) continue;
    const key = isoDate(new Date(raw));
    const current = map.get(key) || [];
    current.push(event);
    map.set(key, current);
  }
  return map;
}

function mealsByDate() {
  return new Map((state.meals || []).map((entry) => [entry.isoDate, entry.options || []]));
}

function currentCalendarViewDate() {
  const base = state.calendarViewDate instanceof Date ? state.calendarViewDate : new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function monthStart(viewDate = currentCalendarViewDate()) {
  return new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
}

function monthEnd(viewDate = currentCalendarViewDate()) {
  return new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999);
}

function buildMonthMatrix() {
  const start = monthStart();
  const end = monthEnd();
  const gridStart = new Date(start);
  const day = (start.getDay() + 6) % 7;
  gridStart.setDate(start.getDate() - day);
  const matrix = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    matrix.push(date);
  }
  return { start, end, days: matrix };
}

function renderNav() {
  el.mainNav.innerHTML = `<div class="nav-row compact">${NAV_ITEMS.map((item) => `
    <a class="nav-chip ${item.id === state.route ? "active" : ""}" href="#${item.id}">${item.label}</a>
  `).join("")}</div>`;
}

function renderWeekPlanner(compact = false) {
  const groupedEvents = eventsByDay();
  return `<div class="${compact ? "week-grid week-grid-home" : "planner-grid"}">${state.days.map((day, index) => {
    const key = isoDate(day);
    const dayEvents = (groupedEvents.get(key) || []).slice().sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
    return `
      <article class="day-card ${index === 0 ? "today" : ""}" data-day-card="${key}">
        <div class="day-head">
          <div>
            <h4>${dayShort[day.getDay()]}</h4>
            <p class="small-line">${day.getDate()}.${day.getMonth() + 1}.</p>
          </div>
          <span class="day-badge">${index === 0 ? "Heute" : index === 1 ? "Morgen" : `${dayEvents.length} Termine`}</span>
        </div>
        <div class="event-stack compact-stack">
          ${dayEvents.length ? dayEvents.slice(0, compact ? 3 : 6).map((event) => {
            const member = detectMemberForEvent(event);
            return `<div class="event-item member-tint" style="--member-color:${member?.color || colorForMember("family")}">
              <div class="event-title">${escapeHtml(event.summary || "Ohne Titel")}</div>
              <p class="event-meta">${escapeHtml(formatEventTime(event))}${member ? ` · ${escapeHtml(member.name)}` : ""}</p>
            </div>`;
          }).join("") : '<div class="empty-state thin">Keine Termine</div>'}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function generateWeekHeadline() {
  const summaries = state.events.map((event) => String(event.summary || "")).filter(Boolean);
  const joined = summaries.join(" ").toLowerCase();
  const byName = (name) => summaries.filter((summary) => summary.toLowerCase().includes(name)).length;

  if (joined.includes("ostern") || joined.includes("oster")) return "Osterwoche";
  if (joined.includes("schule") && byName("olivia") >= 2) return "Olivias grosse Woche";
  if (joined.includes("geburtstag") || joined.includes("party")) return "Feierwoche";
  if (byName("olivia") >= 2) return "Olivias grosse Woche";
  if (byName("martin") >= 2) return "Martins volle Woche";
  if (joined.includes("schule") || joined.includes("test") || joined.includes("arbeit")) return "Lern- und Arbeitswoche";
  if (summaries.length >= 8) return "Viel los diese Woche";
  return "Unsere Woche";
}

function renderMonthCalendar() {
  const { start, days } = buildMonthMatrix();
  const groupedEvents = eventsByDay();
  const visibleEvents = [...state.events]
    .sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0))
    .slice(0, 12);
  return `
    <section class="panel month-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Kalender</p>
          <h2>${monthNames[start.getMonth()]} ${start.getFullYear()}</h2>
          <p class="card-copy">Monatsansicht fur den Gesamtuberblick.</p>
        </div>
        <div class="month-toolbar">
          <div class="segment-row">${state.family.map((member) => `<span class="member-pill" style="--member-color:${member.color}; border-left:6px solid ${member.color}">${escapeHtml(member.name)}</span>`).join("")}</div>
          <div class="inline-actions">
            <button class="ghost-button month-nav-button" type="button" data-month-nav="-1">Zuruck</button>
            <button class="ghost-button month-nav-button" type="button" data-month-nav="0">Heute</button>
            <button class="ghost-button month-nav-button" type="button" data-month-nav="1">Weiter</button>
          </div>
        </div>
      </div>
      <div class="month-weekdays">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => `<div class="month-weekday">${d}</div>`).join("")}</div>
      <div class="month-grid">${days.map((day) => {
        const key = isoDate(day);
        const items = (groupedEvents.get(key) || []).slice(0, 3);
        const inMonth = day.getMonth() === start.getMonth();
        const isToday = key === isoDate(new Date());
        return `<article class="month-cell ${inMonth ? "" : "outside"} ${isToday ? "today" : ""}">
          <div class="month-cell-head">${day.getDate()}</div>
          <div class="month-cell-events">${items.length ? items.map((event) => {
            const member = detectMemberForEvent(event);
            return `<div class="month-event" style="--member-color:${member?.color || colorForMember("family")}">${escapeHtml(event.summary || "Ohne Titel")}</div>`;
          }).join("") : ""}</div>
        </article>`;
      }).join("")}</div>
      <div class="month-event-list">
        <h3>Anstehende Termine</h3>
        ${visibleEvents.length ? visibleEvents.map((event) => {
          const member = detectMemberForEvent(event);
          return `<div class="month-event-row" style="--member-color:${member?.color || colorForMember("family")}">
            <div class="month-event-date">${escapeHtml(formatEventTime(event))}</div>
            <div><div class="event-title">${escapeHtml(event.summary || "Ohne Titel")}</div><p class="event-meta">${member ? escapeHtml(member.name) : escapeHtml(event.calendar_label || "")}</p></div>
          </div>`;
        }).join("") : '<div class="empty-state">In diesem Zeitraum wurden keine Termine geladen.</div>'}
      </div>
    </section>`;
}

function renderPhotoPanel() {
  const today = new Date();
  const panel = document.createElement("section");
  panel.className = "panel side-panel photo-panel ideas-panel";
  panel.innerHTML = `
    <div class="panel-head tight">
      <div>
        <p class="eyebrow">Bilder</p>
        <h3>Archiv, Kamera & OpenRouter</h3>
      </div>
      <div class="photo-status ${state.imageStatus.configured ? "ok" : "warn"}">
        ${state.imageStatus.configured ? `OpenRouter aktiv · ${escapeHtml(state.imageStatus.model || "")}` : "OpenRouter noch nicht konfiguriert"}
      </div>
    </div>
    <div class="photo-stage compact-photo">
      <p class="muted">Familienbilder bleiben langfristig im Archiv. Hier konnen neue Bilder aufgenommen, gespeichert und mit OpenRouter generiert werden.</p>
      <p class="small-line">${today.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}</p>
    </div>
    <form class="image-generate-form">
      <textarea rows="3" class="image-prompt-input" placeholder="Bildidee fur heute... z. B. 'Ein warmes Osterbild mit Fruhlingslicht und Familiengefuhl im Aquarellstil'"></textarea>
      <div class="image-actions">
        <button class="ghost-button" type="submit">Bild generieren</button>
        <label class="camera-action">
          <span>Foto aufnehmen</span>
          <input type="file" accept="image/*" capture="environment" />
        </label>
      </div>
    </form>
    <div class="ideas-list">
      <button class="idea-item image-idea-button" type="button" data-image-idea="Familienbild des Tages fur diese Woche, freundlich, warm, wohnlich.">Familienbild des Tages</button>
      <button class="idea-item image-idea-button" type="button" data-image-idea="Sanfter Wochenimpuls fur die Familie als hochwertiges Editorial-Bild mit Natur und Zuhause.">Wochenimpuls</button>
      <button class="idea-item image-idea-button" type="button" data-image-idea="Erinnere an die aktuelle Woche aus dem Kalender als atmospharische Szene, freundlich und modern.">Kalenderbild</button>
    </div>
    <div class="image-gallery">
      ${state.images.length ? state.images.map((item) => `
        <article class="image-card">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.prompt || item.originalName || "Familienbild")}" loading="lazy" />
          <div class="image-card-meta">
            <div class="image-card-title">${escapeHtml(item.kind === "generated" ? "Generiert" : "Archiv")}</div>
            <p class="muted">${escapeHtml(item.prompt || item.originalName || "Ohne Beschreibung")}</p>
          </div>
        </article>
      `).join("") : '<div class="empty-state">Noch keine Bilder im lokalen Archiv.</div>'}
    </div>`;

  const promptInput = panel.querySelector(".image-prompt-input");
  const form = panel.querySelector(".image-generate-form");
  const uploadInput = panel.querySelector("input[type='file']");

  panel.querySelectorAll(".image-idea-button").forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.imageIdea || "";
      promptInput.focus();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    submit.textContent = "Generiere...";
    try {
      const data = await jsonFetch("/api/images/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona: "family", prompt })
      });
      state.images = [...(data.items || []), ...state.images].slice(0, 12);
      promptInput.value = "";
      renderView();
    } catch (error) {
      alert(error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Bild generieren";
    }
  });

  uploadInput.addEventListener("change", async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
      reader.readAsDataURL(file);
    });

    try {
      const data = await jsonFetch("/api/images/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          persona: "family",
          filename: file.name,
          dataUrl,
          caption: ""
        })
      });
      state.images = [data.item, ...state.images].slice(0, 12);
      renderView();
    } catch (error) {
      alert(error.message);
    } finally {
      uploadInput.value = "";
    }
  });

  return panel;
}

function renderMealFinderPanel() {
  const finder = state.mealFinder || { todaySuggestions: [], favorites: [], quickOptions: [], tryAgain: [], stats: { topThisYear: [] } };
  const suggestions = [
    ...finder.todaySuggestions || [],
    ...finder.favorites || [],
    ...finder.quickOptions || [],
    ...finder.tryAgain || []
  ].filter((meal, index, list) => list.findIndex((item) => item.title === meal.title) === index).slice(0, 16);

  const section = document.createElement("section");
  section.className = "panel meal-finder-panel";
  section.innerHTML = `
    <div class="panel-head tight">
      <div>
        <p class="eyebrow">Essen</p>
        <h3>Essensfinder</h3>
        <p class="card-copy">Kompakte Vorschlage fur die Woche. Zieh ein Gericht in einen Tag im Wochenplaner.</p>
      </div>
      <div class="meal-stats">
        ${finder.stats?.topThisYear?.length
          ? `<span>Meistgekocht 2026: ${escapeHtml(finder.stats.topThisYear[0].title)}</span>`
          : `<span>Vorschlage wechseln laufend</span>`}
      </div>
    </div>
    <div class="meal-finder-grid compact-meal-grid inspiration-grid">
      ${suggestions.length ? suggestions.map((meal) => `
        <article class="meal-finder-card inspiration-card">
          <div class="meal-title">${escapeHtml(meal.title)}</div>
          <p class="event-meta">${escapeHtml(meal.notes || meal.tags?.join(", ") || "Idee fur diese Woche")}</p>
          <button class="meal-chip compact-chip meal-assign-chip" type="button" draggable="true" data-meal-title="${escapeHtml(meal.title)}" data-meal-notes="${escapeHtml(meal.notes || "")}">${escapeHtml(meal.title)}</button>
        </article>
      `).join("") : '<div class="empty-state thin">Noch keine Vorschlage</div>'}
    </div>`;

  section.querySelectorAll(".meal-assign-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/json", JSON.stringify({
        title: chip.dataset.mealTitle,
        notes: chip.dataset.mealNotes || ""
      }));
      chip.classList.add("dragging");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
  });

  return section;
}

function renderShoppingPanel() {
  const fragment = el.shoppingTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".shopping-panel");
  const list = root.querySelector(".shopping-list");
  const form = root.querySelector(".shopping-form");
  const input = form.querySelector("input");
  const clearDone = root.querySelector(".clear-done");
  root.querySelector(".eyebrow").textContent = "Familie";
  root.querySelector("h3").textContent = "Einkauf, Aufgaben & Familiennotizen";
  root.insertAdjacentHTML("beforeend", `<div class="task-block"><label class="notes-label">Familienaufgaben</label><div class="task-list"></div><form class="task-form"><input type="text" placeholder="Neue Aufgabe..." /><button type="submit">+</button></form></div>`);
  root.insertAdjacentHTML("beforeend", `
    <div class="family-notes-block">
      <label class="notes-label" for="family-notes-input">Familiennotizen</label>
      <textarea id="family-notes-input" class="note-box family-note-box" rows="5" placeholder="Kurze Hinweise, Erinnerungen, Dinge fur diese Woche...">${escapeHtml(state.familyNotes.text || "")}</textarea>
      <div class="notes-actions">
        <button class="ghost-button save-notes" type="button">Notizen speichern</button>
        <span class="notes-meta">${state.familyNotes.updatedAt ? `Aktualisiert ${new Date(state.familyNotes.updatedAt).toLocaleString("de-DE")}` : "Noch keine gespeicherten Notizen"}</span>
      </div>
    </div>
  `);
  const noteBox = root.querySelector(".family-note-box");
  const saveNotes = root.querySelector(".save-notes");
  const taskList = root.querySelector(".task-list");
  const taskForm = root.querySelector(".task-form");
  const taskInput = taskForm.querySelector("input");

  const render = () => {
    list.innerHTML = state.shopping.length ? state.shopping.map((item) => `<div class="shopping-item">
      <button class="shopping-toggle ${item.done ? "done" : ""}" data-id="${item.id}" type="button"></button>
      <div class="shopping-text ${item.done ? "done" : ""}">${escapeHtml(item.text)}</div>
      <button class="shopping-delete" data-id="${item.id}" type="button">×</button>
    </div>`).join("") : '<div class="empty-state thin">Die Liste ist leer.</div>';

    list.querySelectorAll(".shopping-toggle").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.id);
        const item = state.shopping.find((entry) => entry.id === id);
        if (!item) return;
        item.done = !item.done;
        render();
        try {
          await jsonFetch(`/api/shopping/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ done: item.done }) });
        } catch (error) {
          alert(error.message);
        }
      });
    });

    list.querySelectorAll(".shopping-delete").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.id);
        await jsonFetch(`/api/shopping/${id}`, { method: "DELETE" });
        state.shopping = state.shopping.filter((entry) => entry.id !== id);
        render();
      });
    });

    taskList.innerHTML = state.tasks.length
      ? state.tasks.map((item) => `<div class="shopping-item">
        <button class="shopping-toggle ${item.done ? "done" : ""}" data-task-toggle="${item.id}" type="button"></button>
        <div class="shopping-text ${item.done ? "done" : ""}">${escapeHtml(item.text)}</div>
        <button class="shopping-delete" data-task-delete="${item.id}" type="button">×</button>
      </div>`).join("")
      : '<div class="empty-state thin">Noch keine Familienaufgaben.</div>';

    taskList.querySelectorAll("[data-task-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.taskToggle);
        const item = state.tasks.find((entry) => entry.id === id);
        if (!item) return;
        item.done = !item.done;
        render();
        try {
          await jsonFetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ done: item.done })
          });
        } catch (error) {
          alert(error.message);
        }
      });
    });

    taskList.querySelectorAll("[data-task-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.taskDelete);
        await jsonFetch(`/api/tasks/${id}`, { method: "DELETE" });
        state.tasks = state.tasks.filter((entry) => entry.id !== id);
        render();
      });
    });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const data = await jsonFetch("/api/shopping", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, addedBy: "Familie" }) });
    state.shopping.push(data.item);
    input.value = "";
    render();
  });

  clearDone.addEventListener("click", async () => {
    const done = state.shopping.filter((item) => item.done);
    for (const item of done) await jsonFetch(`/api/shopping/${item.id}`, { method: "DELETE" }).catch(() => {});
    state.shopping = state.shopping.filter((item) => !item.done);
    const doneTasks = state.tasks.filter((item) => item.done);
    for (const item of doneTasks) await jsonFetch(`/api/tasks/${item.id}`, { method: "DELETE" }).catch(() => {});
    state.tasks = state.tasks.filter((item) => !item.done);
    render();
  });

  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const data = await jsonFetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, source: "family-ui" })
    });
    state.tasks.push(data.item);
    taskInput.value = "";
    render();
  });

  saveNotes.addEventListener("click", async () => {
    try {
      const data = await jsonFetch("/api/notes/family", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: noteBox.value.trim() })
      });
      state.familyNotes = data.notes || { text: noteBox.value.trim(), updatedAt: new Date().toISOString() };
      renderView();
    } catch (error) {
      alert(error.message);
    }
  });

  render();
  return root;
}

function renderChatPanel(persona) {
  const details = PERSONA_DETAILS[persona] || PERSONA_DETAILS.family;
  const fragment = el.chatTemplate.content.cloneNode(true);
  const panel = fragment.querySelector(".chat-panel");
  const title = panel.querySelector(".chat-title");
  const log = panel.querySelector(".chat-log");
  const form = panel.querySelector(".chat-form");
  const textarea = form.querySelector("textarea");
  const submitButton = form.querySelector("button[type='submit']");
  title.textContent = persona === "family" ? "Familienchat" : `${details.name} & Nummer12`;
  textarea.placeholder = persona === "family" ? "Frag Nummer12 nach Woche, Essen oder Zuhause..." : `Schreib an Nummer12 als ${details.name}...`;

  if (SpeechRecognitionCtor) {
    const micButton = document.createElement("button");
    micButton.type = "button";
    micButton.className = "ghost-button mic-button";
    micButton.textContent = "Sprache";
    form.insertBefore(micButton, submitButton);

    let recognition = null;
    let listening = false;

    const stopListening = () => {
      listening = false;
      micButton.classList.remove("listening");
      micButton.textContent = "Sprache";
    };

    micButton.addEventListener("click", () => {
      if (listening && recognition) {
        recognition.stop();
        return;
      }

      recognition = new SpeechRecognitionCtor();
      recognition.lang = "de-DE";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        listening = true;
        micButton.classList.add("listening");
        micButton.textContent = "Hore zu...";
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();
        if (transcript) {
          textarea.value = transcript;
          textarea.focus();
        }
      };

      recognition.onerror = () => {
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      recognition.start();
    });
  }

  const render = () => {
    log.innerHTML = getChatHistory(persona).map((entry) => `<div class="chat-bubble ${entry.role}">
      <div class="chat-name">${entry.role === "user" ? details.name : "Nummer12"}</div>
      <div>${escapeHtml(entry.text).replace(/\n/g, "<br>")}</div>
    </div>`).join("");
    log.scrollTop = log.scrollHeight;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = textarea.value.trim();
    if (!message) return;
    pushChat(persona, "user", message);
    textarea.value = "";
    render();
    const history = getChatHistory(persona).slice(-8).map((entry) => `${entry.role === "user" ? details.name : "Nummer12"}: ${entry.text}`).join("\n");
    const profile = profileForPerson(persona);
    const profileContext = persona !== "family"
      ? [
          `Steckbrief: ${profile.summary || details.intro || ""}`,
          `Alter: ${profile.age || "unbekannt"}`,
          `Interessen: ${(profile.interests || []).join(", ") || details.interests.map((item) => item.title).join(", ")}`,
          `Aktuelle Vorlieben: ${(profile.currentFavorites || []).join(", ") || "keine"}`,
          `Aktuelle Themen: ${(profile.currentTopics || []).join(", ") || "keine"}`,
          `Hinweise fur Nummer12: ${(profile.notesForNummer12 || []).join(" | ") || "keine"}`
        ].join("\n")
      : "";
    const context = `${details.prompt}\nPersona: ${details.name}\n${profileContext}\nLetzte Nachrichten:\n${history}`;
    try {
      const data = await jsonFetch("/api/nummer12/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, context, persona }) });
      pushChat(persona, "bot", data.reply || "Keine Antwort erhalten.");
    } catch (error) {
      pushChat(persona, "bot", `Fehler: ${error.message}`);
    }
    render();
  });

  render();
  return panel;
}

function renderDailyImageCard(persona, title = "Bild des Tages", options = {}) {
  const item = state.dailyImages[persona] || null;
  const compact = Boolean(options.compact);
  const card = createNodeFromHtml(`
    <section class="panel ideas-panel daily-image-panel ${compact ? "compact" : ""}">
      <div class="panel-head tight">
        <div>
          <p class="eyebrow">Bild des Tages</p>
          <h3>${escapeHtml(title)}</h3>
          <p class="card-copy">Baut auf Jahreszeit, Terminen und personlichen Bildern auf.</p>
        </div>
      </div>
      <div class="photo-stage daily-image-frame">
        ${item?.url ? `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.prompt || title)}" loading="lazy" />` : '<div class="empty-state">Noch kein Tagesbild geladen.</div>'}
      </div>
      <p class="small-line">${escapeHtml(item?.reused ? "Heute bereits erzeugt" : item?.prompt || "Das Bild wird fur diesen Bereich automatisch gepflegt.")}</p>
      <div class="image-actions">
        <label class="camera-action">
          <span>Foto hinzufugen</span>
          <input type="file" accept="image/*" capture="environment" />
        </label>
        <span class="small-line">Bildwunsche bitte direkt im Chat an Nummer12.</span>
      </div>
    </section>
  `);

  const uploadInput = card.querySelector("input[type='file']");

  uploadInput.addEventListener("change", async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
      reader.readAsDataURL(file);
    });
    try {
      await jsonFetch("/api/images/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona, filename: file.name, dataUrl, caption: "" })
      });
      const daily = await jsonFetch(`/api/images/daily?persona=${encodeURIComponent(persona)}`).catch(() => ({ item: null }));
      if (daily.item) state.dailyImages[persona] = daily.item;
      renderView();
    } catch (error) {
      alert(error.message);
    } finally {
      uploadInput.value = "";
    }
  });

  return card;
}

function renderSchedulePanel(personId, options = {}) {
  const title = options.title || "Diese Woche";
  const emptyText = options.emptyText || "Noch keine Termine erkannt.";
  const compact = Boolean(options.compact);
  const hideEmpty = Boolean(options.hideEmpty);
  const grouped = new Map();
  for (const event of eventsForPersona(personId)) {
    const raw = event.start?.dateTime || event.start?.date;
    if (!raw) continue;
    const key = isoDate(new Date(raw));
    const list = grouped.get(key) || [];
    list.push(event);
    grouped.set(key, list);
  }
  const visibleDays = state.days.filter((day) => {
    const key = isoDate(day);
    return !hideEmpty || (grouped.get(key) || []).length;
  });

  return createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">${personId === "nina" ? "Kalender" : personId === "martin" ? "Woche" : "Schule & Termine"}</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="module-stack">
        ${visibleDays.length ? visibleDays.map((day) => {
          const key = isoDate(day);
          const items = (grouped.get(key) || []).slice().sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
          return `<div class="module-card">
            <div class="person-name">${escapeHtml(dayNames[day.getDay()])}, ${day.getDate()}.${day.getMonth() + 1}.</div>
            ${items.length
              ? items.slice(0, compact ? 2 : 4).map((event) => `<p class="muted">${escapeHtml(formatEventTime(event))} · ${escapeHtml(event.summary || "Ohne Titel")}</p>`).join("")
              : `<p class="muted">${escapeHtml(emptyText)}</p>`}
          </div>`;
        }).join("") : `<div class="empty-state thin">${escapeHtml(emptyText)}</div>`}
      </div>
    </section>
  `);
}

function renderUpcomingEventsPanel(personId, options = {}) {
  const title = options.title || "Wichtige Termine";
  const emptyText = options.emptyText || "Keine wichtigen anstehenden Termine erkannt.";
  const items = upcomingEventsForPersona(personId, options.limit || 6);
  return createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">${personId === "selma" ? "Wichtig" : "Upcoming"}</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="module-stack">
        ${items.length ? items.map((event) => `<div class="module-card">
          <div class="person-name">${escapeHtml(event.summary || "Ohne Titel")}</div>
          <p class="muted">${escapeHtml(new Date(event.start?.dateTime || event.start?.date || Date.now()).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }))} · ${escapeHtml(formatEventTime(event))}</p>
        </div>`).join("") : `<div class="empty-state thin">${escapeHtml(emptyText)}</div>`}
      </div>
    </section>
  `);
}

function openTasks(limit = 6) {
  return (state.tasks || []).filter((item) => !item.done).slice(0, limit);
}

function buildFamilyPresence() {
  const nextEvent = upcomingEventsForPersona("family", 1)[0] || null;
  const pendingTasks = openTasks(3);
  const noDinnerPlan = Object.keys(state.mealAssignments || {}).length < 3;
  if (nextEvent) {
    return {
      title: `${nextEvent.summary || "Etwas"} steht als Nächstes an`,
      body: `Ich halte die Woche im Blick. Der nächste relevante Termin ist ${new Date(nextEvent.start?.dateTime || nextEvent.start?.date || Date.now()).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}${formatEventTime(nextEvent) !== "Ganztag" ? ` um ${formatEventTime(nextEvent)}` : ""}.`,
      chips: [
        `${upcomingEventsForPersona("family", 6).length} kommende Termine`,
        pendingTasks.length ? `${pendingTasks.length} offene Aufgaben` : "keine offenen Aufgaben",
        noDinnerPlan ? "Abendessen noch offen" : "Essen teils geplant"
      ]
    };
  }
  return {
    title: "Ich halte das Zuhause im Takt",
    body: "Sprich mit mir, wenn ich Termine eintragen, Bilder erzeugen, Erinnerungen ableiten oder etwas fuer die Familie ordnen soll.",
    chips: [
      `${pendingTasks.length} offene Aufgaben`,
      noDinnerPlan ? "Abendessen noch offen" : "Woche vorbereitet",
      state.calendarConnected ? "Kalender verbunden" : "Kalender getrennt"
    ]
  };
}

function buildPersonPresence(personId) {
  const details = PERSONA_DETAILS[personId] || PERSONA_DETAILS.family;
  const nextEvent = upcomingEventsForPersona(personId, 1)[0] || null;
  if (nextEvent) {
    return {
      title: `${details.name}: als Nächstes ${nextEvent.summary || "ein Termin"}`,
      body: `Nummer12 sieht fuer ${details.name} gerade vor allem den naechsten wichtigen Schritt und haelt den Rest im Hintergrund zusammen.`,
      chips: [
        `${upcomingEventsForPersona(personId, 6).length} relevante Termine`,
        personId === "olivia" || personId === "yuna" || personId === "selma" ? "Stundenplan aktiv" : "persoenlicher Fokus",
        state.dailyImages[personId] ? "Bild des Tages bereit" : "Bild im Aufbau"
      ]
    };
  }
  return {
    title: `${details.name}: ruhiger Modus`,
    body: `Gerade ist nichts Dringendes eingetragen. Der Chat ist die schnellste Art, Nummer12 zu sagen, was jetzt wichtig wird.`,
    chips: [
      personId === "olivia" || personId === "yuna" || personId === "selma" ? "Stundenplan aktiv" : "kein unmittelbarer Termin",
      state.dailyImages[personId] ? "Bild des Tages bereit" : "Bild im Aufbau",
      "Chat im Zentrum"
    ]
  };
}

function renderPresenceHero(persona = "family") {
  const presence = persona === "family" ? buildFamilyPresence() : buildPersonPresence(persona);
  return createNodeFromHtml(`
    <section class="panel presence-hero-panel">
      <div class="panel-head tight">
        <div>
          <p class="eyebrow">${persona === "family" ? "Nummer12 im Haus" : "Nummer12 fur " + escapeHtml((PERSONA_DETAILS[persona] || {}).name || persona)}</p>
          <h2 class="presence-title">${escapeHtml(presence.title)}</h2>
          <p class="card-copy">${escapeHtml(presence.body)}</p>
        </div>
      </div>
      <div class="presence-chip-row">
        ${(presence.chips || []).map((chip) => `<span class="presence-chip">${escapeHtml(chip)}</span>`).join("")}
      </div>
    </section>
  `);
}

function renderFamilyStream() {
  const nextEvents = upcomingEventsForPersona("family", 4);
  const tasks = openTasks(4);
  const items = [
    ...nextEvents.map((event) => ({
      type: "Termin",
      title: event.summary || "Ohne Titel",
      meta: `${new Date(event.start?.dateTime || event.start?.date || Date.now()).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${formatEventTime(event)}`
    })),
    ...tasks.map((task) => ({
      type: "Offen",
      title: task.text,
      meta: "Familienaufgabe"
    }))
  ].slice(0, 8);

  return createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head tight">
        <div>
          <p class="eyebrow">Kontextstream</p>
          <h3>Was Nummer12 gerade fuer wichtig haelt</h3>
        </div>
      </div>
      <div class="stream-list">
        ${items.length ? items.map((item) => `<article class="stream-item">
          <div class="stream-type">${escapeHtml(item.type)}</div>
          <div class="stream-body">
            <div class="stream-title">${escapeHtml(item.title)}</div>
            <p class="event-meta">${escapeHtml(item.meta)}</p>
          </div>
        </article>`).join("") : '<div class="empty-state thin">Noch keine aktuellen Dinge im Stream.</div>'}
      </div>
    </section>
  `);
}

function renderPersonStream(personId) {
  const nextEvents = upcomingEventsForPersona(personId, 5);
  const details = PERSONA_DETAILS[personId] || PERSONA_DETAILS.family;
  const items = nextEvents.map((event) => ({
    type: "Als Nächstes",
    title: event.summary || "Ohne Titel",
    meta: `${new Date(event.start?.dateTime || event.start?.date || Date.now()).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${formatEventTime(event)}`
  }));
  return createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head tight">
        <div>
          <p class="eyebrow">Stream</p>
          <h3>${escapeHtml(details.name)} im Blick</h3>
        </div>
      </div>
      <div class="stream-list">
        ${items.length ? items.map((item) => `<article class="stream-item">
          <div class="stream-type">${escapeHtml(item.type)}</div>
          <div class="stream-body">
            <div class="stream-title">${escapeHtml(item.title)}</div>
            <p class="event-meta">${escapeHtml(item.meta)}</p>
          </div>
        </article>`).join("") : '<div class="empty-state thin">Noch nichts, was Nummer12 gerade nach vorne zieht.</div>'}
      </div>
    </section>
  `);
}

function renderDropboxPanel(personId) {
  const panel = createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Persoenlicher Eingang</p>
          <h3>Einladung, Bild oder Datei ablegen</h3>
          <p class="card-copy">Alles landet im persoenlichen Bereich und kann spaeter von Nummer12 ausgewertet werden.</p>
        </div>
      </div>
      <form class="profile-form" data-dropbox-form="${escapeHtml(personId)}">
        <label class="profile-field">
          <span>Titel</span>
          <input type="text" name="title" placeholder="z. B. Einladung Geburtstag Maya" />
        </label>
        <label class="profile-field">
          <span>Notiz</span>
          <textarea name="text" rows="3" placeholder="Kurze Info fur Nummer12..."></textarea>
        </label>
        <label class="camera-action">
          <span>Datei oder Bild hinzufugen</span>
          <input type="file" name="file" />
        </label>
        <div class="profile-actions">
          <button class="ghost-button" type="submit">Im persoenlichen Eingang ablegen</button>
        </div>
      </form>
    </section>
  `);

  const form = panel.querySelector(`[data-dropbox-form="${personId}"]`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const file = form.querySelector("input[name='file']").files?.[0] || null;
    let dataUrl = "";
    if (file) {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
        reader.readAsDataURL(file);
      });
    }
    try {
      await jsonFetch("/api/dropbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: personId,
          title: formData.get("title"),
          text: formData.get("text"),
          filename: file?.name || "",
          dataUrl,
          source: "person-page-dropbox"
        })
      });
      form.reset();
      alert("Im persoenlichen Eingang gespeichert.");
    } catch (error) {
      alert(error.message);
    }
  });

  return panel;
}

function renderAcademicPanel(personId) {
  const academic = state.academics[personId] || { timetableNotes: "", grades: [], notes: "" };
  const section = createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Schule</p>
          <h3>${personId === "olivia" ? "Stundenplan & Notenspiegel" : "Stundenplan"}</h3>
          <p class="card-copy">Ableitbar aus Google Calendar, mit Raum fur schulische Notizen.</p>
        </div>
      </div>
      <form class="profile-form" data-academic-form="${escapeHtml(personId)}">
        <label class="profile-field"><span>Stundenplan / Hinweise</span><textarea name="timetableNotes" rows="4">${escapeHtml(academic.timetableNotes || "")}</textarea></label>
        ${personId === "olivia" ? `<label class="profile-field"><span>Notenspiegel</span><textarea name="gradesText" rows="4" placeholder="Mathe: 2\nDeutsch: 2-\nSachkunde: 1">${escapeHtml((academic.grades || []).map((entry) => `${entry.subject}: ${entry.grade}`).join("\n"))}</textarea></label>` : ""}
        <label class="profile-field"><span>Weitere Hinweise</span><textarea name="notes" rows="3">${escapeHtml(academic.notes || "")}</textarea></label>
        <div class="profile-actions">
          <button class="ghost-button" type="submit">Schulbereich speichern</button>
        </div>
      </form>
    </section>
  `);

  const form = section.querySelector(`[data-academic-form="${personId}"]`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      const gradesText = String(formData.get("gradesText") || "");
      const grades = gradesText
        .split("\n")
        .map((line) => line.split(":"))
        .filter((parts) => parts[0]?.trim())
        .map((parts) => ({ subject: parts[0].trim(), grade: (parts.slice(1).join(":") || "").trim() }));
      const data = await jsonFetch(`/api/academics/${personId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          timetableNotes: formData.get("timetableNotes"),
          notes: formData.get("notes"),
          grades
        })
      });
      state.academics[personId] = data.academic || academic;
      renderView();
    } catch (error) {
      alert(error.message);
    }
  });

  return section;
}

function renderTimetablePanel(personId, options = {}) {
  const plan = activeSchedulePlan(personId);
  const title = options.title || (personId === "selma" ? "Wochenrhythmus" : "Stundenplan");
  const weekdayLabels = [
    ["monday", "Montag"],
    ["tuesday", "Dienstag"],
    ["wednesday", "Mittwoch"],
    ["thursday", "Donnerstag"],
    ["friday", "Freitag"]
  ];
  const todayKey = weekdayKeyFromDate(new Date());
  const section = createNodeFromHtml(`
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">${personId === "selma" ? "Kindergarten" : "Stundenplan"}</p>
          <h3>${escapeHtml(title)}</h3>
          <p class="card-copy">${escapeHtml(plan.label || "Stundenplan")}${plan.weekModel === "a_b" ? " · A/B-Woche vorbereitet" : ""}</p>
        </div>
      </div>
      <div class="timetable-grid">
        ${weekdayLabels.map(([dayKey, label]) => {
          const slots = plan.days?.[dayKey] || [];
          return `<div class="timetable-day ${todayKey === dayKey ? "today" : ""}">
            <div class="timetable-day-head">
              <div class="person-name">${label}</div>
              <span class="small-line">${slots.length ? `${slots.length} Blocke` : ""}</span>
            </div>
            ${slots.length
              ? `<div class="timetable-slots">${slots.map((slot) => `<div class="timetable-slot">
                  <div class="timetable-slot-top">
                    <span class="timetable-slot-index">${escapeHtml(String(slot.slot))}</span>
                    <span class="small-line">${escapeHtml(slot.start || "")}${slot.end ? `-${escapeHtml(slot.end)}` : ""}</span>
                  </div>
                  <div class="timetable-slot-subject">${escapeHtml(slot.subject || "")}</div>
                  ${slot.note ? `<p class="event-meta">${escapeHtml(slot.note)}</p>` : ""}
                </div>`).join("")}</div>`
              : `<p class="muted">${personId === "selma" ? "Noch kein Rhythmus hinterlegt." : "Noch keine Stunden eingetragen."}</p>`}
          </div>`;
        }).join("")}
      </div>
      <p class="small-line">Aenderungen sollen spaeter direkt uber Nummer12 erfolgen, nicht uber Pflegeformulare.</p>
    </section>
  `);

  return section;
}

function renderHome() {
  const home = document.createElement("div");
  home.className = "view-stack";
  home.innerHTML = `
    <section class="presence-layout" id="family-presence-hero-slot"></section>
    <section class="presence-layout">
      <section class="panel board-panel main-planner-panel">
        <div class="board-header">
          <div class="board-title-wrap">
            <h2 class="board-title">Wochenplaner</h2>
            <p class="board-theme">${escapeHtml(generateWeekHeadline())}</p>
            <p class="card-copy">Die Woche bleibt sichtbar, aber Nummer12 fuehrt durch Relevanz statt durch Widgets.</p>
          </div>
        </div>
        ${renderWeekPlanner(false)}
      </section>
      <div id="home-daily-image-slot"></div>
    </section>
    <section class="presence-chat-shell" id="home-chat-slot"></section>
    <section class="presence-layout">
      <div id="home-stream-slot"></div>
      <div id="home-meal-slot"></div>
    </section>`;

  home.querySelector("#family-presence-hero-slot").replaceWith(renderPresenceHero("family"));
  home.querySelector("#home-daily-image-slot").replaceWith(renderDailyImageCard("family", "Familienbild des Tages", { compact: true }));
  home.querySelector("#home-stream-slot").replaceWith(renderFamilyStream());
  home.querySelector("#home-meal-slot").replaceWith(renderMealFinderPanel());
  const familyChat = renderChatPanel("family");
  familyChat.classList.add("home-chat-panel", "presence-chat-panel");
  home.querySelector("#home-chat-slot").replaceWith(familyChat);
  return home;
}

function renderCalendarPage() {
  const root = document.createElement("div");
  root.className = "view-stack";
  root.innerHTML = renderMonthCalendar();
  root.querySelectorAll("[data-month-nav]").forEach((button) => {
    button.addEventListener("click", async () => {
      const delta = Number(button.dataset.monthNav);
      const base = currentCalendarViewDate();
      state.calendarViewDate = delta === 0 ? new Date() : new Date(base.getFullYear(), base.getMonth() + delta, 1);
      await loadCalendar();
      renderView();
    });
  });
  return root;
}

function renderEnergyGrid() {
  const candidates = [
    { label: "Verbrauch", keys: ["load_consumed", "real_power", "verbrauch"] },
    { label: "Solar", keys: ["photovoltaics", "solar"] },
    { label: "Batterie", keys: ["battery", "state_of_charge", "batterie"] },
    { label: "Netz", keys: ["grid_import", "grid_export"] }
  ];
  const resolve = (keywords) => {
    for (const [id, entry] of Object.entries(state.energy)) {
      const hay = `${id} ${entry.friendly_name || ""}`.toLowerCase();
      if (keywords.some((key) => hay.includes(key))) return entry;
    }
    return null;
  };
  return `<div class="energy-grid">${candidates.map((item) => {
    const entry = resolve(item.keys);
    return `<div class="energy-card"><div class="energy-pill">${escapeHtml(item.label)}</div><div class="person-name">${entry ? escapeHtml(String(entry.state)) : "-"}</div><p class="muted">${entry ? escapeHtml(entry.unit || "") : "keine Daten"}</p></div>`;
  }).join("")}</div>`;
}

function groupByArea(items) {
  return ["eg", "og", "aussen"].map((area) => ({ area, items: items.filter((item) => (item.area || guessArea(item)) === area) })).filter((group) => group.items.length > 0);
}

function renderControlPage() {
  const lightGroups = groupByArea(state.lights);
  const shutterGroups = groupByArea(state.shutters);
  const root = document.createElement("div");
  root.className = "view-stack";
  root.innerHTML = `
    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">Licht & Jalo</p><h2>Haussteuerung nach Bereichen</h2><p class="card-copy">Nach EG, OG und Aussen gruppiert.</p></div></div>
      <div class="floor-grid">${["eg", "og", "aussen"].map((area) => {
        const lights = lightGroups.find((group) => group.area === area)?.items || [];
        const shutters = shutterGroups.find((group) => group.area === area)?.items || [];
        return `<section class="control-room floor-room"><div class="control-head"><h3>${AREA_LABELS[area]}</h3><p class="muted">${lights.length} Lichter · ${shutters.length} Jalos</p></div>
          <div class="floor-section"><p class="section-mini">Licht</p><div class="control-button-row">${lights.length ? lights.map((light) => {
            const current = state.lightStates[light.entity_id]?.state || "unavailable";
            const on = current === "on" || current === "open";
            return `<button class="control-button ${on ? "on" : ""}" data-toggle-light="${escapeHtml(light.entity_id)}">${escapeHtml(light.label)} · ${escapeHtml(current)}</button>`;
          }).join("") : '<div class="empty-state thin">Keine Lichter</div>'}</div></div>
          <div class="floor-section"><p class="section-mini">Jalousien</p><div class="shutter-list">${shutters.length ? shutters.map((shutter) => `<div class="shutter-item"><div class="control-head"><div><div class="person-name">${escapeHtml(shutter.label)}</div><p class="muted">${escapeHtml(String(shutter.current_position ?? shutter.state ?? "-"))}</p></div></div><div class="shutter-actions"><button class="shutter-button" data-shutter="open" data-entity="${escapeHtml(shutter.entity_id)}">Auf</button><button class="shutter-button" data-shutter="stop" data-entity="${escapeHtml(shutter.entity_id)}">Stop</button><button class="shutter-button" data-shutter="close" data-entity="${escapeHtml(shutter.entity_id)}">Zu</button></div></div>`).join("") : '<div class="empty-state thin">Keine Jalousien</div>'}</div></div>
        </section>`;
      }).join("")}</div>
    </section>
    <section class="panel"><div class="panel-head"><div><p class="eyebrow">Energie</p><h3>Hausstatus</h3></div></div>${renderEnergyGrid()}</section>`;

  root.querySelectorAll("[data-toggle-light]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await jsonFetch("/api/toggle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity_id: button.dataset.toggleLight }) });
        await loadLights();
        renderView();
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });

  root.querySelectorAll("[data-shutter]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await jsonFetch("/api/shutters/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity_id: button.dataset.entity, action: button.dataset.shutter }) });
        await loadShutters();
        renderView();
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });

  return root;
}

function renderMediaPage() {
  const spotify = state.mediaPlayers.filter((player) => player.is_spotify);
  const others = state.mediaPlayers.filter((player) => !player.is_spotify);
  const root = document.createElement("div");
  root.className = "view-stack";
  root.innerHTML = `
    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">Multimedia</p><h2>Vorhandene HA-Medienplayer</h2><p class="card-copy">Direkt aus Home Assistant gelesen. Spotify-Gerate werden separat hervorgehoben.</p></div></div>
      <div class="media-note">
        <strong>Spotify heute:</strong> Home Assistant zeigt Spotify nur, wenn aktiv etwas spielt oder ein Connect-Player sichtbar ist.
        Fur einen immer sichtbaren Spotify-Startpunkt brauchen wir als nachsten Schritt entweder eine echte Spotify-Integration oder einen festen Connect-Player.
      </div>
      <div class="media-layout">
        <section class="media-column"><h3>Spotify</h3><div class="media-grid">${spotify.length ? spotify.map((player) => `<article class="media-card spotify-card"><div><h4>${escapeHtml(player.label)}</h4><p class="muted">${escapeHtml(player.state || "-")}</p><p class="muted">${escapeHtml(player.media_artist || player.source || player.app_name || "Spotify")}</p>${player.media_title ? `<p class="small-line">${escapeHtml(player.media_title)}</p>` : ""}</div></article>`).join("") : '<div class="empty-state">Noch keine Spotify-Player in HA erkannt.</div>'}</div></section>
        <section class="media-column"><h3>Weitere Medien</h3><div class="media-grid">${others.length ? others.map((player) => `<article class="media-card"><div><h4>${escapeHtml(player.label)}</h4><p class="muted">${escapeHtml(player.state || "-")} · ${escapeHtml(AREA_LABELS[player.area || guessArea(player)] || "Haus")}</p><p class="muted">${escapeHtml(player.app_name || player.source || "Media Player")}</p>${player.media_title ? `<p class="small-line">${escapeHtml(player.media_title)}</p>` : ""}</div></article>`).join("") : '<div class="empty-state">Keine weiteren Medienplayer erkannt.</div>'}</div></section>
      </div>
    </section>`;
  return root;
}

function renderAgendaForPerson(personId) {
  const grouped = eventsByDay();
  return `<div class="module-stack">${state.days.map((day) => {
    const key = isoDate(day);
    const items = (grouped.get(key) || []).filter((event) => detectMemberForEvent(event)?.id === personId);
    return `<div class="module-card"><div class="person-name">${dayNames[day.getDay()]}, ${day.getDate()}.${day.getMonth() + 1}.</div>${items.length ? items.slice(0, 3).map((event) => `<p class="muted">${escapeHtml(formatEventTime(event))} · ${escapeHtml(event.summary || "Ohne Titel")}</p>`).join("") : '<p class="muted">Noch kein personlicher Termin erkannt.</p>'}</div>`;
  }).join("")}</div>`;
}

function renderPersonPage(personId) {
  const details = PERSONA_DETAILS[personId] || PERSONA_DETAILS.family;
  const root = document.createElement("div");
  root.className = "view-stack";
  root.innerHTML = `
    <section id="person-presence-slot"></section>
    <section class="view-stack" id="person-main-stack"></section>`;

  const mainStack = root.querySelector("#person-main-stack");
  const isSchoolChild = personId === "olivia" || personId === "yuna" || personId === "selma";
  root.querySelector("#person-presence-slot").replaceWith(renderPresenceHero(personId));

  if (isSchoolChild) {
    const timetableRow = createNodeFromHtml(`<section class="presence-layout"></section>`);
    timetableRow.append(renderTimetablePanel(personId, { title: personId === "selma" ? "Kindergartenrhythmus" : "Stundenplan" }));
    timetableRow.append(renderPersonStream(personId));
    mainStack.append(timetableRow);
  } else {
    mainStack.append(renderPersonStream(personId));
  }

  const interactionRow = createNodeFromHtml(`<section class="interaction-split"></section>`);
  const chatPanel = renderChatPanel(personId);
  chatPanel.classList.add("home-chat-panel", "presence-chat-panel");
  interactionRow.append(chatPanel);
  interactionRow.append(renderDailyImageCard(personId, `${details.name}s Bild des Tages`, { compact: true }));
  mainStack.append(interactionRow);
  return root;
}

function renderView() {
  renderNav();
  el.viewRoot.innerHTML = "";
  const page = state.route === "home" ? renderHome() : state.route === "calendar" ? renderCalendarPage() : state.route === "control" ? renderControlPage() : state.route === "media" ? renderMediaPage() : renderPersonPage(state.route);
  el.viewRoot.append(page);
}

async function loadStatuses() {
  const [ha, ai, calendar] = await Promise.all([
    fetch("/api/health", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false })),
    fetch("/api/nummer12/health", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ connected: false })),
    fetch("/auth/google/status", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ connected: false }))
  ]);
  state.calendarConnected = Boolean(calendar.connected);
  setStatus(el.dotHa, el.statusHa, "HA", Boolean(ha.ok));
  setStatus(el.dotAi, el.statusAi, "Nummer12", Boolean(ai.connected), ai.model || "");
  setStatus(el.dotCal, el.statusCal, "Kalender", Boolean(calendar.connected));
}

async function loadFamily() {
  const data = await jsonFetch("/api/family").catch(() => ({ members: [] }));
  state.family = data.members || [];
}

async function loadCalendar() {
  const startDate = monthStart();
  const endDate = monthEnd();
  const weekStart = state.days[0] || new Date();
  const weekEnd = state.days[state.days.length - 1] || new Date();
  const start = new Date(Math.min(startDate.getTime(), weekStart.getTime())).toISOString();
  const end = new Date(Math.max(endDate.getTime(), weekEnd.getTime())).toISOString();
  const data = await jsonFetch(`/api/calendar/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`).catch(() => ({ events: [] }));
  state.events = data.events || [];
}

async function loadMeals() {
  const [plan, finder] = await Promise.all([
    jsonFetch("/api/meal-plan").catch(() => ({ days: [] })),
    jsonFetch("/api/meals/finder").catch(() => ({ finder: { todaySuggestions: [], favorites: [], quickOptions: [], tryAgain: [], stats: { historyCount: 0, topThisYear: [] } } }))
  ]);
  const data = plan;
  state.meals = data.days || [];
  state.mealFinder = finder.finder || state.mealFinder;
}

async function loadLights() {
  const data = await jsonFetch("/api/dashboard").catch(() => ({ config: { rooms: [] }, states: {} }));
  state.lights = data.config?.rooms || [];
  state.lightStates = data.states || {};
}

async function loadShutters() {
  const data = await jsonFetch("/api/shutters").catch(() => ({ shutters: [] }));
  state.shutters = data.shutters || [];
}

async function loadEnergy() {
  const data = await jsonFetch("/api/energy").catch(() => ({ energy: {} }));
  state.energy = data.energy || {};
}

async function loadShopping() {
  const [shopping, tasks] = await Promise.all([
    jsonFetch("/api/shopping").catch(() => ({ items: [] })),
    jsonFetch("/api/tasks").catch(() => ({ items: [] }))
  ]);
  state.shopping = shopping.items || [];
  state.tasks = tasks.items || [];
}

async function loadMedia() {
  const data = await jsonFetch("/api/media").catch(() => ({ players: [] }));
  state.mediaPlayers = data.players || [];
}

async function loadProfiles() {
  const members = ["nina", "martin", "olivia", "yuna", "selma"];
  const results = await Promise.all(members.map((id) => jsonFetch(`/api/profiles/${id}`).catch(() => ({ profile: null }))));
  members.forEach((id, index) => {
    if (results[index]?.profile) state.profiles[id] = results[index].profile;
  });
}

async function loadAcademics() {
  const members = ["olivia", "yuna"];
  const results = await Promise.all(members.map((id) => jsonFetch(`/api/academics/${id}`).catch(() => ({ academic: null }))));
  members.forEach((id, index) => {
    if (results[index]?.academic) state.academics[id] = results[index].academic;
  });
}

async function loadSchedules() {
  const members = ["olivia", "yuna", "selma"];
  const results = await Promise.all(members.map((id) => jsonFetch(`/api/schedules/${id}`).catch(() => ({ schedule: null }))));
  members.forEach((id, index) => {
    if (results[index]?.schedule) state.schedules[id] = results[index].schedule;
  });
}

async function loadImages() {
  const personasToLoad = ["family"];
  if (PERSONA_DETAILS[state.route]) personasToLoad.push(state.route);
  const uniquePersonas = [...new Set(personasToLoad)];
  const [status, gallery, ...dailyResults] = await Promise.all([
    jsonFetch("/api/images/status").catch(() => ({ configured: false, model: "" })),
    jsonFetch("/api/images?persona=family&limit=12").catch(() => ({ items: [] })),
    ...uniquePersonas.map((persona) => jsonFetch(`/api/images/daily?persona=${encodeURIComponent(persona)}`).catch(() => ({ item: null })))
  ]);
  state.imageStatus = {
    configured: Boolean(status.configured),
    model: status.model || ""
  };
  state.images = gallery.items || [];
  uniquePersonas.forEach((persona, index) => {
    if (dailyResults[index]?.item) state.dailyImages[persona] = dailyResults[index].item;
  });
}

async function loadFamilyNotes() {
  const data = await jsonFetch("/api/notes/family").catch(() => ({ notes: { text: "", updatedAt: null } }));
  state.familyNotes = data.notes || { text: "", updatedAt: null };
}

async function refreshAll() {
  state.days = buildDays();
  updateWeekLabel();
  await Promise.all([loadStatuses(), loadFamily(), loadCalendar(), loadMeals(), loadLights(), loadShutters(), loadEnergy(), loadShopping(), loadMedia(), loadFamilyNotes(), loadImages(), loadProfiles(), loadAcademics(), loadSchedules()]);
  renderView();
}

async function onRouteChange() {
  state.route = routeFromHash();
  await Promise.all([loadCalendar(), loadImages(), loadAcademics(), loadSchedules()]);
  renderView();
}

window.addEventListener("hashchange", onRouteChange);
state.route = routeFromHash();
refreshAll();
setInterval(() => {
  if (!document.hidden) refreshAll();
}, 60000);
