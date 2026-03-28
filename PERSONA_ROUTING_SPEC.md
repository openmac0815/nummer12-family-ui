# Persona Routing Spec

## Purpose

This document defines how chat requests in `nummer12-family-ui` must be routed so that each family member interacts with the correct long-lived `Nummer 12` context.

---

## 1. Core rule

Every chat request must carry an explicit target persona.

Supported personas:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Requests without a valid persona must be rejected.

---

## 2. UI requirements

Each chatbox in the UI is bound to exactly one persona.

### Shared page

- route `/`
- chatbox persona: `family`

### Personal pages

- `/nina` -> `nina`
- `/martin` -> `martin`
- `/olivia` -> `olivia`
- `/yuna` -> `yuna`
- `/selma` -> `selma`

The UI must never infer persona from message text.
It must send persona as structured request data.

---

## 3. Request shape

Recommended request body:

```json
{
  "persona": "olivia",
  "message": "Was habe ich morgen?",
  "surface": "personal-homepage",
  "page": "/olivia",
  "clientTimestamp": "2026-03-27T22:00:00+01:00",
  "uiSessionId": "optional-client-session-id"
}
```

### Required fields

- `persona`
- `message`

### Optional fields

- `surface`
- `page`
- `clientTimestamp`
- `uiSessionId`

---

## 4. Backend routing flow

For every inbound request:

1. validate payload
2. validate persona against allowed set
3. load persona profile
4. resolve persona data paths
5. load persona memory and recent summary
6. collect allowed live context
7. append inbound message to persona archive
8. call persona-specific intelligence flow
9. append outbound response to archive
10. return response with metadata

---

## 5. Persona path resolution

All durable paths derive from `DATA_ROOT`.

Example resolution for persona `yuna`:

```text
profiles/yuna/profile.json
profiles/yuna/memory.md
state/sessions/yuna/
state/summaries/yuna/
archive/yuna/
```

The backend must never mix persona paths.

---

## 6. Family vs personal context rules

### Family persona

May access:

- family-visible summaries
- shared calendar data
- shared dashboard/task state
- family archive

Must not automatically access:

- raw personal private chat history
- raw personal memory files

### Personal persona

May access:

- matching personal memory
- matching personal summary
- family-shared data
- explicitly shared parent/family items where policy allows

Must not access:

- other family members' private memory by default

---

## 7. Session model

Each persona should map to a durable session identity.

Suggested mapping:

- `session:nummer12-family`
- `session:nummer12-nina`
- `session:nummer12-martin`
- `session:nummer12-olivia`
- `session:nummer12-yuna`
- `session:nummer12-selma`

This preserves long-lived continuity while keeping personas separate.

---

## 8. Archive write format

Each request/response pair should be archived with metadata.

Suggested structure:

```json
{
  "timestamp": "2026-03-27T22:01:34Z",
  "persona": "olivia",
  "surface": "personal-homepage",
  "page": "/olivia",
  "role": "user",
  "message": "Was habe ich morgen?"
}
```

and then:

```json
{
  "timestamp": "2026-03-27T22:01:35Z",
  "persona": "olivia",
  "surface": "personal-homepage",
  "page": "/olivia",
  "role": "assistant",
  "message": "Morgen hast du ..."
}
```

Prefer newline-delimited JSON for easy append and later summarization.

---

## 9. Error behavior

If persona is missing or invalid:

- return HTTP 400
- do not fall back to `family`
- log structured error event

If persona profile is missing:

- return HTTP 503 or 500 depending on initialization state
- expose clear error in logs and UI

If memory/archive path is unavailable:

- fail clearly
- do not silently write to repo-local fallback paths in production

---

## 10. Future extension hooks

The routing layer should be able to attach:

- daily summaries
n- calendar digest
- mail digest
- safety/visibility filter
- child-specific style mode
- parent approval gates

This makes persona routing the stable backbone for future agentic features.
