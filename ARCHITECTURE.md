# Bush League Bocce — Architecture

## Overview

React SPA (Vite) + Vercel serverless API. No traditional backend — all persistent data lives in a Google Spreadsheet accessed via service account. The frontend calls `/api/sheets` for every read and write.

---

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | `Home` | Public | Standings leaderboard + active session card |
| `/sessions` | `SessionList` | Public | All sessions list |
| `/sessions/:id` | `Session` | Public (+ commissioner controls) | One Session screen for any session (ADR 0001) |
| `/tonight` | `Session tonight` | Public (+ commissioner controls) | The active session in the Session screen (`/active` redirects here) |
| `/tournament` | `Tournament` | Public | Tournament bracket |
| `/rules` | `Rules` | Public | Scoring rules |
| `/admin/login` | `AdminLogin` | Public | Commissioner password; success opens the commissioner menu |
| `/admin` | redirect | Admin | → `/?commish=1` (opens the commissioner menu) |
| `/admin/roster` | `AdminRoster` | Admin | Add/deactivate players |
| `/admin/sessions/new` | `AdminNewSession` | Admin | 2-step session creation flow |
| `/admin/sessions/:id` | redirect | — | → `/sessions/:id` (commissioner controls live there) |
| `/admin/tournament` | `AdminTournament` | Admin | Seed and run tournament |
| `/admin/chat` | redirect | — | → `/tonight` (assistant is docked there) |

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
| `src/lib/standingsSort.js` | `sortStandings`, `nextSort`, `fmtWinPct` |
| `src/components/ErrorState.jsx` | Shared load-error card (retry, init sheet tabs) |
| `src/lib/sessionGroups.js` | `groupSessionsByMonth`, `dayParts`, status labels |
| `api/_bracketLogic.js` | Pure bracket logic: `buildBracket` (all rounds up front, byes to top seeds), `seedOrder`, `nextSlot`, `isFinal` |
| `src/lib/bracket.js` | `groupByRound`, `roundLabel`, `champion` |
| `src/lib/teamColors.js` | Team ball color by alphabetical team position (`teamColor`, `teamColorById`) |
| `src/lib/useActiveSession.js` | Cached active-session lookup for the tab bar live dot |
| `src/components/Layout.jsx` | Header with ridge edge + bottom tab bar |
| `src/components/CommishMenu.jsx` | Commissioner sheet: start/go to tonight, roster, tournament, log out |
| `src/components/ui.jsx`, `Ball.jsx` | Design-system primitives (see `features/design-system.md`) |
| `src/lib/teamUtils.js` | Pure team-building: `buildTeams` (random), `buildSnakeDraftTeams` (snake draft), `moveToNextTeam`, `teamsFromAssignment`, `captainName` |
| `src/pages/admin/AdminNewSession.jsx` | Full-screen 2-step flow: who's here (date, teams, attendees, split mode) → teams (random/snake/manual) |
| `src/pages/session/commish.jsx` | Commissioner controls: pending game card, game/add-game/teams/options sheets |
| `src/pages/session/Assistant.jsx` | Docked AI assistant composer + conversation sheet |
| `src/lib/chatClient.js` | `buildChatRequest`, `sendChat` for `/api/chat` |
| `src/pages/session/useCommish.js` | Commissioner actions (one at a time, reload after) |
| `src/lib/gameFlow.js` | `pendingGame`, `sittingOut`, `closeWarning`, `gameMatchup`, `unassignedPlayers` |
| `src/components/Sheet.jsx` | Bottom sheet dialog |
| `src/pages/Session.jsx` | One Session screen: header, teams w/ per-player points, games newest first |
| `src/lib/sessionStats.js` | `computeSessionStats`, `departureLabel` |
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
| `test/standingsSort.test.js` | Standings sort by column/direction + tiebreakers |
| `test/sessionGroups.test.js` | Month grouping, same-date order, year labels |
| `test/sessionStats.test.js` | Per-session points, exclusions, departures, departure labels |
| `test/gameFlow.test.js` | Pending game, sit-outs, close warning, matchup, late-arrival candidates |
| `test/chatClient.test.js` | Chat request context mapping |
| `test/bracketLogic.test.js` | Bracket building, byes, seeding order, advancement slots, final detection |
| `test/bracket.test.js` | Round grouping/labels, champion |
| `test/teamColors.test.js` | Team ball colors: order, wrap, lookup by id |
| `test/teamUtils.test.js` | `buildTeams`, `buildSnakeDraftTeams`, `shuffle`, `captainName`, `moveToNextTeam`, `teamsFromAssignment` |

Run: `node node_modules/vitest/dist/cli.js run` from `app/`  
The `npm run build` script runs tests first — failing tests block Vercel deploys.

---

## E2E tests (Playwright)

Run locally: `npm run e2e` (from `app/`). Starts its own Vite server on :5180 with `VITE_ADMIN_PASSWORD=e2e-commissioner` and fakes `/api/sheets` in the browser with `e2e/support/fakeBackend.js` — an in-memory copy of the sheet tabs that returns the same shapes as `api/_db.js` and scores with the real `api/_standingsLogic.js` / `api/_bracketLogic.js`. **Never touches the league's Google Sheet.** `/api/chat` is faked per test.

| File | Covers |
|------|--------|
| `e2e/scoring.test.js` | Two sessions with early departures → exact standings; tonight's points on team cards |
| `e2e/may11.test.js` | Real May 11 night: 3-team round robin, late arrival + sat-out, same-date second session → standings |
| `e2e/newSession.test.js` | New session: snake draft, random (move, reshuffle), manual, back/cancel |
| `e2e/commissioner.test.js` | Login/menu/logout, admin redirects, roster, undo/change/clear/delete game, session date/close/reopen/delete |
| `e2e/assistant.test.js` | Docked assistant records a result and refreshes; error message |
| `e2e/tournament.test.js` | 4- and 5-player brackets (byes) to a champion, public view, empty state |
| `e2e/public.test.js` | Standings sort/tiebreak/leader, live card + read-only Tonight, tabs, load error |
| `e2e/smoke.prod.test.js` | Read-only production smoke (`npm run e2e:prod`) |

Helpers in `e2e/support/app.js` drive the UI by accessible names (`playGame`, `leftEarly`, `addLateArrival`, `sitOut`, `closeSession`, `readStandings`).
