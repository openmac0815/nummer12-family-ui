const el = {
  haDot: document.getElementById("ha-dot"),
  nummer12Dot: document.getElementById("nummer12-dot"),
  haStatus: document.getElementById("ha-status"),
  nummer12Status: document.getElementById("nummer12-status"),
  lightsGrid: document.getElementById("lights-grid"),
  energyGrid: document.getElementById("energy-grid"),
  lightsRefresh: document.getElementById("lights-refresh"),
  chatLog: document.getElementById("chat-log"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input")
};

function setConnectionStatus(dotEl, textEl, baseText, ok) {
  dotEl.className = `dot ${ok ? "ok" : "bad"}`;
  textEl.lastChild.textContent = `${baseText}: ${ok ? "connected" : "not connected"}`;
}

function appendMessage(role, text) {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = text;
  el.chatLog.appendChild(node);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function loadStatuses() {
  const [ha, nummer12] = await Promise.all([
    fetch("/api/health", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false })),
    fetch("/api/nummer12/health", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false, connected: false }))
  ]);

  setConnectionStatus(el.haDot, el.haStatus, "HA", Boolean(ha.ok));
  setConnectionStatus(el.nummer12Dot, el.nummer12Status, "nummer12", Boolean(nummer12.connected));
}

function isOn(state) {
  return state === "on" || state === "open";
}

async function loadDashboard() {
  const data = await fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.json());

  el.lightsGrid.innerHTML = "";
  for (const room of data.config.rooms || []) {
    const value = data.states[room.entity_id]?.state || "unavailable";
    const btn = document.createElement("button");
    btn.className = `light-btn ${isOn(value) ? "on" : ""}`;
    btn.innerHTML = `<strong>${room.label}</strong><br>${value}`;

    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await post("/api/toggle", { entity_id: room.entity_id });
        await loadDashboard();
      } catch (error) {
        alert(error.message || "Toggle failed");
      } finally {
        btn.disabled = false;
      }
    };

    el.lightsGrid.appendChild(btn);
  }

  el.energyGrid.innerHTML = "";
  for (const item of data.config.info || []) {
    const state = data.states[item.entity_id]?.state ?? "-";
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<div class="label">${item.label}</div><div class="value">${state}${item.unit ? ` ${item.unit}` : ""}</div>`;
    el.energyGrid.appendChild(tile);
  }
}

function initNavButtons() {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-target");
      if (!target) return;
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initChat() {
  appendMessage("bot", "Hi, I am nummer12. How can I help?");

  el.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = el.chatInput.value.trim();
    if (!message) return;

    appendMessage("user", message);
    el.chatInput.value = "";

    try {
      const data = await post("/api/nummer12/chat", { message });
      appendMessage("bot", data.reply || "No reply.");
    } catch (error) {
      appendMessage("bot", `Error: ${error.message || "Chat failed"}`);
    }
  });
}

async function init() {
  initNavButtons();
  initChat();
  el.lightsRefresh.onclick = () => loadDashboard();
  await Promise.all([loadStatuses(), loadDashboard()]);

  setInterval(() => {
    if (!document.hidden) {
      loadStatuses();
      loadDashboard();
    }
  }, 15000);
}

init();
