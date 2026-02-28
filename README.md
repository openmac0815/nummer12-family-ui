# nummer12-family-ui

Home UI for family with nummer12 chat + Home Assistant lights/energy.

## Features
- Home UI: **nummer12**
- Status indicators: **HA connected**, **nummer12 connected**
- Chat interface to talk to nummer12 (proxied to Raspberry Pi `192.168.178.105`)
- Access Lights: lists all available lights from Home Assistant
- Access Energy
- Calendar placeholder

## Run
```bash
cd /Users/openmac/.openclaw/workspace/nummer12-family-ui
npm install
cp .env.example .env
```

Set in `.env`:
- `HA_BASE_URL`
- `HA_TOKEN`
- optional override for chat backend:
  - `NUMMER12_BASE_URL`
  - `NUMMER12_API_PATH`
  - `NUMMER12_API_KEY`

Start:
```bash
npm start
```

Open:
- local: `http://127.0.0.1:8080`
- on Raspberry Pi LAN: `http://192.168.178.105:8080`
