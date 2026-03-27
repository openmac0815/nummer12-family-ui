# Raspberry Pi Setup

This file is the operational checklist for bringing `nummer12-family-ui` onto the Raspberry Pi.

## Goal

Run the app as a long-lived family home system with durable storage on the Pi's USB disk.

## 1. Prepare storage

Mount the external disk at a stable path, for example:

```bash
sudo mkdir -p /mnt/family-ai
```

Make sure the service user can write there.

Recommended structure:

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

## 2. Clone the project

```bash
cd /opt
sudo git clone https://github.com/openmac0815/nummer12-family-ui.git
sudo chown -R pi:pi nummer12-family-ui
cd /opt/nummer12-family-ui
```

## 3. Install runtime

```bash
npm install
cp .env.example .env
```

## 4. Configure `.env`

Minimum recommended values:

```bash
PORT=8080
HOST=0.0.0.0
TITLE=nummer12

DATA_ROOT=/mnt/family-ai

HA_BASE_URL=http://192.168.178.32:8123
HA_TOKEN=...

OLLAMA_BASE_URL=http://192.168.178.64:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=90000
```

Optional:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://192.168.178.105:8080/auth/google/callback
GOOGLE_CALENDAR_ID=primary

FALLBACK_API_KEY=...
FALLBACK_MODEL=gpt-4o-mini
```

After initial Google auth, configure calendar routing in:

```bash
/opt/nummer12-family-ui/config/calendar-map.json
```

Recommended setup:

- `primary` = shared family calendar on the Nummer12 Google account
- additional calendars for `Nina`, `Martin`, `Olivia`, `Yuna`, `Selma`
- map each calendar to the matching `member_id`

## 5. First local run

```bash
npm start
```

Open:

- `http://127.0.0.1:8080`
- `http://192.168.178.105:8080`

## 6. systemd service

Example unit:

```ini
[Unit]
Description=Nummer12 Family UI
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/nummer12-family-ui
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Suggested path:

```bash
sudo nano /etc/systemd/system/nummer12-family-ui.service
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nummer12-family-ui
sudo systemctl start nummer12-family-ui
sudo systemctl status nummer12-family-ui
```

## 7. Runtime rules for the Pi

The Pi-side runtime should behave as a long-lived home AI:

- preserve family and persona context
- store durable state under `DATA_ROOT`
- keep archives over time
- keep photo uploads and generated images on disk
- use local resources such as local models, archives, and profiles when helpful
- avoid silently losing context or rerouting state into temporary folders

## 8. If something fails

Check:

```bash
journalctl -u nummer12-family-ui -n 200 --no-pager
```

Common failure classes:

- USB disk not mounted at `DATA_ROOT`
- HA token missing or invalid
- Ollama host unavailable
- Google OAuth redirect mismatch

## 9. Future runtime expectations

This app is expected to grow into a real home archive.

That means the Raspberry Pi runtime should treat these as durable assets:

- shopping and task state
- family notes
- persona-specific chats
- future summaries and memories
- uploaded photos
- generated family images
