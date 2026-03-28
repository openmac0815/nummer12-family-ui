# nummer12-family-ui

The always-on family home interface for `Nummer12`.

This repo is not just a dashboard. It is the long-running Raspberry Pi UI for a family of five:

- shared family home screen on a tablet
- individual person pages
- Home Assistant integration
- Google Calendar integration
- chat with `Nummer12`
- durable storage outside the repo
- image generation and family media archive
- school schedule groundwork for the next 10+ years

## Architecture

There are two separate processes:

1. **Family UI**
   - Express app for the tablet UI
   - default port: `8080`
2. **Nummer12 relay**
   - separate chat backend process
   - default port: `8090`

The UI must talk to the relay over local HTTP.

Recommended topology on the Pi:

```text
Tablet Browser
  -> Family UI (0.0.0.0:8080)
  -> Nummer12 relay (127.0.0.1:8090)
  -> real Nummer12 runtime / Ollama / fallback
```

This separation is intentional:

- UI can keep evolving independently
- chat integration can change without breaking the UI
- no circular self-calls
- easier to operate under `systemd`

## Durable data model

Persistent family data must live outside the repo.

Recommended production root:

```bash
DATA_ROOT=/mnt/storage/family-ai
```

Important subfolders:

```text
/mnt/storage/family-ai/
  state/
  cache/
  archive/
  profiles/
  media/
  logs/
  backups/
  dropbox/
```

The repo is code.
The disk is memory.

Important persistent files already in use:

- `STATE_ROOT/google_tokens.json`
- `STATE_ROOT/images.json`
- `STATE_ROOT/meal-history.json`
- `STATE_ROOT/tasks.json`
- `STATE_ROOT/notes.json`
- `STATE_ROOT/academics.json`
- `STATE_ROOT/schedules.json`
- `PROFILES_ROOT/<persona>/profile.json`
- `PROFILES_ROOT/<persona>/memory.md`

## Personas

The system keeps persona separation for:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

The relay and UI both understand persona-aware chat.

## Current UI model

### Home

Current Home layout:

- full-width weekly planner
- below that:
  - meal finder on the left
  - daily image on the right
- family chat below

Intent:

- planner stays the center
- food suggestions support the week without taking over
- image of the day gives atmosphere and memory
- chat is the shared action point with `Nummer12`

### Person pages

Pages are no longer meant to be identical.

- `Nina`: calendar and planning centered
- `Martin`: information and topics centered
- `Olivia`: school, timetable, grades, upcoming events
- `Yuna`: school, timetable, upcoming events
- `Selma`: kindergarten rhythm, playful orientation, low reading load

Each person page also has:

- own daily image
- own chat context
- secondary editable profile / background context

## School schedule model

Important product decision:

- **Google Calendar is not the primary school timetable source**
- **the app has its own durable timetable model**
- **Google Calendar is the overlay for exceptions and special events**

Why:

- school timetables are stable over long periods
- calendars are useful for tests, trips, parents' evenings, holidays, and deviations
- this needs to hold up over many school years

Current schedule storage:

- `STATE_ROOT/schedules.json`

Current APIs:

- `GET /api/schedules/:member`
- `POST /api/schedules/:member`
- `GET /api/academics/:member`
- `POST /api/academics/:member`

Intended usage:

- `Olivia`, `Yuna`, later `Selma` keep a stable weekly base schedule
- Google Calendar overlays:
  - special appointments
  - deviations
  - school events
  - classes/tests/activities if useful

This means the UI can always show a clean timetable even if calendars get noisy.

## Chat / relay model

The UI talks to the relay.
The relay talks to the real runtime.

Preferred production flow:

1. real long-lived `Nummer12` runtime
2. Ollama fallback
3. OpenAI-compatible fallback

Supported backend modes inside the relay:

- `runtime`
- `runtime-only`
- `auto`
- `ollama`
- `fallback`

Important:

- the relay must **not** point back to the Family UI
- the Family UI must **not** try to be its own runtime

