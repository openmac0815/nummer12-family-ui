const fs = require("node:fs");
const path = require("node:path");
const { PERSONAS } = require("./chat/personas");

const PRODUCTION_DATA_ROOT = "/mnt/storage/family-ai";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, typeof fallback === "string" ? fallback : JSON.stringify(fallback, null, 2), "utf8");
  }
}

function resolveStoragePaths(env = process.env) {
  const dataRoot = env.DATA_ROOT || PRODUCTION_DATA_ROOT;
  const stateRoot = env.STATE_ROOT || path.join(dataRoot, "state");
  const mediaRoot = env.MEDIA_ROOT || path.join(dataRoot, "media");
  const archiveRoot = env.ARCHIVE_ROOT || path.join(dataRoot, "archive");
  const profilesRoot = env.PROFILES_ROOT || path.join(dataRoot, "profiles");
  const cacheRoot = env.CACHE_ROOT || path.join(dataRoot, "cache");
  const logRoot = env.LOG_ROOT || path.join(dataRoot, "logs");
  const backupRoot = env.BACKUP_ROOT || path.join(dataRoot, "backups");
  const dropboxRoot = env.DROPBOX_ROOT || path.join(dataRoot, "dropbox");

  return {
    dataRoot,
    stateRoot,
    mediaRoot,
    archiveRoot,
    profilesRoot,
    cacheRoot,
    logRoot,
    backupRoot,
    dropboxRoot
  };
}

function ensureStorageLayout(storage) {
  [
    storage.dataRoot,
    storage.stateRoot,
    storage.mediaRoot,
    storage.archiveRoot,
    storage.profilesRoot,
    storage.cacheRoot,
    storage.logRoot,
    storage.backupRoot,
    storage.dropboxRoot
  ].forEach(ensureDir);

  [
    path.join(storage.stateRoot, "sessions"),
    path.join(storage.stateRoot, "summaries"),
    path.join(storage.stateRoot, "reminders"),
    path.join(storage.stateRoot, "inbox"),
    path.join(storage.stateRoot, "health"),
    path.join(storage.stateRoot, "tasks")
  ].forEach(ensureDir);

  PERSONAS.forEach((persona) => {
    ensureDir(path.join(storage.stateRoot, "sessions", persona));
    ensureDir(path.join(storage.stateRoot, "summaries", persona));
    ensureDir(path.join(storage.archiveRoot, persona));
    ensureDir(path.join(storage.profilesRoot, persona));
    ensureDir(path.join(storage.mediaRoot, persona));
    ensureDir(path.join(storage.mediaRoot, persona, "photos"));
    ensureDir(path.join(storage.mediaRoot, persona, "uploads"));
    ensureDir(path.join(storage.mediaRoot, persona, "generated"));
    ensureDir(path.join(storage.dropboxRoot, persona));

    ensureFile(
      path.join(storage.profilesRoot, persona, "profile.json"),
      {
        id: persona,
        displayName: persona === "family" ? "Familie Wurm" : persona.charAt(0).toUpperCase() + persona.slice(1),
        visibilityDefault: persona === "family" ? "family" : `private:${persona}`,
        mediaRoot: path.join(storage.mediaRoot, persona),
        dropboxRoot: path.join(storage.dropboxRoot, persona)
      }
    );

    ensureFile(
      path.join(storage.profilesRoot, persona, "memory.md"),
      `# ${persona}\n\n- Long-term memory for ${persona}.\n`
    );
  });

  ensureDir(path.join(storage.dropboxRoot, "general"));
  ensureDir(path.join(storage.dropboxRoot, "family"));
}

function validateStorageLayout(storage, options = {}) {
  if (options.requireMount !== false && !fs.existsSync("/mnt/storage")) {
    throw new Error("External storage mount /mnt/storage is missing");
  }
  ensureStorageLayout(storage);
}

module.exports = {
  PRODUCTION_DATA_ROOT,
  resolveStoragePaths,
  ensureStorageLayout,
  validateStorageLayout
};
