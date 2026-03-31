# Bocce League App — Product Spec

> **Status: Built and deployed.** This document reflects the final decisions made during implementation. Live at https://bush-league-bocce.vercel.app

## Overview

A lightweight web app for managing a neighborhood bocce league. Tracks weekly game
results, accumulates player points across the season, and seeds an end-of-season
tournament. Shareable via link — no app store install required.

**League facts:**
- Up to 14 players on the roster; attendance varies week to week
- ~2–3 regular season sessions before the tournament
- Teams are randomly assigned each session from that night's attendees
- Scoring: win/loss only (no bocce scores recorded)
- Tournament format: single elimination

---

## Platform Decision

**Progressive Web App (PWA)** deployed to a hosting service (Vercel, Netlify, or
Cloudflare Pages).

- Anyone with the link opens it in their phone browser
- Players can "Add to Home Screen" for an app-like experience
- No App Store approval or TestFlight needed
- Free hosting tiers are sufficient for a small league

---

## Roles

| Role | Description |
|------|-------------|
| **Commissioner** | One person (you). Can manage players, create weeks, record results, and trigger the tournament. Password-protected. |
| **Player / Viewer** | Anyone with the link. Can view standings, schedules, and results. Read-only. |

No player accounts required — the commissioner manages all data entry.

---

## Core Features

### 1. Player Roster
- Add/remove players (name only, no login required)
- Each player has a running point total across the season

