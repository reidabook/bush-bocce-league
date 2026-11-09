# Feature: AI Chat (Gemini)

## Overview

The commissioner logs games in plain language from the **Tonight** screen (`/tonight`, or any active session's `/sessions/:id`). A composer ("“Kat's beat Colin's”") sits in the bottom dock next to **+ Game**. Sending opens an **Assistant** sheet with the conversation; it stays available (chat button in the dock) while you're on the page. When the AI runs any action, the session reloads.

- Component: `src/pages/session/Assistant.jsx`; request building: `src/lib/chatClient.js` (`buildChatRequest` → `{ messages, weekContext: { week, teams, games, departures } }`).
- Old `/admin/chat` page removed; the route redirects to `/tonight`.
- Errors show in the conversation: "Couldn't reach the assistant. Try again."

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
- Everything the AI does can also be done by hand on the Session screen (see `session-management.md` — Commissioner controls).
