# Feature: Roster

## Overview

The commissioner manages the master player list at `/admin/roster`. Players are shared across all sessions and seasons.

## Behaviour

- **Add player:** enter name, tap Add. Player is immediately active and available for attendance selection.
- **Deactivate player:** soft-delete — sets `active = false`. Player no longer appears in attendance pickers or standings. Historical stats are preserved.
- No player editing (name changes) via UI — edit the Google Sheet directly if needed.

## Data

Single `players` sheet tab. `active` stored as the string `"true"` or `"false"` (Google Sheets limitation).
