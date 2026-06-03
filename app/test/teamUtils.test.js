import { describe, it, expect } from 'vitest'
import { shuffle, buildTeams, buildSnakeDraftTeams } from '../src/lib/teamUtils.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player${i + 1}` }))
}

// ─── shuffle ──────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr)).toHaveLength(5)
  })

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr).sort()).toEqual([...arr].sort())
  })

  it('does not mutate the original', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffle(arr)
    expect(arr).toEqual(copy)
  })

  it('produces different orderings across runs (probabilistic)', () => {
    const arr = makePlayers(10)
    const results = new Set()
    for (let i = 0; i < 20; i++) {
      results.add(shuffle(arr).map((p) => p.id).join(','))
    }
    // With 10 players, 20 runs should almost certainly produce >1 unique ordering
    expect(results.size).toBeGreaterThan(1)
  })
})

// ─── buildTeams ───────────────────────────────────────────────────────────────

describe('buildTeams (random)', () => {
  it('creates the correct number of teams', () => {
    expect(buildTeams(makePlayers(6), 2)).toHaveLength(2)
    expect(buildTeams(makePlayers(9), 3)).toHaveLength(3)
    expect(buildTeams(makePlayers(8), 4)).toHaveLength(4)
  })

  it('assigns every player to exactly one team', () => {
    const players = makePlayers(7)
    const teams = buildTeams(players, 2)
    const assigned = teams.flatMap((t) => t.players.map((p) => p.id))
    expect(assigned.sort()).toEqual(players.map((p) => p.id).sort())
  })

  it('distributes players as evenly as possible', () => {
    const players = makePlayers(7) // 7 players, 2 teams → [4, 3] or [3, 4]
    const teams = buildTeams(players, 2)
    const sizes = teams.map((t) => t.players.length).sort()
    expect(sizes).toEqual([3, 4])
  })

  it('no team is empty when players >= teams', () => {
    const teams = buildTeams(makePlayers(4), 4)
    teams.forEach((t) => expect(t.players.length).toBeGreaterThan(0))
  })

  it('each team has a name', () => {
    const teams = buildTeams(makePlayers(4), 2)
    teams.forEach((t) => expect(typeof t.name).toBe('string'))
    teams.forEach((t) => expect(t.name.length).toBeGreaterThan(0))
  })
})

// ─── buildSnakeDraftTeams ───────────────────────────────────────────────────────

describe('buildSnakeDraftTeams', () => {
  it('creates the correct number of teams', () => {
    const players = makePlayers(6)
    const map = { p1: 100, p2: 80, p3: 60, p4: 40, p5: 20, p6: 0 }
    expect(buildSnakeDraftTeams(players, map, 2)).toHaveLength(2)
    expect(buildSnakeDraftTeams(players, map, 3)).toHaveLength(3)
  })

  it('assigns every player to exactly one team', () => {
    const players = makePlayers(6)
    const map = { p1: 100, p2: 80, p3: 60, p4: 40, p5: 20, p6: 0 }
    const teams = buildSnakeDraftTeams(players, map, 2)
    const assigned = teams.flatMap((t) => t.players.map((p) => p.id))
    expect(assigned.sort()).toEqual(players.map((p) => p.id).sort())
  })

  it('rank-1 and rank-last end up on same team (2 teams, 4 players)', () => {
    // Snake 4 players over 2 teams:
    // pick 0 → team 0 (rank 1)
    // pick 1 → team 1 (rank 2)
    // pick 2 → team 1 (rank 3, snake)
    // pick 3 → team 0 (rank 4)
    // → team 0 = [rank1, rank4], team 1 = [rank2, rank3]
    const players = [
      { id: 'p1', name: 'Alpha' },
      { id: 'p2', name: 'Beta' },
      { id: 'p3', name: 'Gamma' },
      { id: 'p4', name: 'Delta' },
    ]
    const map = { p1: 100, p2: 75, p3: 50, p4: 10 }
    const teams = buildSnakeDraftTeams(players, map, 2)
    const team0Ids = teams[0].players.map((p) => p.id).sort()
    const team1Ids = teams[1].players.map((p) => p.id).sort()
    // rank1 (p1) and rank4 (p4) should be on the same team
    const sameTeam = (team0Ids.includes('p1') && team0Ids.includes('p4')) ||
                     (team1Ids.includes('p1') && team1Ids.includes('p4'))
    expect(sameTeam).toBe(true)
  })

  it('players with no standing go last in draft order', () => {
    // p_new has no entry in standingsMap — should be drafted last
    const players = [
      { id: 'p1', name: 'Alpha' },
      { id: 'p2', name: 'Beta' },
      { id: 'p_new', name: 'Newbie' },
    ]
    const map = { p1: 100, p2: 50 } // p_new absent
    const teams = buildSnakeDraftTeams(players, map, 3)
    // 3 players, 3 teams: each gets one player
    // Snake: pick0→T0(p1), pick1→T1(p2), pick2→T2(p_new)
    const newbieTeam = teams.find((t) => t.players.some((p) => p.id === 'p_new'))
    const rank1Team  = teams.find((t) => t.players.some((p) => p.id === 'p1'))
    // p_new should not be on rank-1's team (they were drafted last, goes to team 2)
    expect(newbieTeam).not.toBe(rank1Team)
  })

  it('correct snake draft for 3 teams, 6 players', () => {
    // Expected picks: T0, T1, T2, T2, T1, T0
    const players = [
      { id: 'r1', name: 'R1' }, // rank 1 → T0
      { id: 'r2', name: 'R2' }, // rank 2 → T1
      { id: 'r3', name: 'R3' }, // rank 3 → T2
      { id: 'r4', name: 'R4' }, // rank 4 → T2
      { id: 'r5', name: 'R5' }, // rank 5 → T1
      { id: 'r6', name: 'R6' }, // rank 6 → T0
    ]
    const map = { r1: 100, r2: 80, r3: 60, r4: 40, r5: 20, r6: 0 }
    const teams = buildSnakeDraftTeams(players, map, 3)
    const ids = (t) => t.players.map((p) => p.id).sort()
    expect(ids(teams[0]).sort()).toEqual(['r1', 'r6'].sort())
    expect(ids(teams[1]).sort()).toEqual(['r2', 'r5'].sort())
    expect(ids(teams[2]).sort()).toEqual(['r3', 'r4'].sort())
  })

  it('each team has a name', () => {
    const players = makePlayers(4)
    const map = { p1: 10, p2: 8, p3: 5, p4: 2 }
    const teams = buildSnakeDraftTeams(players, map, 2)
    teams.forEach((t) => expect(t.name.length).toBeGreaterThan(0))
  })
})