### 2. Weekly Session Management
- Commissioner creates a new "Week" and picks a date
- **Attendance step:** commissioner checks off which players are present (from the 14-person roster)
- App randomly assigns present players into teams (configurable team size, e.g., 2v2 or 3v3)
- If players don't divide evenly, commissioner adjusts manually before locking teams
- Each week has a variable number of games (commissioner adds them as they're played)

### 3. Score Recording
- For each game, commissioner selects the winning team from the two teams that played
- All players on the winning team earn 1 point
- Losing team earns 0 points
- Players who didn't attend earn 0 points (not penalized, just absent)

### 4. Season Standings
- Live leaderboard: Rank | Name | Points | Wins | Games Played | Sessions Attended
- Sorted by points; tiebreaker is win rate, then name
- Note: with only 2–3 sessions, point spreads will be tight — tiebreakers matter for tournament seeding

### 5. End-of-Season Tournament
- Commissioner triggers tournament seeding when regular season ends
- Players are seeded by total points (highest = top seed)
- Format TBD — app should support at minimum single elimination; design data model to accommodate others
- Commissioner records each match result; winner advances
- Winner is crowned league champion
- Players who can't attend the tournament night can be marked as a forfeit/bye

### 6. History View
- Per-week summary: teams, game results, points earned
- Per-player history: week-by-week breakdown of their points

---

## Data Model

```
League
  name: string
  season: string              // e.g. "Summer 2026"
  pointsPerWin: number        // default 1

Player
  id: uuid
  name: string
  active: boolean

Week
  id: uuid
  weekNumber: number
  date: date
  status: "setup" | "active" | "completed"
  attendeeIds: uuid[]         // subset of Player roster present that night
  teamSize: number            // 2 or 3; chosen at setup

Team  (belongs to a Week)
  id: uuid
  weekId: uuid
  playerIds: uuid[]           // must be a subset of week.attendeeIds

Game  (belongs to a Week)
  id: uuid
  weekId: uuid
  teamAId: uuid
  teamBId: uuid
  winnerTeamId: uuid | null   // null = not yet recorded

Tournament
  status: "pending" | "active" | "complete"
  format: "single_elimination" | tbd
  bracket: Match[]

Match
  id: uuid
  round: number
  seed: number                // bracket position
  playerAId: uuid | null
  playerBId: uuid | null
  winnerId: uuid | null
  bye: boolean                // true if player advances without opponent
```

**Derived / computed values** (not stored, calculated on read):
- `player.totalPoints` = sum of wins across all Games in completed Weeks
- `player.gamesPlayed` = count of Games where player was on either team
- `player.sessionsAttended` = count of Weeks where player is in attendeeIds

---

## Screens

### Home / Standings
- League name + season
- Leaderboard table: Rank | Name | Points | Wins | GP | Sessions
- "Tonight's Teams" card if a week is active
- Link to Tournament (greyed out until Commissioner activates)

### Weekly Schedule
- List of all weeks with dates
- Tap a week to see teams + game results for that week

### Week Detail
- Teams displayed as cards with player names
- Game results listed below
- Points earned by each player that week

### Commissioner Panel (password-gated)
- **Roster**: add / remove players from the 14-person master list
- **New Week** (3-step flow):
  1. Pick date + team size (2v2 or 3v3)
  2. Check off tonight's attendees from the roster
  3. Generate random teams → review → lock or re-shuffle
- **Record Game**: for the active week, tap "Add Game Result" → select Team A vs Team B → select winner
- **Close Week**: locks the week; points are finalized and added to standings
- **Start Tournament**: available after all weeks are closed; seeds bracket from standings

### Tournament Bracket
- Visual single-elimination bracket
- Current match highlighted
- Commissioner records result; winner advances

### Player Profile
- Name, total points, season rank
- Week-by-week history table

---

## Scoring Rules

| Parameter | Value | Notes |
|-----------|-------|-------|
| Points for playing | +1 | All players on both teams |
| Points for winning | +3 | Players on the winning team only |
| Total for a win | 4 | |
| Total for a loss | 1 | |
| Points for not attending | 0 | Absent players simply have fewer games |
| Tiebreaker (standings) | Win rate → sessions attended → name | Applied at tournament seeding |
| Number of teams | 3, 5, or 7 (must be odd) | One team sits out each game; commissioner picks per session |
| Max players per team | 7 | Players rotate who throws each game |

**Random team assignment:**
- Pool = tonight's attendees only
- Commissioner picks number of teams (3, 5, or 7 — must be odd)
- Players are distributed round-robin across color-named teams (Red, Green, Blue, Yellow, Orange, Purple, Black)
- Commissioner can re-shuffle before locking teams

**Early departure:**
- If a player leaves mid-session, the commissioner logs their departure time
- Games played after their departure do not count toward their stats (no points, no win credit)
- Implemented via a `player_departures` table; scoring compares game `created_at` vs `departed_at`

**Example with 9 players, 3 teams:**
- 3 teams of 3 → one team sits out each game
- Teams rotate throughout the session

---

## Tech Stack Recommendation

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite | Fast, lightweight, easy PWA setup |
| Styling | Tailwind CSS | Rapid UI, mobile-first |
| State / storage | Zustand + localStorage | No backend needed for a small league |
| Optional backend | Supabase (free tier) | If you want data to sync across devices |
| Hosting | Vercel (free) | Deploy from GitHub, instant HTTPS link |
| PWA | vite-plugin-pwa | Adds manifest + service worker automatically |

**Storage recommendation:** Start with Supabase (free tier, Postgres). This ensures all
league members see live data when they open the link — localStorage alone would silo data
on the commissioner's device.

---

## Sharing Model

1. Commissioner deploys app to Vercel → gets a URL like `bocce-league.vercel.app`
2. Share that URL in the neighborhood group chat
3. Players open on any device — no install, no account
4. Commissioner bookmarks the URL and uses it to manage all data entry
5. Optional: set a custom domain (e.g., `ourbocce.club`) for ~$10/year

---

## Out of Scope (v1)

- Player self-reporting scores
- Push notifications
- Multiple leagues / multi-season history
- Handicap system
- Mobile app (native iOS/Android)
- Photo uploads or social features

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Tournament format | Single elimination, seeded by standings |
| Team structure | Odd number of teams (3/5/7), not player-per-team size |
| Team names | Color names: Red, Green, Blue, Yellow, Orange, Purple, Black |
| Game logging | Commissioner adds games as they're played; results recorded immediately |
| Player departures | Logged by commissioner; departure time used to exclude player from subsequent games |
| AI agent | Gemini 2.5 Flash with function calling — logs games/results/departures conversationally |

## Out of Scope (v1)

- Player self-reporting scores
- Push notifications
- Multiple leagues / multi-season history
- Handicap system
- Native mobile app (iOS/Android)
- Photo uploads or social features
