# Nummer 12 Agentic Implementation Plan

## Purpose

This document turns the family UI vision into a concrete agentic system design for `nummer12-family-ui`.

Goal:

- run the Family UI continuously on the Raspberry Pi
- make `Nummer 12` reachable through multiple chat surfaces inside the UI
- preserve separate family-member contexts
- coordinate shared family intelligence without mixing private contexts
- support long-term memory, planning, reminders, email/calendar assistance, and improvement proposals

---

## 1. Core Principle

`Nummer 12` should not be implemented as a single undifferentiated chatbot.

Instead, the system should use a layered architecture:

1. **CEO / Orchestrator Agent**
   - monitors the whole system
   - proposes improvements
   - coordinates jobs and summaries
   - watches health and integration status
   - detects cross-family conflicts and opportunities

2. **Persona Agents**
   - one per family member plus one shared family persona
   - maintain separated memory, summaries, archives, and style
   - speak in the correct context for the current person

3. **Worker Jobs / Services**
   - non-conversational background processing
   - calendar sync
   - mail ingestion
   - summaries
   - reminders
   - conflict detection
   - archive processing
   - health and backup tasks

This approach keeps privacy boundaries clean and reduces prompt-level role confusion.

---

## 2. Persona Set

Required personas:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Rules:

- each persona has its own conversation stream
- each persona has its own memory and summaries
- each persona has its own archive path
- the shared family persona is separate from personal personas
- backend requests must always identify the target persona explicitly

---

## 3. User Experience Model

### Shared Family UI

The family home route `/` remains the tablet-first home screen.

It should focus on:

- weekly planner
- shared chat with family persona
- shopping/tasks
- photos/archive highlights
- quick links into personal pages and controls
- health indicators for chat/calendar/home systems

### Personal Pages

Required routes:

- `/nina`
- `/martin`
- `/olivia`
- `/yuna`
- `/selma`

Each personal page should include:

- personal schedule block
- personal chat field
- suggestions relevant to that person
- reminders or tasks relevant to that person
- optional interest modules

The page itself defines the intended context, but the backend must still verify persona explicitly.

---

## 4. Chat Surface Design

Every chat request from the UI must include:

```json
{
  "persona": "yuna",
  "message": "...",
  "surface": "personal-homepage",
  "page": "/yuna",
  "session_hint": "optional-ui-session-id"
}
```

### Backend behavior

For every incoming chat request:

1. validate the persona
2. load persona profile
3. load persona memory and recent summary
4. load allowed contextual state
5. append inbound message to persona archive
6. call the correct persona agent mode
7. append response to archive
8. return response to the UI

### Invariants

- no request without persona
- no personal request may fall back to `family`
- no family request may load private personal memory by default
- persona switching must be impossible by prompt alone

---

## 5. Visibility and Privacy Model

Every structured item should carry a visibility label.

Supported visibility levels:

- `private:nina`
- `private:martin`
- `private:olivia`
- `private:yuna`
- `private:selma`
- `parents`
- `family`
- `system`

Usage examples:

- Yuna personal chat summary → `private:yuna`
- school email for Olivia requiring parent action → `private:olivia` + `parents`
- family dinner plan → `family`
- backend outage → `system`

### Rules

- personal pages only read matching private data plus explicitly shared data
- family page reads only `family` and selected shared summaries
- CEO/orchestrator should prefer summarized/structured signals instead of raw private transcripts
- automated actions that cross visibility boundaries require explicit policy

---

## 6. Data Root Structure

All durable data should live under `DATA_ROOT`.

Recommended structure:

```text
DATA_ROOT/
  state/
    sessions/
      family/
      nina/
      martin/
      olivia/
      yuna/
      selma/
    summaries/
      family/
      nina/
      martin/
      olivia/
      yuna/
      selma/
    inbox/
    reminders/
    health/
  archive/
    family/
    nina/
    martin/
    olivia/
    yuna/
    selma/
    system/
  profiles/
    family/
      profile.json
      memory.md
    nina/
      profile.json
      memory.md
    martin/
      profile.json
      memory.md
    olivia/
      profile.json
      memory.md
    yuna/
      profile.json
      memory.md
    selma/
      profile.json
      memory.md
  media/
  cache/
  logs/
  backups/
```

### Path rules

- no durable runtime data in repo-local folders in production
- all archive writes should be append-oriented where possible
- all profile and memory files must be persona-specific
- missing `DATA_ROOT` should cause a clear startup failure

