# Bush League Bocce

A lightweight web app for managing a neighborhood bocce league. Tracks weekly game results, accumulates player points across the season, and seeds an end-of-season single-elimination tournament.

**Live:** https://bush-league-bocce.vercel.app

---

## Features

### Public (anyone with the link)
- **Standings** — live leaderboard with points, wins, games played, sessions attended
- **Active Session** — live view of tonight's teams, per-player session points, and game results
- **Weeks** — per-session history: teams, games, results
- **Tournament** — single-elimination bracket, seeded from standings
- **Rules** — scoring system and league vibe

### Commissioner (password-protected admin)
- **Roster** — add/deactivate players
- **New Session** — 3-step flow: set date + number of teams → pick attendance → generate/reshuffle random teams
- **Manage Week** — add games, record results (or clear them), close/reopen the week
- **Active Session** — mark game winners and remove individual players from specific games inline
- **AI Assistant** — conversational agent for logging games and results from your phone
- **Tournament** — seed and run the bracket

---

## Scoring

| Event | Points |
|-------|--------|
| Playing in a game | +1 |
| Winning a game | +3 |
| Total for a win | 4 |
| Total for a loss | 1 |

Tiebreaker order: points → win rate → sessions attended → name (alphabetical)

**Early departure:** if a player leaves mid-session, the commissioner logs their departure via the AI assistant. Games played after that point do not count toward their stats.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa |
| Database | Supabase (Postgres) |
| Auth | Session-based password check (sessionStorage) |
| AI Agent | Google Gemini 2.5 Flash via Vercel serverless function |
| Hosting | Vercel |

---

## Database Schema

Run these in the Supabase SQL Editor to set up the database.

See [`schema.sql`](./schema.sql) for the full schema including RLS policies.

**Migrations applied on top of the initial schema:**
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE player_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES weeks(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  departed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(week_id, player_id)
);

CREATE TABLE game_player_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(game_id, player_id)
);
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google AI (Gemini) API key

### Setup

```bash
cd app
npm install
```

Create `app/.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=your-commissioner-password
```

```bash
npm run dev
```

The AI assistant (`/admin/chat`) requires the serverless function and won't work in local dev without additional setup (e.g., `vercel dev`).

---

## Deployment

Deployed via Vercel CLI from the `app/` directory.

### Environment variables (set in Vercel dashboard or CLI)

```bash
npx vercel env add GEMINI_API_KEY        # Google Gemini API key
npx vercel env add VITE_SUPABASE_URL     # Supabase project URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel env add VITE_ADMIN_PASSWORD
```

### Deploy

```bash
cd app
npx vercel --prod
```

---

## AI Assistant

The commissioner can log games and results by typing naturally in the AI chat:

> *"Red beat Blue"* → logs the game + records the winner
> *"log Green vs Yellow"* → adds the game, prompts for result
> *"Sarah left"* → marks her as departed; future games won't count for her
> *"make 3 teams with Reid, John, Sarah, Mike, Emma, Tom, Dave"* → generates teams before games start

**Architecture:** user message → Vercel serverless function (`api/chat.js`) → Gemini 2.5 Flash with 4 declared tools → tool executes against Supabase server-side → Gemini produces a natural language reply → client reloads context if DB was modified.

Tools: `add_game`, `record_result`, `delete_game`, `generate_teams`, `log_player_departure`

---

## Project Structure

```
bocce/
├── README.md
├── schema.sql          # Full Supabase schema + RLS policies
├── spec.md             # Original product spec
└── app/
    ├── api/
    │   └── chat.js     # Vercel serverless function — Gemini agent
    ├── public/
    │   ├── logo-192.png
    │   └── logo-512.png
    └── src/
        ├── lib/
        │   ├── supabase.js
        │   ├── auth.js
        │   └── db.js       # All database queries + scoring logic
        ├── components/
        │   ├── Layout.jsx
        │   └── Spinner.jsx
        └── pages/
            ├── Home.jsx            # Standings
            ├── ActiveSession.jsx   # Live session view + admin game controls
            ├── WeekList.jsx
            ├── WeekDetail.jsx
            ├── Tournament.jsx
            ├── Rules.jsx
            └── admin/
                ├── AdminLogin.jsx
                ├── AdminDashboard.jsx
                ├── AdminRoster.jsx
                ├── AdminNewWeek.jsx
                ├── AdminWeekManage.jsx
                ├── AdminTournament.jsx
                └── AdminChat.jsx   # AI assistant UI
```
