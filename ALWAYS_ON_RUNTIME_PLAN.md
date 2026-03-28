# Always-On Runtime Plan

## Purpose

This document defines how `nummer12-family-ui` and the `Nummer 12` experience should run continuously on the Raspberry Pi.

The goal is not just to host a webpage. The goal is to keep the house AI reliably available as a long-lived home interface.

---

## 1. Runtime components

Recommended always-on components:

1. Family UI web service
2. backend API service
3. OpenClaw gateway / intelligence backend
4. integration workers
5. scheduled jobs for summaries, reminders, and backups

---

## 2. Main service model

Use `systemd` for production operation.

Minimum service expectations:

- start on boot
- restart on failure
- wait for network availability
- fail loudly if `DATA_ROOT` is unavailable
- write logs to journald and durable log root

---

## 3. Suggested service split

### Option A: one app service first

Good initial deployment:

- one `nummer12-family-ui.service`
- OpenClaw managed separately if already installed as service

### Option B: separated services later

For better long-term operations:

- `nummer12-family-ui.service`
- `nummer12-family-workers.service`
- `openclaw-gateway.service`
- optional backup timer/services

Option A is fine to start. Option B is better for long-term maintainability.

---

## 4. Example `systemd` service shape

```ini
[Unit]
Description=Nummer12 Family UI
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/nummer12-family-ui
Environment=NODE_ENV=production
Environment=DATA_ROOT=/mnt/family-ai
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=pi
Group=pi
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

This is only a base example. Final service should also validate environment and path assumptions.

---

## 5. Startup validation behavior

Before normal runtime:

- verify `DATA_ROOT`
- verify writable `state/`, `archive/`, `logs/`
- verify readable profile/config paths
- verify required env vars
- optionally perform health probe of OpenClaw and integrations

If critical validation fails:

- exit with clear error
- let `systemd` show restart/failure visibly
- do not continue in a half-broken mode that writes to wrong locations

---

## 6. Degraded mode expectations

### If OpenClaw is unavailable

- UI still loads
- chat shows offline/degraded state
- non-chat dashboard features remain available

### If Google Calendar is unavailable

- planner shows degraded status
- cached data may still display if marked stale
- rest of UI continues

### If Home Assistant is unavailable

- home-control features show unavailable state
- planning/chat features continue if possible

### If mail ingestion is unavailable

- no fake healthy state
- clearly indicate sync lag or ingestion failure

---

## 7. Health indicators in UI

The dashboard should show compact status indicators for:

- Nummer 12 backend
- Google Calendar
- Gmail / mail ingestion
- Home Assistant
- storage / data root

Health should be visible from the tablet without opening logs.

---

## 8. Background job categories

Recommended recurring jobs:

- morning personal digest generation
- morning family digest generation
- evening preparation digest
- mail triage sweep
- calendar conflict check
- backup creation
- archive summarization
- health review

These can run as:

- cron jobs
- OpenClaw cron tasks
- worker loop processes

---

## 9. Resource strategy on Raspberry Pi

Avoid running too many heavy LLM tasks continuously.

Preferred model:

- lightweight web/backend stays resident
- integrations stay resident
- intelligence runs on demand or on schedule
- cache aggressively where safe
- summarize long histories to keep runtime fast

This preserves responsiveness and stability.

---

## 10. Logging and observability

At minimum log:

- startup
- shutdown
- dependency health transitions
- failed API calls
- archive write failures
- job executions
- degraded mode entry/exit

Suggested outputs:

- journald for service operations
- JSON or line logs under `DATA_ROOT/logs`

---

## 11. Recovery expectations

On reboot or crash:

- UI should return automatically
- latest summaries should still exist
- profile/memory data should remain intact
- reminders should survive restart if durable
- active tasks should not disappear

---

## 12. Recommended first implementation order

1. make UI service reliable under `systemd`
2. validate `DATA_ROOT` on startup
3. add health endpoint and UI indicators
4. move archive/profile/state writes under durable root
5. add one scheduled digest job
6. expand into persona-aware jobs and background workers

---

## 13. Operational intent

The house should feel like `Nummer 12` is simply there.

That means:

- the Raspberry Pi hums
- the interface is available
- each family member reaches the right context
- summaries and reminders quietly accumulate
- the system fails honestly and recovers automatically

That is the right operational target for a long-lived family home AI.
