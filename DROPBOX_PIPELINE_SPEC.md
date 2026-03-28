# Dropbox Pipeline Spec

## Purpose

This document defines how the shared and persona-specific dropbox folders should work in `nummer12-family-ui`.

The dropbox is the household intake surface for items that family members throw at `Nummer 12`:

- invitations
- school letters
- screenshots
- PDFs
- photos of paper notes
- reminders
- rough text notes
- appointment details

The system should ingest these items, analyze them, classify them, and propose useful next actions such as calendar entries, reminders, notes, or family tasks.

---

## 1. Dropbox targets

Supported dropbox targets:

- `general`
- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

### Semantics

- `general`: uncategorized intake for the household
- `family`: clearly shared household/family items
- persona targets: likely relevant to one specific person

---

## 2. Storage layout

Recommended structure under `DATA_ROOT`:

```text
dropbox/
  general/
  family/
  nina/
  martin/
  olivia/
  yuna/
  selma/
```

Each dropbox item should be stored durably.

Recommended metadata index:

```text
state/dropbox-index.json
```

---

## 3. Supported input types

### Initial support

- plain text items
- structured notes from UI forms
- uploaded files with metadata

### Future support

- image uploads
- PDFs
- OCR from photographed paper documents
- email attachments mirrored into dropbox

---

## 4. Item model

Suggested canonical item structure:

```json
{
  "id": 1743112345678,
  "target": "olivia",
  "title": "Birthday invitation",
  "text": "Saturday 14:00 at Mia's house...",
  "source": "ui",
  "status": "new",
  "createdAt": "2026-03-27T22:55:00Z",
  "suggestedActions": [
    "analyze",
    "extract dates",
    "propose calendar entry",
    "propose reminders"
  ]
}
```

Suggested future fields:

```json
{
  "type": "text|image|pdf|email|attachment",
  "visibility": "family|private:olivia|parents",
  "filePath": "optional-path",
  "mimeType": "optional-mime-type",
  "analysis": {},
  "proposals": []
}
```

---

## 5. Pipeline stages

Each item should move through a deterministic pipeline.

### Stage 1: intake

- receive item via UI or API
- assign durable ID
- store raw item
- append index entry
- status = `new`

### Stage 2: classify

Determine:

- who is this about?
- is it family/shared/private?
- what kind of document is it?
- does it contain a date/time?
- does it imply action?

Possible classification labels:

- `calendar_candidate`
- `reminder_candidate`
- `task_candidate`
- `memory_candidate`
- `mail_candidate`
- `document_only`

### Stage 3: extract

Extract structured fields where possible:

- title
- date
- start time
- end time
- location
- people involved
- action deadline
- response required
- source person

### Stage 4: propose

Generate proposed outputs:

- calendar entry proposal
- reminder proposal
- family task proposal
- note proposal
- parent escalation proposal

### Stage 5: review / apply

Depending on policy:

- auto-create a note or reminder
- show proposed calendar entry in UI
- require explicit approval before writing to calendar or sending mail

### Stage 6: archive and summarize

- mark item processed or partially processed
- write result to archive
- surface digest summary in the appropriate persona/family UI

---

## 6. Example flow: birthday invitation

Input:

- Olivia throws an invitation into `dropbox/olivia`
- text says: `Mia Geburtstag am Samstag 14 Uhr, bitte bis Donnerstag Bescheid geben`

Expected pipeline result:

### Classification

- target persona: `olivia`
- visibility: `private:olivia` + maybe `parents`
- type: invitation
- labels: `calendar_candidate`, `reminder_candidate`, `response_required`

### Extraction

- event title: `Mia Geburtstag`
- event date: next Saturday
- start time: `14:00`
- response deadline: Thursday

### Proposals

- calendar proposal for Olivia
- reminder for parent decision or response deadline
- short summary on Olivia page
- optional family/parent note

---

## 7. Review policy

### Low-risk actions

May be auto-created if confidence is high:

- local note
- local reminder draft
- local summary

### Medium-risk actions

Should usually require lightweight confirmation:

- calendar entry proposal
- family task creation

### High-risk actions

Must require explicit approval:

- sending email
- messaging third parties
- deleting source files

---

## 8. Persona and visibility handling

Dropbox does not bypass privacy rules.

Rules:

- items in persona dropbox default to that persona visibility
- items in `family` default to family visibility
- items in `general` must be classified before broad exposure
- children-related documents may also be visible to parents depending on policy

---

## 9. Suggested implementation order

### First vertical slice

Implement:

- text-only dropbox intake
- index storage
- classification stub
- extraction stub for simple date/time text
- calendar/reminder proposal object generation
- UI/API listing of pending items

### Second slice

Implement:

- file uploads
- image/PDF handling
- OCR integration
- richer extraction

### Third slice

Implement:

- review UI
- accept/reject proposals
- write accepted items into calendar/task/reminder systems

---

## 10. Integration outputs

Accepted outputs should be able to feed into:

- calendar integration
- reminders state
- notes state
- archive logs
- persona summary generation

This makes the dropbox a practical household intake mechanism instead of just a folder full of junk.
