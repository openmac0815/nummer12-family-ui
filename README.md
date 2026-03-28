# nummer12-family-ui

Family home interface for the Raspberry Pi with `Nummer12`, Home Assistant, calendar integration, shopping/tasks, photo archive, and long-term family context.

## Long-term runtime model

This app is meant to run continuously on the Raspberry Pi and keep data over years.

Important principles:

- the repository contains code
- persistent family data lives outside the repo
- the preferred persistent root is the USB disk on the Pi
- `Nummer12` should preserve persona-specific context and family context separately
- archives, photos, notes, shopping, and future generated assets should accumulate over time

Recommended persistent root:

```bash
DATA_ROOT=/mnt/family-ai
```

Recommended subfolders:

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

The server already supports `DATA_ROOT` and optional derived overrides:

- `STATE_ROOT`
- `MEDIA_ROOT`
- `ARCHIVE_ROOT`
- `PROFILES_ROOT`
- `CACHE_ROOT`

## Chat architecture
The system now has two separate pieces:

1. **Family UI** on port `8080`
2. **Nummer12 relay** on port `8090`

The Family UI should talk to the relay over local HTTP:

- `http://127.0.0.1:8090/api/chat`

This keeps UI development independent from chat-runtime evolution and avoids circular self-calls.

## Relay backend
The relay uses a dedicated backend abstraction with these supported modes:

- `runtime`
- `runtime-only`
- `auto`
- `ollama`
- `fallback`

Recommended production behavior inside the relay:

1. Real long-lived `Nummer12` runtime first
2. Ollama as graceful local fallback
3. OpenAI-compatible API as final fallback

The relay itself should point to the real always-on Nummer12 runtime when available. It must not point back into the Family UI.

The backend is persona-aware:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Runtime requests include:

- `persona`
- `session_key`
- `thread_id`
- `conversation_id`

This keeps the family personas isolated while still allowing one coherent house AI system.

## Features
- Home UI: **nummer12**
- Status indicators: **HA connected**, **nummer12 connected**
- Chat interface to talk to nummer12
- Access Lights: lists all available lights from Home Assistant
- Access Energy
- Calendar support via dedicated Gmail account

## Run
```bash
cd /Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup
npm install
cp .env.example .env
```

Run the Family UI:

```bash
npm run start:ui
```

Run the separate relay:

```bash
npm run start:relay
```

Development mode:

```bash
npm run dev:ui
npm run dev:relay
```

## Required env
- `HA_BASE_URL`
- `HA_TOKEN`
- `DATA_ROOT` for durable runtime data on the Pi

## Family UI chat env
- relay target:
- `NUMMER12_RELAY_BASE_URL`
- `NUMMER12_RELAY_API_PATH`
- `NUMMER12_RELAY_HEALTH_PATH`
- `NUMMER12_RELAY_TIMEOUT_MS`

## Relay env
- relay bind:
- `NUMMER12_RELAY_HOST`
- `NUMMER12_RELAY_PORT`
- `NUMMER12_RELAY_TITLE`
- backend selection:
- `NUMMER12_CHAT_BACKEND_MODE`
- real Nummer12 runtime target:
- `NUMMER12_RUNTIME_BASE_URL`
- `NUMMER12_RUNTIME_API_PATH`
- `NUMMER12_RUNTIME_API_KEY` (optional)
- `NUMMER12_RUNTIME_TIMEOUT_MS`
- legacy aliases still accepted:
- `NUMMER12_BACKEND_URL`
- `NUMMER12_API_KEY`
- Ollama fallback:
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_MS`
- optional final fallback:
- `FALLBACK_API_BASE_URL`
- `FALLBACK_API_PATH`
- `FALLBACK_API_KEY`
- `FALLBACK_MODEL`

Important:

- Family UI should point to the relay, not directly to Ollama or fallback
- preferred relay mode is `NUMMER12_CHAT_BACKEND_MODE=runtime`
- `NUMMER12_RUNTIME_BASE_URL` should point at the real Nummer12 runtime, not the Family UI and not the relay itself
- Family UI exposes `/api/nummer12/chat` as a proxy to the relay
- relay health is available at `/api/health`
- successful chats are archived per persona under `ARCHIVE_ROOT`

## Google Calendar env
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`

## Calendar model

The intended Google setup is a central Nummer12 account, for example:

- `mainbernhheimerstrasse12@gmail.com`

Recommended structure:

- one shared family calendar on the hub account
- optional separate calendars for `Nina`, `Martin`, `Olivia`, `Yuna`, and `Selma`
- both parents can subscribe to or edit the relevant calendars
- school schedules and child-specific routines should live in the child calendars
- shared appointments should live in the family calendar

The app now supports a multi-calendar mapping file:

- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/config/calendar-map.json`

That mapping lets events arrive in the UI with:

- `calendar_id`
- `calendar_label`
- `member_id`
- `member_color`

So the planner can render from explicit calendar ownership, not only from guessed names in event text.

Then open:
- local: `http://127.0.0.1:8080`
- LAN / Raspberry Pi: `http://192.168.178.105:8080`

Relay health check:

- `http://127.0.0.1:8090/api/health`

## Raspberry Pi setup

1. Mount the USB disk at a stable location, for example:

```bash
sudo mkdir -p /mnt/family-ai
```

2. Point `.env` to that disk:

```bash
DATA_ROOT=/mnt/family-ai
```

3. Keep the runtime model durable:

- shopping/tasks/notes should survive reboot
- Google tokens should survive reboot
- persona profiles and archives should grow over time
- photo uploads and generated images should stay on the USB disk

4. Run the app as a service on the Pi.

Recommended service behavior:

- restart on failure
- start only after network is available
- fail clearly if `DATA_ROOT` is missing
- never silently fall back to random repo-local paths in production

Recommended process split:

- `nummer12-family-ui.service` -> `npm run start:ui`
- `nummer12-relay.service` -> `npm run start:relay`

## OpenClaw / Nummer12 expectations

The Pi-side intelligence should treat this system as a long-lived home AI, not a temporary chat frontend.

Expected behavior:

- keep `family`, `nina`, `martin`, `olivia`, `yuna`, and `selma` separate
- preserve context over time
- use available local resources where appropriate
- prefer durable storage for notes, sessions, archives, and photos
- degrade gracefully if HA, Google, or chat backends are unavailable

See also:

- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/ARCHITECTURE.md`
- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/DATA_MODEL.md`
- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/OPERATIONS.md`
- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/BOT_RUNTIME_NOTES.md`