---

## 7. Persona Profile Model

Each persona should have a `profile.json` containing structured behavioral metadata.

Suggested schema:

```json
{
  "id": "yuna",
  "displayName": "Yuna",
  "role": "child",
  "ageBand": "child",
  "tone": "warm_simple_playful",
  "interests": ["crafts", "stories", "friends"],
  "calendarIds": ["yuna@family.local"],
  "mailLabels": ["yuna", "school", "family"],
  "visibilityDefault": "private:yuna",
  "actionPolicy": {
    "canDraftEmail": false,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": false,
    "requiresParentApprovalForExternalActions": true
  }
}
```

### Why this matters

This allows the backend to:

- tailor voice and complexity
- control allowed actions
- map data sources to the right persona
- avoid relying only on prompt instructions

---

## 8. Event-Driven State Layer

The backend should normalize external inputs into structured events.

### Input sources

- Google Calendar
- Gmail
- dashboard/task entries
- Home Assistant
- chat interactions
- archive/media events

### Example event types

- `calendar.event.created`
- `calendar.event.updated`
- `mail.received`
- `mail.classified`
- `task.created`
- `task.completed`
- `chat.message.received`
- `chat.summary.generated`
- `ha.entity.changed`
- `health.integration.changed`

### Event envelope

```json
{
  "type": "mail.received",
  "source": "gmail",
  "persona": "olivia",
  "visibility": ["private:olivia", "parents"],
  "timestamp": "2026-03-27T18:42:00Z",
  "payload": {}
}
```

### Benefits

- clean routing
- auditability
- less coupling between UI and integrations
- easier summary generation
- easier CEO monitoring

---

## 9. Agent Roles in Detail

## 9.1 CEO / Orchestrator Agent

Responsibilities:

- monitor system health
- review family-wide summaries
- detect scheduling conflicts
- propose improvements to UI/runtime/data flows
- trigger background jobs when needed
- maintain implementation backlog or improvement log

Data access preference:

- read structured summaries, alerts, and events first
- avoid default access to full personal raw transcripts

Outputs:

- improvement proposals
- family planning summaries
- maintenance notes
- health alerts

## 9.2 Family Persona Agent

Responsibilities:

- shared family chat
- shared planning assistance
- family reminders
- house-level guidance
- discussion of shopping/tasks/common events

Should not:

- expose personal private history by default
- collapse all member-specific memory into one stream

## 9.3 Personal Persona Agents

Each personal agent should:

- answer in the correct personal voice/context
- know personal schedule and relevant reminders
- maintain private memory and summaries
- escalate to parents when action policy requires it

Examples:

### Nina Agent
- planning-focused
- shopping and household coordination
- calendar and email triage support

### Martin Agent
- planning, system/admin tasks, home control context
- concise actionable summaries

### Olivia Agent
- more independent child/teen style depending on age/config
- school and activity context
- suggestions and reminders appropriate to her level

### Yuna Agent
- simpler language
- visual/short suggestions
- no autonomous external actions

### Selma Agent
- age-appropriate, very simple interactions if used directly
- likely heavily constrained tool access

---

## 10. Gmail Integration Model

Mail should enter through an ingestion pipeline instead of direct prompt stuffing.

### Pipeline

1. fetch new mail
2. classify scope, urgency, and target persona(s)
3. extract deadlines / commitments / required actions
4. write structured mail event
5. generate short summary for the right persona(s)
6. optionally create reminder/task suggestions
7. escalate to CEO/family/parents if needed

### Example

School mail about Olivia excursion:

- classify to `olivia` + `parents`
- deadline detected
- create `mail.classified` event
- propose:
  - reminder
  - task to sign form
  - draft reply

### Policy

- default to draft, not send
- sending external email should require explicit approval policy
- children’s agents should not send mail autonomously

---

## 11. Calendar Intelligence Model

Calendar should be more than display.

### Agentic functions

- daily briefings
- evening preparation reminders
- conflict detection
- overlap warnings
- free-slot suggestions
- recurring pattern detection
- family logistics summaries

### Outputs

- morning digest per persona
- weekly family overview
- alerts for unusual overlaps or forgotten preparations

The existing explicit calendar mapping model should remain the basis:

- `calendar_id`
- `calendar_label`
- `member_id`
- `member_color`

This is much safer than guessing from event titles.

---

## 12. Recommended Runtime Model on the Pi

