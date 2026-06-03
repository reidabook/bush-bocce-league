# Feature: Standings

## Overview

Live leaderboard shown on the home page (`/`). Computed on every load from raw game data — nothing is pre-computed for active/completed weeks.

## Display

| Column | Description |
|--------|-------------|
| Rank | Position in sorted standings |
| Name | Player name |
| PTS | Total points |
| W | Wins |
| GP | Games played |

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
