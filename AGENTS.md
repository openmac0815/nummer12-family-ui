# AGENTS.md

This repository is intended to operate as a durable family home interface on a Raspberry Pi.

## Primary Goal

Maintain `nummer12-family-ui` as a stable long-running home system, not as a short-lived demo.

Priorities:

1. reliability
2. data durability
3. persona separation
4. tablet usability
5. maintainable structure

## Read First

Before making major changes, read:

1. `ARCHITECTURE.md`
2. `DATA_MODEL.md`
3. `OPERATIONS.md`
4. `BOT_RUNTIME_NOTES.md`

These files define the intended long-term operating model.

## Runtime Expectations

- the app is expected to run continuously on a Raspberry Pi
- the UI is meant for a shared family tablet
- the intelligence layer is provided by OpenClaw in the home environment
- important runtime data should live under an external `DATA_ROOT`, typically on USB storage
- the operating model is intentionally long-lived: preserve context, archives, and person-specific continuity whenever feasible
- the Raspberry Pi should make deliberate use of available local resources such as disk, local models, local media, and local profile data

## Hard Rules

- do not mix personal personas
- do not silently move production data into repo-local folders
- do not hardcode machine-specific paths in business logic
- do not treat cache as source of truth
- do not silently discard archive or memory data

## Personas

Expected personas:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Each persona should have separate:

- session state
- archive
- curated memory

## Product Shape

The application should remain organized around:

- `/` family homepage
- `/calendar`
- `/home-control`
- `/media`
- personal homepages for each family member

The family homepage should center on:

- weekly planner
- quick access
- photos
- shopping list
- family chat

Avoid piling every subsystem onto the homepage.

## Persistence Model

Prefer storing:

- active state in `state/`
- rebuildable data in `cache/`
- durable chronological records in `archive/`
- per-person data in `profiles/`
- images and generated media in `media/`

All persistent paths should derive from `DATA_ROOT`.

## Reliability Model

The system should degrade gracefully:

- if Home Assistant fails, non-HA features should continue
- if Google Calendar fails, non-calendar features should continue
- if chat backend fails, the UI should remain usable

If `DATA_ROOT` is unavailable:

- fail clearly
- do not fallback silently to ad hoc local paths

## Change Discipline

When extending the product:

- prefer configuration-driven modules over hardcoded special cases
- keep the week-centric planning concept intact
- keep the UI touch-friendly and readable at tablet distance
- update the documentation when the operating model changes
