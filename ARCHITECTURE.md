# Bush League Bocce — Architecture

## Overview

React SPA (Vite) + Vercel serverless API. No traditional backend — all persistent data lives in a Google Spreadsheet accessed via service account. The frontend calls `/api/sheets` for every read and write.

---

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | `Home` | Public | Standings leaderboard + active session card |
| `/sessions` | `SessionList` | Public | All sessions list |
| `/sessions/:id` | `SessionDetail` | Public | Session detail: teams, games, player points |
| `/active` | `ActiveSession` | Public | Live session view + AI chat interface |
| `/tournament` | `Tournament` | Public | Tournament bracket |
| `/rules` | `Rules` | Public | Scoring rules |
| `/admin/login` | `AdminLogin` | Public | Password gate |
| `/admin` | `AdminDashboard` | Admin | Session list + links |
| `/admin/roster` | `AdminRoster` | Admin | Add/deactivate players |
| `/admin/sessions/new` | `AdminNewSession` | Admin | 2-step session creation flow |
| `/admin/sessions/:id` | `AdminSessionManage` | Admin | Manage active session: games, results, departures, per-game exclusions |
| `/admin/tournament` | `AdminTournament` | Admin | Seed and run tournament |
| `/admin/chat` | `AdminChat` | Admin | AI chat (Gemini) for hands-free game logging |

---

## Google Sheet Tabs (data model)

| Tab | Columns | Notes |
|-----|---------|-------|
| `players` | `id, name, active, created_at` | `active` = "true"/"false" string |
| `sessions` | `id, week_number, date, status, team_size, created_at` | `status`: setup / active / completed / historical. **Note: tab was formerly named `weeks` — rename manually in Google Sheets.** |
| `week_attendees` | `week_id, player_id` | Which players attended each session |
| `teams` | `id, week_id, name` | Color-named teams per week |
| `team_players` | `team_id, player_id` | Team roster |
| `games` | `id, week_id, team_a_id, team_b_id, winner_team_id, notes, created_at` | `winner_team_id` null until recorded |
| `player_departures` | `id, week_id, player_id, departed_at` | Players who left early; used to exclude from subsequent games |
| `game_player_exclusions` | `id, game_id, player_id` | Per-game player exclusions (late arrivals, etc.) |
| `historical_player_stats` | `player_id, points, wins, games_played` | Pre-computed stats for archived weeks (status=historical) |
| `tournament` | `id, status, format, created_at` | One row per season |
| `tournament_matches` | `id, tournament_id, round, position, player_a_id, player_b_id, winner_id, is_bye` | Bracket matches |

---

## API

Single endpoint: `POST /api/sheets` with body `{ action, ...params }`.

Implemented in `api/sheets.js` (routing) → `api/_db.js` (Google Sheets logic).

### Actions

| Action | Params | Description |
|--------|--------|-------------|
| `getPlayers` | — | All active players |
| `addPlayer` | `name` | Add to roster |
| `deactivatePlayer` | `id` | Soft-delete |
| `renamePlayer` | `id, name` | Update player name |
| `getSessionManageData` | `id` | Single-call snapshot: session + teams + games + departures + exclusions + allPlayers |
| `getSessions` | — | All sessions |
| `getSession` | `id` | Single session |
| `createSession` | `sessionNumber, date, teamSize` | Create session in `setup` status |
| `updateSessionStatus` | `id, status` | Advance session status |
| `updateSessionDate` | `id, date` | Change session date |
| `deleteSession` | `id` | Hard-delete session + all cascading data |
| `getAttendees` | `sessionId` | Attendee player objects |
| `setAttendees` | `sessionId, playerIds` | Replace attendee list |
| `addPlayerToTeam` | `sessionId, teamId, playerId` | Add late-arriving player to team + attendees |
| `getTeamsForSession` | `sessionId` | Teams with nested players array |
| `saveTeams` | `sessionId, teams` | Replace all teams + rosters for a session |
| `getGamesForSession` | `sessionId` | All games for session |
| `addGame` | `sessionId, teamAId, teamBId, notes?` | Add unresolved game |
| `recordGameResult` | `gameId, winnerTeamId` | Set winner (null to clear) |
| `deleteGame` | `gameId` | Hard delete game row |
| `clearGameResult` | `gameId` | Set winner_team_id to null |
| `getDepartures` | `sessionId` | Departure records |
| `logDeparture` | `sessionId, playerId` | Record player left early |
| `removeDeparture` | `sessionId, playerId` | Undo departure |
| `getGamePlayerExclusions` | `sessionId` | Per-game exclusion records |
| `excludePlayerFromGame` | `gameId, playerId` | Exclude player from one game |
| `restorePlayerToGame` | `gameId, playerId` | Remove exclusion |
| `getStandings` | — | Computed leaderboard |
| `getTournament` | — | Current tournament |
| `createTournament` | `seededPlayerIds` | Seed bracket |
| `getTournamentMatches` | `tournamentId` | All bracket matches |
| `recordMatchResult` | `matchId, winnerId, tournamentId, round, position` | Advance winner |
| `completeTournament` | `tournamentId` | Mark season done |

Also: `GET /api/debug` (connection check), `GET /api/init-sheets` (create sheet tabs).

---

## Scoring (computed in `getStandings`)

- **+1** per game played (team was in the game, player not excluded/departed)
- **+3** per game won
- **0** if player's team DNP (team not in that game)
- **0** if player departed before game's `created_at`
- **0** if player has a `game_player_exclusions` record for that game
Tiebreaker order: points → win rate → name (alpha).

---

## Key frontend files

| File | Purpose |
|------|---------|
| `src/lib/db.js` | Thin HTTP client — all calls to `/api/sheets` |
| `src/lib/auth.js` | `login()` / `isAdmin()` via `sessionStorage` |
| `src/lib/teamUtils.js` | Pure team-building: `buildTeams` (random), `buildBalancedTeams` (snake draft) |
| `src/pages/admin/AdminNewSession.jsx` | 2-step session creation: date/team-count → attendees → team assignment (random/balanced/manual) |
| `src/pages/admin/AdminSessionManage.jsx` | Active session management: add games, record winners, log departures, per-game player exclusions |
| `src/pages/ActiveSession.jsx` | Live view + Gemini AI chat for hands-free logging |
| `api/_db.js` | All Google Sheets read/write logic |
| `api/_standingsLogic.js` | Pure standings computation (`computeStandings`) — no I/O, tested |
| `api/sheets.js` | Action router for `/api/sheets` |
| `api/chat.js` | Gemini function-calling handler |

---

## Team names (fixed palette)

Red Team · Blue Team · Green Team · Yellow Team · Purple Team · Orange Team

---

## Unit tests (Vitest)

| File | What it tests |
|------|--------------|
| `test/standings.test.js` | `computeStandings`: basic scoring, exclusions, departures, historical stats, sort order |
| `test/teamUtils.test.js` | `buildTeams` (random), `buildBalancedTeams` (snake draft), `shuffle` |

Run: `node node_modules/vitest/dist/cli.js run` from `app/`  
The `npm run build` script runs tests first — failing tests block Vercel deploys.

---

## E2E tests

| File | Scenario |
|------|---------|
| `e2e/bocce.test.js` | 2-week, 6-player synthetic scenario with departures — validates scoring and standings |
| `e2e/bocce-chat.test.js` | Same scenario driven via AI chat prompts |
| `e2e/may11.test.js` | Real May 11 data: 3-team round-robin + same-date second session + late joiner (Colin) |

Run against local dev: `npx playwright test`  
Run against prod: `npx playwright test --config=playwright.prod.config.js`