## Run

```bash
cd /Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup
npm install
cp .env.example .env
```

Run the UI:

```bash
npm run start:ui
```

Run the relay:

```bash
npm run start:relay
```

Development mode:

```bash
npm run dev:ui
npm run dev:relay
```

## Required environment

### Shared / UI

- `DATA_ROOT`
- `HA_BASE_URL`
- `HA_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`

### UI -> relay

- `NUMMER12_RELAY_BASE_URL`
- `NUMMER12_RELAY_API_PATH`
- `NUMMER12_RELAY_HEALTH_PATH`
- `NUMMER12_RELAY_TIMEOUT_MS`

### Relay

- `NUMMER12_RELAY_HOST`
- `NUMMER12_RELAY_PORT`
- `NUMMER12_RELAY_TITLE`
- `NUMMER12_CHAT_BACKEND_MODE`
- `NUMMER12_RUNTIME_BASE_URL`
- `NUMMER12_RUNTIME_API_PATH`
- `NUMMER12_RUNTIME_API_KEY` (optional)
- `NUMMER12_RUNTIME_TIMEOUT_MS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_MS`
- `FALLBACK_API_BASE_URL`
- `FALLBACK_API_PATH`
- `FALLBACK_API_KEY`
- `FALLBACK_MODEL`

Legacy aliases are still accepted where already supported.

## OpenRouter

The UI already supports OpenRouter-backed image generation.

Environment:

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_CHAT_API_PATH`
- `OPENROUTER_IMAGE_MODEL`
- `OPENROUTER_TIMEOUT_MS`
- `OPENROUTER_APP_NAME`
- `OPENROUTER_HTTP_REFERER`

Current image APIs:

- `GET /api/images/status`
- `GET /api/images?persona=family&limit=12`
- `GET /api/images/daily?persona=family`
- `POST /api/images/upload`
- `POST /api/images/generate`

Current behavior:

- uploaded device/camera images go to `DATA_ROOT/media/<persona>/uploads`
- generated images go to `DATA_ROOT/media/<persona>/generated`
- metadata goes to `STATE_ROOT/images.json`
- daily images can be generated from:
  - season
  - upcoming events
  - recent uploaded persona images

This is the basis for later orchestration with stronger models.

## Google Calendar model

Recommended setup:

- one dedicated Nummer12 Google account
- one shared family calendar
- optional separate calendars for:
  - `Nina`
  - `Martin`
  - `Olivia`
  - `Yuna`
  - `Selma`

The app supports multi-calendar mapping via:

- `/Users/openmac/.openclaw/workspace/raspberry-pi-home-ai-setup/config/calendar-map.json`

That allows events to arrive with:

- `calendar_id`
- `calendar_label`
- `member_id`
- `member_color`

## Bot handoff / Pi operator notes

If `Nummer12` on the Pi pulls this repo, it should:

1. keep persistent data outside the repo
2. preserve persona separation
3. run UI and relay as separate processes
4. prefer the real long-lived runtime over local fallbacks
5. avoid circular chat routing
6. treat school schedules as durable first-class data
7. keep image/media archives over time
8. never silently fall back from `DATA_ROOT` on the Pi to random local paths

## Current gaps

Still to do:

- stronger visual timetable editor
- timetable -> Google Calendar mirroring
- richer school overlays from Google Calendar
- stronger action layer for `Nummer12`:
  - calendar create/update
  - todo create/update
  - meal suggestions
  - media/image tasks

## Useful references

Open-source school systems worth knowing about:

- Gibbon timetable docs: [https://docs.gibbonedu.org/modules/learn/timetable](https://docs.gibbonedu.org/modules/learn/timetable)
- Gibbon calendar docs: [https://docs.gibbonedu.org/modules/other/calendar](https://docs.gibbonedu.org/modules/other/calendar)

They are useful as architectural references, but this repo intentionally keeps a much lighter custom family-oriented implementation.
