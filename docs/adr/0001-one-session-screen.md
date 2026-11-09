# 1. One session screen for everyone

Date: 2026-11-09 · Status: accepted

## Context
A session was shown four different ways: `/active` (live view), `/sessions/:id` (public detail), `/admin/sessions/:id` (manage) and `/admin/chat` (AI). Recording a winner was possible in three of them, each with different layout and wording.

## Decision
One Session screen (`/sessions/:id`) renders any session. The **Tonight** tab (`/tonight`) shows the active session in that screen. Everyone sees the same layout; the commissioner gets inline controls (record winner, add/edit game, per-game exclusions, left early, late arrivals, session options) and an AI assistant composer docked at the bottom.

Old URLs redirect: `/active` → `/tonight`, `/admin/sessions/:id` → `/sessions/:id`, `/admin/chat` → `/tonight`, `/admin` → `/` (commissioner menu opens from the header).

## Consequences
- One place to fix bugs and learn the UI; less code.
- Admin-only controls must be gated by `isAdmin()` inside shared components.
- Playwright e2e selectors need rewriting (they were already stale: "Week"/"Close Week").
