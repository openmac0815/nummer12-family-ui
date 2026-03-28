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
  lights: [],
  lightStates: {},
  shutters: [],
  shopping: [],
  energy: {},
  family: [],
  mediaPlayers: [],
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
  const groupedMeals = mealsByDate();
  return `<div class="${compact ? "week-grid week-grid-home" : "planner-grid"}">${state.days.map((day, index) => {
    const key = isoDate(day);
    const dayEvents = (groupedEvents.get(key) || []).slice().sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
    const options = groupedMeals.get(key) || [];
    const assigned = state.mealAssignments[key] || null;
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
        <div class="meal-zone ${assigned ? "has-meal" : ""}" data-meal-drop="${key}">
          ${assigned ? `<div class="meal-assigned"><div class="meal-title">${escapeHtml(assigned.title)}</div><p class="event-meta">${escapeHtml(assigned.notes || "")}</p></div>` : '<div class="meal-placeholder">Essensvorschlag hier hineinziehen</div>'}
        </div>
        <div class="meal-suggestions" data-day-meals="${key}">
          ${options.length ? options.map((meal, mealIndex) => `<button class="meal-chip" type="button" draggable="true" data-day="${key}" data-meal-index="${mealIndex}">${escapeHtml(meal.title)}</button>`).join("") : '<div class="empty-state thin">Keine Vorschlage</div>'}
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
    </section>`;
}

function renderPhotoPanel() {
  const today = new Date();
  return `<section class="panel side-panel photo-panel ideas-panel">
    <div class="panel-head tight"><div><p class="eyebrow">Bilder</p><h3>Archiv, Kamera & Generierung</h3></div></div>
    <div class="photo-stage compact-photo">
      <p class="muted">Lokale Bilder bleiben langfristig im Familienarchiv. Danach konnen neue Bilder per Tablet-Kamera aufgenommen und spater mit OpenRouter weiterverarbeitet werden.</p>
      <p class="small-line">${today.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}</p>
    </div>
    <label class="camera-action">
      <span>Foto aufnehmen</span>
      <input type="file" accept="image/*" capture="environment" />
    </label>
    <div class="ideas-list">
      <div class="idea-item">Familienbild des Tages</div>
      <div class="idea-item">Bild-Remix aus dem Archiv</div>
      <div class="idea-item">Wochenimpuls von Nummer12</div>
    </div>
  </section>`;
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
    const context = `${details.prompt}\nPersona: ${details.name}\nInteressen: ${details.interests.map((item) => item.title).join(", ")}\nLetzte Nachrichten:\n${history}`;
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

function bindMealInteractions(root) {
  const meals = mealsByDate();
  root.querySelectorAll(".meal-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/json", JSON.stringify({ dayKey: chip.dataset.day, mealIndex: Number(chip.dataset.mealIndex) }));
      chip.classList.add("dragging");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
    chip.addEventListener("click", () => {
      const options = meals.get(chip.dataset.day) || [];
      const meal = options[Number(chip.dataset.mealIndex)];
      if (!meal) return;
      assignMeal(chip.dataset.day, meal);
      renderView();
    });
  });
  root.querySelectorAll("[data-meal-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      try {
        const payload = JSON.parse(event.dataTransfer.getData("application/json"));
        const meal = (meals.get(payload.dayKey) || [])[payload.mealIndex];
        if (!meal) return;
        assignMeal(zone.dataset.mealDrop, meal);
        renderView();
      } catch {
        // ignore malformed payload
      }
    });
    zone.addEventListener("click", () => {
      if (!state.mealAssignments[zone.dataset.mealDrop]) return;
      delete state.mealAssignments[zone.dataset.mealDrop];
      persistMealAssignments();
      renderView();
    });
  });
}

