# Bot Runtime Notes

These notes are for OpenClaw or any future agent maintaining this project.

## Mission

Operate `nummer12-family-ui` as a durable family home interface that grows with the household over years.

Priorities:

1. preserve data
2. preserve persona separation
3. preserve usability on the shared tablet
4. prefer clear failure over silent data corruption
5. use the Raspberry Pi's available local resources to build durable family context over time

## Invariants

Do not break these rules:

- personal personas must remain separate
- family chat must remain separate from personal chats
- important data must live under the configured external data root
- archives should be treated as durable records
- do not silently reroute production data into repo-local temporary folders

## Persona Set

Expected personas:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

If adding personas later:

- create matching profile, archive, and session structures
- update navigation and configuration centrally

## Expected Page Model

- `/` family homepage
- `/calendar`
- `/home-control`
- `/media`
- `/nina`
- `/martin`
- `/olivia`
- `/yuna`
- `/selma`

The family homepage should stay focused on:

- weekly planner
- quick access
- photos
- shopping list
- family chat

Avoid turning the homepage into a dump of every subsystem.

## Path Management

All important paths should derive from `DATA_ROOT`.

Expected derived roots:

- `CONFIG_ROOT`
- `STATE_ROOT`
- `CACHE_ROOT`
- `ARCHIVE_ROOT`
- `PROFILES_ROOT`
- `MEDIA_ROOT`

If paths need to change:

- change them centrally
- document the change
- do not scatter machine-specific paths across business logic

## Persistence Rules

- `state/` holds active durable state
- `cache/` holds rebuildable data
- `archive/` holds chronological records
- `profiles/` holds person-specific settings and curated memory
- `media/` holds photo and generated assets
- when OpenClaw can derive durable context from local files, calendars, chats, or images, prefer storing that context in the proper long-lived location

When in doubt:

- append to archive
- summarize into memory deliberately
- avoid deleting historical data automatically

## Chat Backend Rules

The UI chat is expected to communicate with OpenClaw running in the home environment.

Guidelines:

- identify the persona on every request
- preserve per-person chat continuity
- keep transport logic separate from memory logic
- expose backend health to the frontend
- use local archives, persona memory, photos, and future tablet uploads as context sources when appropriate

## Reliability Rules

- fail clearly if the external data root is unavailable
- allow graceful degradation for HA, Google Calendar, or chat backend failures
- preserve non-chat features when chat is down
- preserve non-HA features when HA is down

## Change Discipline

Before major changes:

- keep the week-centric family homepage principle
- keep touch-first tablet usability
- keep documentation aligned with code
- prefer simple structures that can survive years of maintenance
