# Shared — Data Model, Scoring, and UI Patterns

## Scoring rules

| Event | Points |
|-------|--------|
| Playing in a game (team is in the game) | +1 |
| Winning a game | +3 |
| Team DNP (sat out) | 0 |
| Player departed before game's `created_at` | 0 |
| Player has a `game_player_exclusions` record for the game | 0 |

**Win total = 4, Loss total = 1.**

## Standings tiebreaker

Points → win rate (wins / games played) → name (alphabetical).

## Week status lifecycle

`setup` → `active` → `completed`

`historical` is a special status for pre-season weeks with pre-computed stats stored in `historical_player_stats` (not computed live).

## Team count

Sessions support 2, 3, or 4 teams. With 3+ teams, commissioner selects which two teams play each individual game; the remaining team(s) sit out (DNP).

Fixed color names: **Red Team · Blue Team · Green Team · Yellow Team · Purple Team · Orange Team**

## Player departures vs per-game exclusions

| Mechanism | Use case | Scope |
|-----------|----------|-------|
| `player_departures` | Player leaves mid-session | Excludes from all games after `departed_at` |
| `game_player_exclusions` | Player joins late or skips a specific game | Excludes from exactly one game |

Both exclude the player from points for affected games. Both are reversible.

## Auth

Commissioner password stored in `VITE_ADMIN_PASSWORD` env var. Checked client-side in `src/lib/auth.js`; result in `sessionStorage`.

**Entry:** the person icon in the header → `/admin/login` ("Commissioner", password, "Log in"; wrong password: "That password didn't work."). Once logged in, the header shows a **Commissioner** button that opens the commissioner menu: Start a session (or Go to tonight when one is live), Roster, Tournament, Log out. `/admin` opens the same menu. All commissioner controls live inline on the regular screens. No server-side auth — all API endpoints are open (Sheets RLS equivalent not enforced).

## API pattern

All data calls: `POST /api/sheets` with `{ action, ...params }`. Response: `{ result: ... }` or `{ error: ... }`. Client wrapper in `src/lib/db.js`.
