# Feature: Session Management

## Overview

The commissioner creates a "session" (called a "week" in the data model) for each night of play. A session tracks attendance, team assignments, individual game results, player departures, and per-game player exclusions.

Multiple sessions can share the same calendar date (e.g. when teams re-form mid-night into different groupings). Each is a separate week entry but the same date deduplicates for "sessions attended" in standings.

---

## Creation flow (`/admin/weeks/new`)

**Step 1 — Setup**
- Pick date (defaults to today)
- Pick number of teams: 2, 3, or 4
- Check off tonight's attendees from the roster

**Step 2 — Team assignment**
Two modes:

| Mode | Behaviour |
|------|-----------|
| Auto | Random shuffle distributed round-robin across N teams. Swap button cycles a player to the next team (`(fromTeamIndex + 1) % numTeams`). |
| Manual | Commissioner assigns each player to a team via numbered buttons (Team 1, Team 2, …). |

Team names are auto-assigned from the captain: alphabetically-first player on each team becomes captain, team is named `"{FirstName}'s Team"`. Captain names update live in auto mode as players are reshuffled or swapped.

Locking teams saves the week (status → `active`) and navigates to the week manage page.

---

## Week management (`/admin/weeks/:id`)

### Header
- Displays week number, date, and status badge.
- **Edit date:** tap the "Edit date" link next to the date to open an inline date picker with Save/Cancel.
- **Delete Week:** red button at the bottom — permanently removes the week and all cascading data (attendees, teams, games, departures, exclusions). Requires confirmation.

### Teams panel
Lists all teams with their players. Each player has a **"left"** button to log an early departure, or **"undo"** if already departed. Departed players are shown struck-through and faded.

### Add Game (active weeks only)
- With 2 teams: no selection needed — always the only two teams.
- With 3+ teams: commissioner taps two team buttons to select the playing teams before adding the game. The unselected team(s) DNP.
- Optional notes field.
- Game is created with no winner.

### Game results
Each game card shows:
- Game number, Delete button
- **If no result:** "Who won?" with a button per team
- **If result recorded:** winner / loser display with a (clear) button
- **Player exceptions** (collapsible, active weeks only): all players from both teams listed as tappable chips. Tapping excludes/includes a player from that specific game. Excluded players appear red/strikethrough. Auto-opens if any exclusions exist. Use for: late arrivals who missed specific games.

### Close Week
Marks status `completed`; points are now counted in standings. Warns if any games lack a result. Completed weeks can be reopened.

---

## Data written

| Table | What |
|-------|------|
| `weeks` | One row per session |
| `week_attendees` | One row per player per session |
| `teams` | One row per team; `name` = captain's first name + "'s Team" |
| `team_players` | One row per player per team |
| `games` | One row per game |
| `player_departures` | One row per departure event |
| `game_player_exclusions` | One row per player-game exclusion |

---

## Edge cases

- **Same-date sessions:** fully supported — create a second week entry with the same date. Sessions attended counts it as one night (date-deduplicated).
- **Player joins late:** add them to the team as normal; use "Player exceptions" in each game they *didn't* play to exclude them from those games' points.
- **Player leaves early:** use the "left" button in the Teams panel. All games recorded after that timestamp will not count for them.
- **3-team round-robin:** each game, select the two playing teams. The third team's players automatically earn 0 for that game (they're not in `team_a_id` or `team_b_id`).
- **Captain name collision:** if two teams have players with the same first name as alphabetical leader, both teams will display the same name. They are still uniquely identified by ID; rename a player in the roster to resolve.
