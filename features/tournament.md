# Feature: Tournament

## Overview

End-of-season single-elimination bracket seeded by regular-season standings. Commissioner triggers it after all regular weeks are closed.

## Flow

1. Commissioner opens the commissioner menu → Tournament (`/admin/tournament`), reviews the seed list, and taps **Seed & start tournament** (confirm).
2. App seeds players by standings (highest points = top seed). Tiebreaker same as standings.
3. Bracket is generated with every round laid out up front (`api/_bracketLogic.js`). Size rounds up to a power of two; standard seeding (1v8, 4v5, 2v7, 3v6…) so top seeds meet late. Missing spots become **byes for the top seeds**, who are placed straight into round 2.
4. Commissioner taps the winner's name on each match — winner moves into a fixed slot of the next match (odd position → first slot, even → second). Matches waiting on earlier games show "waiting on earlier games" with no buttons. Recording the final doesn't create another round. **Clear** undoes a result and removes that player from the next match.
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
- Byes: `is_bye = true`, one player set, no opponent, `winner_id` set and already placed in round 2.
- Brackets created before this change (rounds added on demand) still advance correctly.
- Format is always `single_elimination` (v1).
