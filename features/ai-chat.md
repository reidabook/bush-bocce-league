# Feature: AI Chat (Gemini)

## Overview

Two entry points for Gemini-powered natural language game logging:

| Route | Component | Context |
|-------|-----------|---------|
| `/active` | `ActiveSession` | Public live-session view — shows current teams and a chat box |
| `/admin/chat` | `AdminChat` | Admin-only chat panel |

## What the AI can do

The Gemini function-calling API (`api/chat.js`) exposes these tools:

| Tool | Description |
|------|-------------|
| `add_game` | Create a new game between two teams |
| `record_result` | Record a winner for a game |
| `log_player_departure` | Mark a player as having left early |
| `exclude_player_from_game` | Exclude a specific player from a specific game |
| `restore_player_to_game` | Remove a per-game exclusion |

## Example prompts

- "Red Team beat Blue Team"
- "Add a game — Green vs Red, Green wins"
- "Jake left early"
- "Colin only played game 2" → AI should exclude Colin from game 1 and game 3

## Notes

- The AI is given the current week's teams and games as context on every message.
- Results are written immediately to Google Sheets via the same `_db.js` functions.
- `exclude_player_from_game` / `restore_player_to_game` are also now available in the admin UI (see `session-management.md` — Player exceptions).
