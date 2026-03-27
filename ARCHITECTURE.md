# Nummer12 Family UI Architecture

## Purpose

`nummer12-family-ui` is a long-running family home interface intended to run on a Raspberry Pi and be used from a shared tablet.

The system has two goals:

1. Provide a stable family dashboard for planning and home control.
2. Act as the front-end for `Nummer12`, a home AI that interacts with the family over time and builds memory.

## Product Structure

The product is organized into three experience layers.

### 1. Family Home

Route: `/`

This is the central tablet landing page.

It should contain:

- weekly planner as the primary visual anchor
- quick access buttons to key sections
- rotating local photos or generated daily image
- shopping list
- family chat with the shared `Nummer12` persona

### 2. Functional Pages

These are shared utility pages.

- `/calendar`
- `/home-control`
- `/media`

Their purpose:

- `calendar`: readable weekly calendar and filtering by family member
- `home-control`: lights and blinds/jalousies grouped by room
- `media`: music, speakers, TV, or future media controls

### 3. Personal Homepages

Each family member gets a personalized homepage, not just a chat page.

- `/nina`
- `/martin`
- `/olivia`
- `/yuna`
- `/selma`

Each personal homepage should contain:

- personal schedule block
- personal interest modules
- personal chat with `Nummer12`
- suggestions relevant to that person

## Core System Components

### Frontend

Responsibilities:

- routing and page rendering
- tablet-friendly navigation
- family and personal dashboards
- input surfaces for chat, shopping, controls

### Backend

Responsibilities:

- proxy between UI and external systems
- Home Assistant integration
- Google Calendar integration
- OpenClaw / Ollama chat integration
- local persistence and archive writing

## Calendar Model

The intended Google setup is a central hub account owned by `Nummer12`.

Recommended example:

- `mainbernhheimerstrasse12@gmail.com`

That account should aggregate or own:

- one family/shared calendar
- optional personal calendars for `nina`, `martin`, `olivia`, `yuna`, `selma`

The UI should not depend on guessing people only from event text.

Preferred model:

- each visible calendar source maps explicitly to a persona
- events carry `calendar_id`, `calendar_label`, `member_id`, and `member_color`
- the weekly planner and personal homepages render from that explicit mapping

This allows:

- clear color coding
- child-specific schedules
- parent views with all relevant calendars
- future ingestion from chat, Telegram, email, or automation into the correct target calendar

### Persistence Layer

Responsibilities:

- durable storage on USB-attached disk
- persona-separated session and memory files
- archives, media, summaries, configuration

## Conversation Model

`Nummer12` is not a single undifferentiated chat. It has distinct personas:

- `family`
- `nina`
- `martin`
- `olivia`
- `yuna`
- `selma`

Rules:

- each persona has its own conversation stream
- each persona has its own memory and archive
- no cross-contamination of personal chat history
- the family persona is shared and distinct from personal personas

Frontend requests should always identify the target persona explicitly.

## Memory Model

The system should keep three memory layers.

### 1. Active Session

- recent messages
- current exchange context
- today's relevant state

### 2. Summaries

- daily or weekly summaries
- compressed reusable memory

### 3. Curated Memory

- stable preferences
- important personal details
- significant family events

## Resilience Principles

The app should degrade gracefully.

- If Google Calendar is unavailable, non-calendar features should still work.
- If Home Assistant is unavailable, chat and calendar should still work.
- If OpenClaw is unavailable, dashboard features should remain available.
- If the configured data root is unavailable, the app should fail clearly rather than silently writing elsewhere.

## UI Principles

- prioritize readability from a tablet at distance
- week view over month view
- avoid overcrowding the home page
- separate operational surfaces from personal experiences
- keep touch targets large and obvious

## Extension Model

Personal homepages should be driven by configurable modules rather than hardcoded one-off layouts.

Examples:

- Martin: news, calendar, chat
- Olivia: crafts, calendar, chat
- Nina: planning, shopping, calendar, chat
- Yuna: simple ideas, pictures, chat
- Selma: age-appropriate suggestions, pictures, chat

This enables long-term evolution without restructuring the app.
