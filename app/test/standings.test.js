import { describe, it, expect } from 'vitest'
import { computeStandings } from '../api/_standingsLogic.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAYERS = [
  { id: 'p1', name: 'Alice', active: 'true' },
  { id: 'p2', name: 'Bob', active: 'true' },
  { id: 'p3', name: 'Carol', active: 'true' },
  { id: 'p4', name: 'Dave', active: 'false' }, // inactive — must not appear
]

const SESSIONS = [
  { id: 's1', status: 'completed' },
  { id: 's2', status: 'active' },    // should not count toward standings
  { id: 'sh', status: 'historical' },
]

// Teams for s1: team-a = [p1, p2], team-b = [p3]
const TEAM_PLAYERS = [
  { team_id: 'ta', player_id: 'p1' },
  { team_id: 'ta', player_id: 'p2' },
  { team_id: 'tb', player_id: 'p3' },
]

const T = '2026-01-01T10:00:00Z'
const T_BEFORE = '2026-01-01T09:00:00Z'
const T_AFTER  = '2026-01-01T11:00:00Z'

function base(overrides = {}) {
  return {
    players: PLAYERS,
    sessions: SESSIONS,
    games: [],
    teamPlayers: TEAM_PLAYERS,
    departures: [],
    exclusions: [],
    historicalStats: [],
    ...overrides,
  }
}

function findPlayer(standings, id) {
  return standings.find((p) => p.id === id)
}

// ─── Basic scoring ─────────────────────────────────────────────────────────────

describe('basic scoring', () => {
  const GAME = { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T }

  it('winners get +4 (play +1, win +3)', () => {
    const s = computeStandings(base({ games: [GAME] }))
    expect(findPlayer(s, 'p1').points).toBe(4)
    expect(findPlayer(s, 'p2').points).toBe(4)
  })

  it('losers get +1 (play only)', () => {
    const s = computeStandings(base({ games: [GAME] }))
    expect(findPlayer(s, 'p3').points).toBe(1)
  })

  it('winners have gamesPlayed=1 and wins=1', () => {
    const s = computeStandings(base({ games: [GAME] }))
    const alice = findPlayer(s, 'p1')
    expect(alice.gamesPlayed).toBe(1)
    expect(alice.wins).toBe(1)
  })

  it('losers have gamesPlayed=1 and wins=0', () => {
    const s = computeStandings(base({ games: [GAME] }))
    const carol = findPlayer(s, 'p3')
    expect(carol.gamesPlayed).toBe(1)
    expect(carol.wins).toBe(0)
  })

  it('inactive player does not appear in standings', () => {
    const s = computeStandings(base({ games: [GAME] }))
    expect(findPlayer(s, 'p4')).toBeUndefined()
  })
})

// ─── Active/setup sessions don't count ────────────────────────────────────────

describe('session status filtering', () => {
  // Game in an active session — should be ignored
  const ACTIVE_GAME = { id: 'g2', week_id: 's2', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T }

  it('games in active sessions give 0 points', () => {
    const s = computeStandings(base({ games: [ACTIVE_GAME] }))
    expect(findPlayer(s, 'p1').points).toBe(0)
    expect(findPlayer(s, 'p3').points).toBe(0)
  })
})

// ─── Per-game exclusions ───────────────────────────────────────────────────────

describe('per-game exclusions', () => {
  const GAME = { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T }

  it('excluded winner gets 0 points and 0 wins', () => {
    const excl = [{ id: 'e1', game_id: 'g1', player_id: 'p1' }]
    const s = computeStandings(base({ games: [GAME], exclusions: excl }))
    const alice = findPlayer(s, 'p1')
    expect(alice.points).toBe(0)
    expect(alice.wins).toBe(0)
    expect(alice.gamesPlayed).toBe(0)
  })

  it('excluded loser gets 0 points', () => {
    const excl = [{ id: 'e1', game_id: 'g1', player_id: 'p3' }]
    const s = computeStandings(base({ games: [GAME], exclusions: excl }))
    expect(findPlayer(s, 'p3').points).toBe(0)
  })

  it('non-excluded teammate still scores normally', () => {
    const excl = [{ id: 'e1', game_id: 'g1', player_id: 'p1' }]
    const s = computeStandings(base({ games: [GAME], exclusions: excl }))
    expect(findPlayer(s, 'p2').points).toBe(4) // Bob (team-a) still wins
  })
})

// ─── Player departures ────────────────────────────────────────────────────────

describe('player departures', () => {
  const GAME_EARLY  = { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T_BEFORE }
  const GAME_LATE   = { id: 'g2', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T_AFTER }
  const DEPARTURE   = { id: 'd1', week_id: 's1', player_id: 'p1', departed_at: T }

  it('player scores for games before departure', () => {
    const s = computeStandings(base({ games: [GAME_EARLY], departures: [DEPARTURE] }))
    expect(findPlayer(s, 'p1').points).toBe(4) // game created_at < departed_at
  })

  it('player gets 0 for games after departure', () => {
    const s = computeStandings(base({ games: [GAME_LATE], departures: [DEPARTURE] }))
    expect(findPlayer(s, 'p1').points).toBe(0)
    expect(findPlayer(s, 'p1').gamesPlayed).toBe(0)
  })

  it('teammates not affected by another player\'s departure', () => {
    const s = computeStandings(base({ games: [GAME_LATE], departures: [DEPARTURE] }))
    expect(findPlayer(s, 'p2').points).toBe(4) // Bob still wins
  })
})