function renderHome() {
  const weekHeadline = generateWeekHeadline();
  const home = document.createElement("div");
  home.className = "view-stack";
  home.innerHTML = `
    <section class="panel board-panel main-planner-panel">
      <div class="board-header">
        <div class="board-title-wrap">
          <h2 class="board-title">Wochenplaner</h2>
          <p class="board-theme">${escapeHtml(weekHeadline)}</p>
          <p class="card-copy">Unter jedem Tag liegen Essensideen. Zieh einen Vorschlag in den Tag oder tippe ihn an.</p>
        </div>
        <div class="board-dates">
          <span class="board-date-label">vom</span>
          <span class="board-date-value">${state.days[0] ? `${state.days[0].getDate()}.${state.days[0].getMonth() + 1}.` : ""}</span>
          <span class="board-date-label">bis</span>
          <span class="board-date-value">${state.days[6] ? `${state.days[6].getDate()}.${state.days[6].getMonth() + 1}.` : ""}</span>
        </div>
      </div>
      ${renderWeekPlanner(true)}
    </section>
    <section class="home-wide-slot" id="home-shopping-slot"></section>
    <section class="home-wide-slot home-chat-slot" id="home-chat-slot"></section>
    <section class="home-wide-slot" id="home-photo-slot"></section>`;

  home.querySelector("#home-shopping-slot").replaceWith(renderShoppingPanel());
  const familyChat = renderChatPanel("family");
  familyChat.classList.add("home-chat-panel");
  home.querySelector("#home-chat-slot").replaceWith(familyChat);
  home.querySelector("#home-photo-slot").replaceWith(renderPhotoPanel());
  bindMealInteractions(home);
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
    <section class="panel person-hero-card member-palette" style="--member-color:${colorForMember(personId)}">
      <div class="person-hero"><div class="inline-actions"><div class="person-avatar" style="--member-color:${colorForMember(personId)}">${details.emoji}</div><div><p class="eyebrow">Personliche Startseite</p><h2>${escapeHtml(details.name)}</h2><p class="card-copy">${escapeHtml(details.intro)}</p></div></div><span class="person-tag">${escapeHtml(details.title)}</span></div>
    </section>
    <section class="page-grid">
      <div class="column-stack">
        <section class="panel"><div class="panel-head"><div><p class="eyebrow">Agenda</p><h3>Die Woche von ${escapeHtml(details.name)}</h3></div></div>${renderAgendaForPerson(personId)}</section>
        <section class="panel"><div class="panel-head"><div><p class="eyebrow">Interessen</p><h3>Was auf dieser Seite lebt</h3></div></div><div class="person-grid">${details.interests.map((item) => `<article class="person-card"><div class="module-title">${escapeHtml(item.title)}</div><p class="muted">${escapeHtml(item.text)}</p></article>`).join("")}</div></section>
      </div>
      <div class="panel-stack" id="person-side-stack"></div>
    </section>`;
  root.querySelector("#person-side-stack").append(renderChatPanel(personId));
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
  const start = monthStart().toISOString();
  const end = monthEnd().toISOString();
  const data = await jsonFetch(`/api/calendar/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`).catch(() => ({ events: [] }));
  state.events = data.events || [];
}

async function loadMeals() {
  const data = await jsonFetch("/api/meal-plan").catch(() => ({ days: [] }));
  state.meals = data.days || [];
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
  const data = await jsonFetch("/api/shopping").catch(() => ({ items: [] }));
  state.shopping = data.items || [];
}

async function loadMedia() {
  const data = await jsonFetch("/api/media").catch(() => ({ players: [] }));
  state.mediaPlayers = data.players || [];
}

async function loadFamilyNotes() {
  const data = await jsonFetch("/api/notes/family").catch(() => ({ notes: { text: "", updatedAt: null } }));
  state.familyNotes = data.notes || { text: "", updatedAt: null };
}

async function refreshAll() {
  state.days = buildDays();
  updateWeekLabel();
  await Promise.all([loadStatuses(), loadFamily(), loadCalendar(), loadMeals(), loadLights(), loadShutters(), loadEnergy(), loadShopping(), loadMedia(), loadFamilyNotes()]);
  renderView();
}

function onRouteChange() {
  state.route = routeFromHash();
  renderView();
}

window.addEventListener("hashchange", onRouteChange);
state.route = routeFromHash();
refreshAll();
setInterval(() => {
  if (!document.hidden) refreshAll();
}, 60000);
