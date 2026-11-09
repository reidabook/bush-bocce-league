# Feature: Session Management

## Overview

The commissioner creates a "session" (called a "week" in the data model) for each night of play. A session tracks attendance, team assignments, individual game results, player departures, and per-game player exclusions.

Multiple sessions can share the same calendar date (e.g. when teams re-form mid-night into different groupings). Each is a separate week entry but the same date deduplicates for "sessions attended" in standings.

---

## Sessions list (`/sessions`)

Newest first, grouped by month (year added for older years). Each row: day number + weekday, "Session N", status line (Final / Archived stats / Setting up) or a red **Live** pill for the active session. Rows link to the session (active → `/tonight`). Grouping: `src/lib/sessionGroups.js`.

---

## Session screen (`/sessions/:id`, `/tonight`)

One screen for every session, for everyone (`docs/adr/0001-one-session-screen.md`). `/tonight` shows the active session; with none: "No session tonight" (commissioner gets "Start a session").

- **Header:** active → red Live label, "Tonight", "Session N · date". Otherwise → "Session N" eyebrow, full date, game count.
- **Teams:** grid of cards (3 across for 3 teams, else 2), team ball + short name, each player with points earned this session. Players who left early are muted with "left after Game N".
- **Games:** newest first. "N ● Winner beat ● Loser"; pending games show "vs" and an **In play** pill. Notes in small italics.
- **Footnote (active only):** "Win = 4 pts, loss = 1. Tonight's points join the standings when the session closes."
- Points per player (`src/lib/sessionStats.js`) follow standings rules. The old separate "Tonight's Score" table (rank/W/GP) was folded into the team cards.

---

## Creation flow (`/admin/sessions/new`)

Full-screen flow (no tab bar). Navy header shows "Step N of 2"; X cancels, ‹ goes back to step 1.

**Step 1 — Who's here?**
- Date (defaults to today) and number of teams (2 / 3 / 4) side by side.
- "N of M playing" with **Select all / Clear all**; checkbox rows show each player's season points. Everyone starts checked.
- Sticky footer: how to split (**Random · Snake draft · Manual**) with a one-line hint, then **Make N teams →** / **Place N players →**. Needs at least one player per team.

**Step 2 — teams**

| Mode | Behaviour |
|------|-----------|
| Random | Fisher-Yates shuffle, dealt round-robin. **Reshuffle** deals again. |
| Snake draft | Draft order by season points (desc); new players last. **Re-draft** rebuilds. |
| Manual | Each player row has numbered team buttons (1…N); header shows count per team and "N to place". Start is enabled once everyone is placed. |

Random/snake show team cards in ball-color order (ball + captain name + player count). Each player has a "→ ●" button that moves them to the next team (color shown). Captain = alphabetically-first player; team name `"{FirstName}'s Team"`; names update live.

**Lock teams & start** creates the session (number = count + 1), saves attendees and teams, sets status `active`, and opens **Tonight**.

---

## Session screen (`/sessions/:id`, `/tonight`)

One screen for every session, for everyone (`docs/adr/0001-one-session-screen.md`). `/tonight` shows the active session; with none: "No session tonight" (commissioner gets "Start a session").

- **Header:** active → red Live label, "Tonight", "Session N · date". Otherwise → "Session N" eyebrow, full date, game count.
- **Teams:** grid of cards (3 across for 3 teams, else 2), team ball + short name, each player with points earned this session. Players who left early are muted with "left after Game N".
- **Games:** newest first. "N ● Winner beat ● Loser"; pending games show "vs" and an **In play** pill. Notes in small italics.
- **Footnote (active only):** "Win = 4 pts, loss = 1. Tonight's points join the standings when the session closes."
- Points per player (`src/lib/sessionStats.js`) follow standings rules. The old separate "Tonight's Score" table (rank/W/GP) was folded into the team cards.

---

## Creation flow (`/admin/weeks/new`)

**Step 1 — Setup**
- Pick date (defaults to today)
- Pick number of teams: 2, 3, or 4
- Check off tonight's attendees from the roster

**Step 2 — Team assignment**
Three modes:

| Mode | Behaviour |
|------|-----------|
| Random | Fisher-Yates shuffle, distributed round-robin across N teams. Swap button cycles a player to the next team. |
| Snake Draft | Snake draft ordered by current standings (points desc). Rank 1 and rank N land on the same team. New players with no standing are drafted last. |
| Manual | Commissioner assigns each player to a team via numbered buttons (Team 1, Team 2, …). |

Team names are auto-assigned from the captain: alphabetically-first player on each team becomes captain, team is named `"{FirstName}'s Team"`. Captain names update live in auto mode as players are reshuffled or swapped.

Locking teams saves the week (status → `active`) and navigates to the week manage page.

---

## Commissioner controls (on the Session screen)

Same screen as everyone else, plus controls (`src/pages/session/`). `/admin/sessions/:id` redirects to `/sessions/:id`.

- **Session options (⋯ next to the title):** change date · **Close session** (warns if games have no result; closing adds points to standings) / **Reopen session** · **Delete session** (confirm; removes teams, games, departures, exclusions).
- **Pending game card** (active sessions): the newest game with no result. "Game N · Who won?" with one big ball button per team; tapping records the winner and shows "Kat's won game 4. Undo" (undo clears the result). Notes which team(s) sit out. Player chips: tap anyone who didn't play this game → per-game exclusion (dashed, struck through); tap again to restore.
- **Games list:** pencil on every game → sheet with winner buttons (change winner), **Clear result**, player exclusion chips, **Delete game** (confirm).
- **+ Game** (docked above the tab bar, active sessions): with 2 teams adds a game immediately; with 3+ opens a sheet to pick the two teams (others sit out) + optional note.
- **Teams & who left early:** sheet listing every team. Per player **Left early** (logs a departure now — no points in later games) or **Undo**. Per team **Add late arrival** when roster players aren't on a team: tap a name to add them to that team and the attendee list.
- Errors show inline ("That didn't save: …"); actions run one at a time.
- Completed sessions keep every control except + Game and the pending card.

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
- **Player joins late:** "Add late arrival" in Teams & who left early; then tap their chip on each game they *didn't* play.
- **Player leaves early:** "Left early" in Teams & who left early. All games recorded after that timestamp will not count for them.
- **3-team round-robin:** each game, select the two playing teams. The third team's players automatically earn 0 for that game (they're not in `team_a_id` or `team_b_id`).
- **Captain name collision:** if two teams have players with the same first name as alphabetical leader, both teams will display the same name. They are still uniquely identified by ID; rename a player in the roster to resolve.
