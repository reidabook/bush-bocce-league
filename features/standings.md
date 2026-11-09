# Feature: Standings

## Overview

Live leaderboard shown on the home page (`/`). Computed on every load from raw game data — nothing is pre-computed for active/completed weeks.

## Display

- **Live card** (only while a session is active): "Live now", "Tonight · Session N", the teams' balls, date. Tap → `/tonight`.
- **Title** "Standings" + player count.
- **Sort chips:** Points · Wins · Games · Win %. Tap a chip to sort by it (descending); tap the active chip again to flip to ascending (shown with ↑). Ties always fall back to points → win rate → name. Logic: `src/lib/standingsSort.js`.
- **Rows:** rank, name, sub-line, and the sorted stat as a big number with a small label (PTS / WINS / GAMES / WIN %). Sub-line shows W · games · W% when sorting by points, otherwise pts · W · games. W% formatted `.750`, `—` with no games.
- **Leader:** the #1 row in the default sort gets a pallino mark.
- **Loading:** skeleton rows. **Empty:** "No games yet — standings start after the first session closes." **Error:** shared `ErrorState` (retry, sheet-tab setup, link to `/api/debug`).

## Computation (`getStandings` in `api/_db.js`)

1. Load all active players, all completed weeks, all games with a winner in those weeks.
2. For each completed game, credit all players on both teams with +1 (play point) and winners with +3 (win points), **excluding** players who:
   - Had a `player_departures` record for that week with `departed_at` before the game's `created_at`
   - Have a `game_player_exclusions` record for that specific game
3. Add pre-computed stats from `historical_player_stats` for any `historical`-status weeks.

## Tiebreaker

Points → win rate (wins ÷ games played, 0 if no games) → name alphabetical.

## Historical weeks

Weeks marked `historical` use pre-computed values from `historical_player_stats` instead of live calculation. Used to archive past seasons or pre-enter historical data without storing all individual game rows.
