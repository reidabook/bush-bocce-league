# Feature: Tournament

## Overview

End-of-season single-elimination bracket seeded by regular-season standings. Commissioner triggers it after all regular weeks are closed.

## Flow

1. Commissioner opens the commissioner menu → Tournament (`/admin/tournament`), reviews the seed list, and taps **Seed & start tournament** (confirm).
2. App seeds players by standings (highest points = top seed). Tiebreaker same as standings.
3. Bracket is generated: first round matches pair seed 1 vs last seed, seed 2 vs second-to-last, etc. Odd player count gets a bye.
4. Commissioner taps the winner's name on each match — winner advances automatically. **Clear** undoes a result.
5. Commissioner taps **Mark tournament complete** when the final is done.

## Public view (`/tournament`)

Read-only: rounds as sections (Round N / Semifinal / Final), each match "A vs B" with the winner bold and loser muted, byes noted. Champion card (pallino + name) once the final has a winner. Not linked from the tab bar (hidden by choice); reachable by URL and from the commissioner menu. Helpers: `src/lib/bracket.js`.

## Data

| Table | What |
|-------|------|
| `tournament` | One row: status (pending / active / complete), format |
| `tournament_matches` | One row per match: round, position, player_a_id, player_b_id, winner_id, is_bye |

## Notes

- Only one tournament per season (one row in `tournament` table).
- Byes: `is_bye = true`, one player set, no opponent — winner advances automatically.
- Format is always `single_elimination` (v1).
