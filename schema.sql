-- Bush League Bocce — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query → paste & run

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Weekly sessions
create table weeks (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null,
  date date not null,
  status text not null default 'setup'
    check (status in ('setup', 'active', 'completed')),
  team_size integer not null default 2,
  created_at timestamptz default now()
);

-- Which players attended each week
create table week_attendees (
  week_id uuid references weeks(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (week_id, player_id)
);

-- Teams for each week
create table teams (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade,
  name text not null default 'Team'
);

-- Team membership
create table team_players (
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (team_id, player_id)
);

-- Individual games within a week
create table games (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade,
  team_a_id uuid references teams(id) on delete cascade,
  team_b_id uuid references teams(id) on delete cascade,
  winner_team_id uuid references teams(id),
  created_at timestamptz default now()
);

-- Tournament (one per season)
create table tournament (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'complete')),
  format text not null default 'single_elimination',
  created_at timestamptz default now()
);

-- Tournament bracket matches
create table tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournament(id) on delete cascade,
  round integer not null,
  position integer not null,
  player_a_id uuid references players(id),
  player_b_id uuid references players(id),
  winner_id uuid references players(id),
  is_bye boolean not null default false
);

-- ── RLS (Row Level Security) ────────────────────────────────────────────────
-- This app uses client-side commissioner auth, so we allow all anon reads
-- and all anon writes. Tighten these if you add real auth later.

alter table players enable row level security;
alter table weeks enable row level security;
alter table week_attendees enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table games enable row level security;
alter table tournament enable row level security;
alter table tournament_matches enable row level security;

-- Allow all operations for anonymous users (adjust if you add Supabase Auth)
create policy "public_all" on players for all using (true) with check (true);
create policy "public_all" on weeks for all using (true) with check (true);
create policy "public_all" on week_attendees for all using (true) with check (true);
create policy "public_all" on teams for all using (true) with check (true);
create policy "public_all" on team_players for all using (true) with check (true);
create policy "public_all" on games for all using (true) with check (true);
create policy "public_all" on tournament for all using (true) with check (true);
create policy "public_all" on tournament_matches for all using (true) with check (true);
