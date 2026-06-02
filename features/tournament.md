# Feature: Tournament

## Overview

End-of-season single-elimination bracket seeded by regular-season standings. Commissioner triggers it after all regular weeks are closed.

## Flow

1. Commissioner navigates to `/admin/tournament` and clicks "Start Tournament".
2. App seeds players by standings (highest points = top seed). Tiebreaker same as standings.
3. Bracket is generated: first round matches pair seed 1 vs last seed, seed 2 vs second-to-last, etc. Odd player count gets a bye.
4. Commissioner records each match result — winner advances automatically.
5. Commissioner clicks "Complete Tournament" when the final is done.

## Public view (`/tournament`)

Read-only bracket showing all rounds, current match highlighted, champion displayed when complete.

## Data

| Table | What |
|-------|------|
| `tournament` | One row: status (pending / active / complete), format |
| `tournament_matches` | One row per match: round, position, player_a_id, player_b_id, winner_id, is_bye |

## Notes

- Only one tournament per season (one row in `tournament` table).
- Byes: `is_bye = true`, one player set, no opponent — winner advances automatically.
- Format is always `single_elimination` (v1).