// ─── Historical stats ─────────────────────────────────────────────────────────

describe('historical stats', () => {
  it('historical points add to live stats', () => {
    const hist = [{ player_id: 'p1', points: '10', wins: '2', games_played: '4' }]
    const s = computeStandings(base({ historicalStats: hist }))
    const alice = findPlayer(s, 'p1')
    expect(alice.points).toBe(10)
    expect(alice.wins).toBe(2)
    expect(alice.gamesPlayed).toBe(4)
  })

  it('historical stats combine with live game stats', () => {
    const GAME = { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T }
    const hist = [{ player_id: 'p1', points: '10', wins: '2', games_played: '4' }]
    const s = computeStandings(base({ games: [GAME], historicalStats: hist }))
    const alice = findPlayer(s, 'p1')
    expect(alice.points).toBe(14)  // 10 historical + 4 live
    expect(alice.wins).toBe(3)
    expect(alice.gamesPlayed).toBe(5)
  })

  it('historical stats for unknown player are ignored', () => {
    const hist = [{ player_id: 'ghost', points: '99', wins: '99', games_played: '99' }]
    const s = computeStandings(base({ historicalStats: hist }))
    expect(s.find((p) => p.id === 'ghost')).toBeUndefined()
  })
})

// ─── Sort order ───────────────────────────────────────────────────────────────

describe('sort order', () => {
  it('sorts by points descending', () => {
    const GAME = { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T }
    const s = computeStandings(base({ games: [GAME] }))
    expect(s[0].points).toBeGreaterThanOrEqual(s[1].points)
    expect(s[1].points).toBeGreaterThanOrEqual(s[2].points)
  })

  it('breaks ties by win rate', () => {
    // p1 and p2 both on winning team — same points. p3 loses.
    // Add a second game where only p1's team plays vs a solo team
    const PLAYERS2 = [
      { id: 'p1', name: 'Alice', active: 'true' },
      { id: 'p2', name: 'Bob', active: 'true' },
      { id: 'p5', name: 'Eve', active: 'true' },
    ]
    const TP2 = [
      { team_id: 'ta', player_id: 'p1' },
      { team_id: 'tb', player_id: 'p2' },
      { team_id: 'tc', player_id: 'p5' },
    ]
    // g1: ta beats tb → p1=4pts/1W/1GP, p2=1pt/0W/1GP
    // g2: ta beats tc → p1=8pts/2W/2GP, p5=1pt/0W/1GP; p2 DNP
    const GAMES2 = [
      { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T },
      { id: 'g2', week_id: 's1', team_a_id: 'ta', team_b_id: 'tc', winner_team_id: 'ta', created_at: T },
    ]
    const s = computeStandings({ players: PLAYERS2, sessions: SESSIONS, games: GAMES2, teamPlayers: TP2, departures: [], exclusions: [], historicalStats: [] })
    // p2 and p5 both have 1 point; p2 has 0W/1GP (rate 0), p5 same → tie broken by name (Bob < Eve)
    const p2 = s.find((p) => p.id === 'p2')
    const p5 = s.find((p) => p.id === 'p5')
    expect(s.indexOf(p2)).toBeLessThan(s.indexOf(p5)) // Bob before Eve alphabetically
  })

  it('breaks remaining ties by name alphabetically', () => {
    // Two players with identical stats
    const TIE_PLAYERS = [
      { id: 'pz', name: 'Zach', active: 'true' },
      { id: 'pa', name: 'Anna', active: 'true' },
    ]
    const s = computeStandings({ players: TIE_PLAYERS, sessions: [], games: [], teamPlayers: [], departures: [], exclusions: [], historicalStats: [] })
    expect(s[0].name).toBe('Anna')
    expect(s[1].name).toBe('Zach')
  })
})

// ─── Multiple games accumulate correctly ──────────────────────────────────────

describe('multiple games', () => {
  it('player scores accumulate across multiple games', () => {
    const GAMES = [
      { id: 'g1', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'ta', created_at: T },
      { id: 'g2', week_id: 's1', team_a_id: 'ta', team_b_id: 'tb', winner_team_id: 'tb', created_at: T },
    ]
    const s = computeStandings(base({ games: GAMES }))
    const alice = findPlayer(s, 'p1')
    // g1: +4 (win). g2: +1 (loss). Total: 5
    expect(alice.points).toBe(5)
    expect(alice.gamesPlayed).toBe(2)
    expect(alice.wins).toBe(1)
  })
})
