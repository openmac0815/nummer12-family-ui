# DATA_ROOT Layout

## Purpose

This document defines the durable runtime storage layout for `nummer12-family-ui` in production.

The main requirement is: important family data must live outside the repository and survive reboots, updates, and years of use.

---

## 1. Root path

Recommended production root:

```bash
DATA_ROOT=/mnt/family-ai
```

All durable state should derive from this root.

---

## 2. Top-level layout

```text
/mnt/family-ai/
  state/
  cache/
  archive/
  profiles/
  media/
  logs/
  backups/
```

---

## 3. Directory purposes

## `state/`

Durable active runtime state.

Suggested subfolders:

```text
state/
  sessions/
  summaries/
  reminders/
  inbox/
  health/
  tasks/
```

### Contents

- recent active session context
- compact summaries used for fast reload
- reminders and scheduled suggestions
- normalized inbox items from Gmail or other sources
- service and integration health snapshots
- active task state

---

## `cache/`

Rebuildable data only.

Suggested subfolders:

```text
cache/
  calendar/
  mail/
  photos/
  ui/
```

### Rules

- cache loss should not be fatal
- cache should never be the only copy of critical information

---

## `archive/`

Chronological durable history.

Suggested subfolders:

```text
archive/
  family/
  nina/
  martin/
  olivia/
  yuna/
  selma/
  system/
```

### Contents

- chat transcripts
- event logs
- daily snapshots
- digest outputs
- audit trails of important decisions

Archive should prefer append-only behavior.

---

## `profiles/`

Persona-specific long-term identity and memory.

Suggested structure:

```text
profiles/
  family/
    profile.json
    memory.md
  nina/
    profile.json
    memory.md
  martin/
    profile.json
    memory.md
  olivia/
    profile.json
    memory.md
  yuna/
    profile.json
    memory.md
  selma/
    profile.json
    memory.md
```

### Contents

- persona metadata
- stable preferences
- important recurring context
- communication style hints
- action policy

---

## `media/`

Durable media and generated assets.

Suggested subfolders:

```text
media/
  photos/
  generated/
  thumbnails/
  imports/
```

### Contents

- uploaded family photos
- generated images
- resized assets for UI
- image-derived metadata if needed

---

## `logs/`

Human-readable and machine-readable operational logs.

Suggested subfolders:

```text
logs/
  app/
  integrations/
  jobs/
  errors/
```

### Contents

- startup logs
- sync failures
- chat backend failures
- archive write errors
- degraded dependency state transitions

---

## `backups/`

Locally stored backup artifacts before off-device copy if desired.

Suggested subfolders:

```text
backups/
  daily/
  weekly/
```

---

## 4. Persona-specific state layout

Suggested per-person active state:

```text
state/sessions/family/
state/sessions/nina/
state/sessions/martin/
state/sessions/olivia/
state/sessions/yuna/
state/sessions/selma/

state/summaries/family/
state/summaries/nina/
state/summaries/martin/
state/summaries/olivia/
state/summaries/yuna/
state/summaries/selma/
```

---

## 5. Production rules

### Must

- fail clearly if `DATA_ROOT` is missing
- keep production data out of repo-local folders
- create derived roots centrally
- log failures to resolve critical paths

### Must not

- silently switch to temporary local repo paths
- mix persona data into shared folders without labeling
- overwrite archives unintentionally

---

## 6. Derived environment variables

Optional explicit overrides:

```bash
STATE_ROOT=/mnt/family-ai/state
CACHE_ROOT=/mnt/family-ai/cache
ARCHIVE_ROOT=/mnt/family-ai/archive
PROFILES_ROOT=/mnt/family-ai/profiles
MEDIA_ROOT=/mnt/family-ai/media
LOG_ROOT=/mnt/family-ai/logs
BACKUP_ROOT=/mnt/family-ai/backups
```

If overrides are used, they should still be validated at startup.

---

## 7. Startup validation checklist

Before entering normal runtime, validate:

- `DATA_ROOT` exists
- all required derived roots exist or can be created
- root is writable
- archive path is writable
- profiles path is readable
- state path is writable
- logs path is writable

If validation fails:

- show clear startup error
- do not serve misleading healthy UI state

---

## 8. Backup priorities

Highest priority backup targets:

1. `profiles/`
2. `archive/`
3. `state/summaries/`
4. `state/reminders/`
5. essential configuration data

Lower priority:

- cache
- thumbnails
- derived media

---

## 9. Migration rule

If layout changes in future:

- write explicit migration notes
- preserve old archive data
- avoid destructive moves where possible
- make path changes centrally in code

The storage model should optimize for years of household continuity, not short-term convenience.
