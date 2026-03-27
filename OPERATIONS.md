# Nummer12 Family UI Operations

## Purpose

This document defines how `nummer12-family-ui` should run on the Raspberry Pi over the long term.

## Runtime Assumptions

- the app runs continuously on the Raspberry Pi
- the primary data directory lives on a mounted USB disk
- the UI is accessed mainly from a shared tablet
- OpenClaw runs locally in the home environment and serves as the intelligence layer behind `Nummer12`
- OpenClaw should treat available local disk, local models, local photos, local archives, and local profile data as first-class resources for long-term continuity

## Service Model

The app should run as a managed service.

Recommended:

- one `systemd` service for the main app
- optional scheduled jobs for summaries and backups

## Startup Requirements

Before the app enters normal runtime:

- network should be available
- the configured `DATA_ROOT` should exist and be writable
- required local config files should be readable
- the derived runtime roots for `state`, `archive`, `profiles`, `media`, and `cache` should be available

If `DATA_ROOT` is missing:

- fail loudly
- expose clear status
- do not silently write data into the repository or the Pi home directory

## Degraded Operation

The app should continue to serve partial functionality when dependencies fail.

### If Home Assistant is down

- home control features should show unavailable status
- calendar, photos, shopping, and chat should remain available if possible

### If Google Calendar is down

- calendar modules should show degraded status
- other pages should continue working

### If OpenClaw or Ollama is down

- chat should show offline or degraded state
- dashboard and control pages should still load

### If cache files are missing

- rebuild cache where possible
- do not treat missing cache as fatal

## Logging

The app should emit:

- startup information
- dependency health changes
- chat backend failures
- persistence failures
- archive write failures

Recommended outputs:

- stdout/stderr for `systemd journal`
- optional file logs under `DATA_ROOT/logs`

## Backups

Recommended schedule:

- daily backup of `state/`, `profiles/`, and new archive content
- weekly snapshot of all critical data

Critical data:

- `config/`
- `state/`
- `profiles/`
- `archive/`
- important media metadata

## Maintenance Rules

- never delete archive files automatically unless a retention policy is explicitly defined
- never overwrite personal memory files without intent
- when rotating logs, preserve enough history for debugging
- prefer append-only writes for archives
- when new local resources become available on the Pi, prefer integrating them deliberately instead of ignoring them
- preserve long-term context whenever a request can enrich family or persona memory without risking privacy or corruption

## Updates

Code updates should not require migrating active data manually where possible.

Rules:

- keep data paths configurable
- do not store production data in the repository
- write migration notes when data structures change

## Health Surface

The UI should show lightweight health indicators for:

- Home Assistant
- Nummer12 / chat backend
- calendar integration

This makes failures visible without requiring log access.
