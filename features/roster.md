# Feature: Roster

## Overview

The commissioner manages the master player list at `/admin/roster`. Players are shared across all sessions and seasons.

## Behaviour

Reached from the commissioner menu → Roster. Players listed alphabetically with a count.

- **Add player:** name field + **Add player** at the top. Player is immediately active.
- **Edit:** tap a row → inline name field with **Save name**, **Cancel**, and **Remove**.
- **Remove** (deactivate): confirm explains they leave pickers and standings while past games stay on record. Sets `active = false`.

## Data

Single `players` sheet tab. `active` stored as the string `"true"` or `"false"` (Google Sheets limitation).
