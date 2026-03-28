# Persona Profile Templates

## Purpose

This document defines initial profile templates for the `Nummer 12` persona system.

These templates are not final truth. They are starting points to make persona separation concrete in code and storage.

---

## Shared schema

Each persona profile should live at:

```text
profiles/<persona>/profile.json
```

Suggested fields:

```json
{
  "id": "nina",
  "displayName": "Nina",
  "role": "adult",
  "ageBand": "adult",
  "tone": "warm_clear_practical",
  "interests": [],
  "calendarIds": [],
  "mailLabels": [],
  "visibilityDefault": "private:nina",
  "actionPolicy": {
    "canDraftEmail": true,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": true,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `family`

```json
{
  "id": "family",
  "displayName": "Familie Wurm",
  "role": "shared",
  "ageBand": "mixed",
  "tone": "warm_household_coordinator",
  "interests": ["family planning", "home life"],
  "calendarIds": ["family"],
  "mailLabels": ["family", "household"],
  "visibilityDefault": "family",
  "actionPolicy": {
    "canDraftEmail": true,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": true,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `nina`

```json
{
  "id": "nina",
  "displayName": "Nina",
  "role": "adult",
  "ageBand": "adult",
  "tone": "warm_clear_planning_focused",
  "interests": ["family planning", "organization"],
  "calendarIds": ["nina"],
  "mailLabels": ["nina", "family", "school"],
  "visibilityDefault": "private:nina",
  "actionPolicy": {
    "canDraftEmail": true,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": true,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `martin`

```json
{
  "id": "martin",
  "displayName": "Martin",
  "role": "adult",
  "ageBand": "adult",
  "tone": "concise_capable_direct",
  "interests": ["systems", "planning", "home operations"],
  "calendarIds": ["martin"],
  "mailLabels": ["martin", "family", "ops"],
  "visibilityDefault": "private:martin",
  "actionPolicy": {
    "canDraftEmail": true,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": true,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `olivia`

```json
{
  "id": "olivia",
  "displayName": "Olivia",
  "role": "child",
  "ageBand": "child_or_teen",
  "tone": "friendly_supportive_age_appropriate",
  "interests": [],
  "calendarIds": ["olivia"],
  "mailLabels": ["olivia", "school"],
  "visibilityDefault": "private:olivia",
  "actionPolicy": {
    "canDraftEmail": false,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": false,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `yuna`

```json
{
  "id": "yuna",
  "displayName": "Yuna",
  "role": "child",
  "ageBand": "child",
  "tone": "simple_warm_playful",
  "interests": [],
  "calendarIds": ["yuna"],
  "mailLabels": ["yuna", "school"],
  "visibilityDefault": "private:yuna",
  "actionPolicy": {
    "canDraftEmail": false,
    "canSendEmail": false,
    "canCreateReminder": true,
    "canEditFamilyTask": false,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## `selma`

```json
{
  "id": "selma",
  "displayName": "Selma",
  "role": "child",
  "ageBand": "young_child",
  "tone": "very_simple_kind_visual_first",
  "interests": [],
  "calendarIds": ["selma"],
  "mailLabels": ["selma", "school"],
  "visibilityDefault": "private:selma",
  "actionPolicy": {
    "canDraftEmail": false,
    "canSendEmail": false,
    "canCreateReminder": false,
    "canEditFamilyTask": false,
    "requiresApprovalForExternalActions": true
  }
}
```

---

## Additional recommended files

For each persona:

```text
profiles/<persona>/memory.md
profiles/<persona>/preferences.json
profiles/<persona>/modules.json
```

### `memory.md`
- curated long-term memory
- stable preferences
- important personal facts

### `preferences.json`
- UI preferences
- display modules
- favorite colors
- notification style

### `modules.json`
- which cards appear on personal homepage
- sort order
- enabled/disabled modules

---

## Notes

These templates should be treated as policy scaffolding.

They allow code to:

- decide style
- control tool/action permissions
- map integrations correctly
- differentiate child and adult experiences

The exact personal details should be filled gradually and deliberately, not guessed.
