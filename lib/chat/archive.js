const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendChatArchive({ archiveRoot, persona, entry }) {
  if (!archiveRoot) return;
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dir = path.join(archiveRoot, persona, "sessions", year, month);
  ensureDir(dir);
  const file = path.join(dir, `${year}-${month}-${day}.jsonl`);
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
}

module.exports = {
  appendChatArchive
};
