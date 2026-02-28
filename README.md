# nummer12-family-ui

Simplified family web UI for tablet use on Raspberry Pi.

## What it does
- Big touch buttons for room lights
- Quick actions (example: all lights off)
- Basic energy cards
- Uses Home Assistant API via backend (token stays server-side)

## 1) Setup
```bash
cd /Users/openmac/.openclaw/workspace/nummer12-family-ui
npm install
cp .env.example .env
```

Edit `.env` and set:
- `HA_BASE_URL`
- `HA_TOKEN`

## 2) Run
```bash
npm start
```

Open on tablet:
- `http://192.168.178.105:8080`

## 3) Configure dashboard entities/actions
Edit:
- `config/dashboard.json`

## Optional: run on boot (systemd)
Create `/etc/systemd/system/nummer12-family-ui.service`:
```ini
[Unit]
Description=nummer12 family UI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/Users/openmac/.openclaw/workspace/nummer12-family-ui
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nummer12-family-ui
sudo systemctl status nummer12-family-ui
```
