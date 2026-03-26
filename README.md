# nummer12-family-ui

Home UI for family with nummer12 chat, Home Assistant lights and energy, plus Google Calendar support.

## Chat backend
The server now uses this order:
1. Local Ollama first at `OLLAMA_BASE_URL`
2. Fallback API if Ollama fails or times out

By default that means:
- Ollama: `http://192.168.178.64:11434`
- Fallback: OpenAI-compatible `/chat/completions` with `FALLBACK_API_KEY`

## Features
- Home UI: **nummer12**
- Status indicators: **HA connected**, **nummer12 connected**
- Chat interface to talk to nummer12
- Access Lights: lists all available lights from Home Assistant
- Access Energy
- Calendar support via dedicated Gmail account

## Run
```bash
cd /Users/openmac/.openclaw/workspace/nummer12-family-ui
npm install
cp .env.example .env
npm start
```

## Required env
- `HA_BASE_URL`
- `HA_TOKEN`

## Chat env
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- optional fallback:
- `FALLBACK_API_BASE_URL`
- `FALLBACK_API_PATH`
- `FALLBACK_API_KEY`
- `FALLBACK_MODEL`

## Google Calendar env
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`

Then open:
- local: `http://127.0.0.1:8080`
- LAN / Raspberry Pi: `http://192.168.178.105:8080`
