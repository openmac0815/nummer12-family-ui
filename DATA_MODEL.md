# Nummer12 Family UI Data Model

## Goal

All important runtime data must live outside the code repository so the app can be redeployed without losing state.

The intended persistent root is a configurable directory on the Raspberry Pi USB disk.

Recommended root:

`DATA_ROOT=/mnt/family-ai`

## Directory Layout

```text
DATA_ROOT/
  config/
  state/
  cache/
  logs/
  archive/
  profiles/
  media/
  backups/
```

## Folder Semantics

### `config/`

Stable machine-readable configuration.

Examples:

- `family.json`
- `navigation.json`
- `calendar-map.json`
- `personas.json`
- `modules.json`

Rules:

- tracked operational configuration belongs here
- secrets should not be stored here unless deliberately managed as local-only runtime config

### `state/`

Current durable application state.

Examples:

- `shopping-list.json`
- `google-tokens.json`
- `chat-sessions.json`
- `slideshow.json`
- `system-status.json`

Rules:

- current truth belongs here
- small files only
- must survive reboot

### `cache/`

Rebuildable short-term data.

Examples:

- `calendar-events.json`
- `ha-entities.json`
- `news-martin.json`
- `craft-ideas-olivia.json`

Rules:

- safe to delete
- never treat as the source of truth

### `logs/`

Operational logs.

Examples:

- `app.log`
- `error.log`
- `access.log`

Rules:

- rotate regularly
- useful for debugging only

### `archive/`

Long-term chronological archive by persona.

Structure:

```text
archive/
  family/
  nina/
  martin/
  olivia/
  yuna/
  selma/
```

Recommended internal structure per persona:

```text
archive/martin/
  sessions/2026/03/2026-03-27.jsonl
  summaries/2026/2026-week-13.md
```

Rules:

- append-only where practical
- do not silently prune
- separate raw logs from summaries

### `profiles/`

Long-lived per-person configuration and curated memory.

Recommended structure:

```text
profiles/martin/
  profile.json
  preferences.json
  memory.md
  modules.json
  session-state.json
```

This structure should exist for:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

### `media/`

Photos and generated assets.

Recommended structure:

```text
media/
  photos/
  generated/
  uploads/
  favorites/
```

Examples:

- slideshow photos
- image-of-the-day outputs
- manually uploaded media

### `backups/`

Local snapshots or exported backups.

Rules:

- backups are not active state
- do not read from backups during normal runtime

## Data Types

Use the following formats consistently:

- `json`: configuration and mutable state
- `jsonl`: chat/event archives
- `md`: curated memory and summaries
- image/video files: under `media/`

## Persona Separation

The following personas are first-class:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Rules:

- each persona has separate session state
- each persona has separate archive files
- each persona has separate curated memory
- personal personas must not automatically read one another's personal memory

## Critical vs Non-Critical Data

Critical:

- `profiles/`
- `state/`
- `archive/`
- local media metadata and curated media

Non-critical:

- `cache/`
- derived summaries that can be recreated if raw archive exists

## Path Rules

All runtime paths should derive from `DATA_ROOT`.

Examples:

- `CONFIG_ROOT = DATA_ROOT/config`
- `STATE_ROOT = DATA_ROOT/state`
- `ARCHIVE_ROOT = DATA_ROOT/archive`
- `PROFILES_ROOT = DATA_ROOT/profiles`
- `MEDIA_ROOT = DATA_ROOT/media`

Never hardcode machine-specific data paths inside business logic.
