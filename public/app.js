const el = {
  title: document.getElementById("title"),
  clock: document.getElementById("clock"),
  actions: document.getElementById("actions"),
  rooms: document.getElementById("rooms"),
  info: document.getElementById("info"),
  refresh: document.getElementById("refresh"),
  updated: document.getElementById("updated"),
  haDot: document.getElementById("ha-dot"),
  haText: document.getElementById("ha-text")
};

function updateClock() {
  const now = new Date();
  el.clock.textContent = now.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadHealth() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error("HA down");
    el.haDot.className = "dot ok";
    el.haText.textContent = "HA: online";
  } catch {
    el.haDot.className = "dot bad";
    el.haText.textContent = "HA: offline";
  }
}

async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
}

function stateOn(state) {
  return state === "on" || state === "open";
}

async function loadDashboard() {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  const data = await res.json();

  el.title.textContent = data.title || "nummer12 family";
  el.updated.textContent = `Zuletzt: ${new Date(data.ts).toLocaleTimeString("de-DE")}`;

  el.actions.innerHTML = "";
  for (const action of data.config.quickActions || []) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = action.label;
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await post("/api/action", { label: action.label });
        await loadDashboard();
      } catch (e) {
        alert(e.message || "Aktion fehlgeschlagen");
      } finally {
        btn.disabled = false;
      }
    };
    el.actions.appendChild(btn);
  }

  el.rooms.innerHTML = "";
  for (const room of data.config.rooms || []) {
    const stateObj = data.states[room.entity_id];
    const state = stateObj?.state || "unavailable";
    const btn = document.createElement("button");
    btn.className = `btn ${stateOn(state) ? "" : "off"}`;
    btn.textContent = `${room.label}\n${state}`;
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await post("/api/toggle", { entity_id: room.entity_id });
        await loadDashboard();
      } catch (e) {
        alert(e.message || "Toggle fehlgeschlagen");
      } finally {
        btn.disabled = false;
      }
    };
    el.rooms.appendChild(btn);
  }

  el.info.innerHTML = "";
  for (const item of data.config.info || []) {
    const stateObj = data.states[item.entity_id];
    const value = stateObj?.state ?? "-";
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<div class="name">${item.label}</div><div class="value">${value}${item.unit ? ` ${item.unit}` : ""}</div>`;
    el.info.appendChild(tile);
  }
}

async function refreshAll() {
  await Promise.allSettled([loadHealth(), loadDashboard()]);
}

el.refresh.onclick = refreshAll;
updateClock();
setInterval(updateClock, 30_000);
refreshAll();
setInterval(() => {
  if (!document.hidden) {
    refreshAll();
  }
}, 15_000);