Do not keep six heavy LLM sessions permanently active if not needed.

Use a hybrid runtime:

### Always-on services

- Family UI web server
- backend API server
- integration workers
- event store / state manager
- health monitor

### On-demand intelligence calls

Trigger persona-agent reasoning when:

- a person sends a chat message
- a new relevant mail arrives
- a digest is generated
- a planning or conflict-check job runs

This reduces resource usage while keeping the system effectively always available.

---

## 13. OpenClaw-Oriented Orchestration Model

OpenClaw can serve as the intelligence/orchestration layer.

Suggested mapping:

- `session:nummer12-family`
- `session:nummer12-nina`
- `session:nummer12-martin`
- `session:nummer12-olivia`
- `session:nummer12-yuna`
- `session:nummer12-selma`
- `session:nummer12-ceo`

### Usage pattern

- personal chats route to matching persona session
- family chat routes to family session
- CEO session is used for review, planning, and improvement proposals
- scheduled jobs can run as isolated agent turns and write summaries/events back into durable storage

### Good fits for cron/background jobs

- morning briefings
- evening prep summaries
- weekly family planner
- mail triage sweeps
- system health checks
- archive summarization

---

## 14. Reliability and Operations

### Family UI process

The app must run as a managed service via `systemd`.

Recommended behavior:

- restart on failure
- wait for network
- fail if `DATA_ROOT` is unavailable
- emit logs to journal and `DATA_ROOT/logs`

### Watch targets

- UI process health
- OpenClaw health
- Google Calendar health
- Gmail integration health
- Home Assistant health
- storage availability

### Backups

Minimum recommendations:

- daily backup of `profiles/`, `state/`, `archive/`
- weekly full snapshot of critical runtime data

---

## 15. Safety and Approval Policy

### High-confidence rules

- no private personal context leaks into family chat by default
- no external send action without explicit approval policy
- children’s personas should have tighter action limits
- all cross-context automation should be logged
- all generated reminders/tasks should retain source attribution when possible

### External action classes

- low risk: local reminders, local summaries, local notes
- medium risk: calendar suggestions, draft emails, family task suggestions
- high risk: sending emails, messaging third parties, deleting data

High-risk actions should require explicit approval or parent-level policy.

---

## 16. Implementation Roadmap

## Phase 1 — Durable foundation

- run Family UI via `systemd`
- move all durable state under `DATA_ROOT`
- expose health indicators in UI
- verify update/restart behavior

## Phase 2 — Persona plumbing

- require persona on all chat requests
- create persona-specific profile/memory/archive paths
- implement backend chat router
- separate family and personal chat histories fully

## Phase 3 — Structured state

- implement normalized event store
- add calendar ingestion and explicit persona mapping
- add dashboard/task event ingestion
- add summary generation pipeline

## Phase 4 — Agentic features

- daily digest generation
- evening prep reminders
- mail triage pipeline
- calendar conflict detection
- family weekly summary

## Phase 5 — CEO intelligence

- improvement proposal loop
- system review reports
- backlog generation from observed friction
- controlled self-improvement proposals for UI and runtime

---

## 17. Immediate Next Technical Steps

Recommended next actions for the repo:

1. add backend persona router design and endpoint spec
2. define `DATA_ROOT` production path model in code
3. create `profiles/<persona>/profile.json` templates
4. add event and summary storage structure
5. add service files and operations scripts
6. add a simple digest generator using calendar + dashboard inputs

---

## 18. First Concrete Deliverables

The first implementation slice should produce these visible results:

1. **Separated personal chatboxes work correctly**
   - Yuna talks to Yuna context
   - Olivia talks to Olivia context
   - family chat remains separate

2. **Morning digest exists**
   - family digest on home screen
   - personal digest on personal pages

3. **Health and persistence are production-safe**
   - service restarts cleanly
   - data is written only under `DATA_ROOT`
   - errors are visible

4. **Mail/calendar intelligence begins to feel agentic**
   - relevant events get routed to the correct people
   - simple reminders and action suggestions appear automatically

---

## 19. Design Summary

The right long-term architecture is:

- one always-on family interface
- one orchestrator / CEO intelligence layer
- one persona agent per family member plus family persona
- structured event ingestion for mail/calendar/dashboard/home state
- strict memory separation
- explicit visibility rules
- on-demand reasoning on top of durable local state

This is the most credible way to make `Nummer 12` feel like a long-lived house AI instead of a generic chat widget.
