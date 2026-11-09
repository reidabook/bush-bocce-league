import { describe, it, expect } from 'vitest'
import { computeSessionStats, departureLabel } from '../src/lib/sessionStats.js'

const teams = [
  { id: 'A', players: [{ id: 'a1', name: 'Al' }, { id: 'a2', name: 'Amy' }] },
  { id: 'B', players: [{ id: 'b1', name: 'Bo' }] },
  { id: 'C', players: [{ id: 'c1', name: 'Cy' }] },
]
const g = (id, a, b, w, min) => ({ id, team_a_id: a, team_b_id: b, winner_team_id: w, created_at: new Date(Date.UTC(2026, 5, 2, 23, min)).toISOString() })

describe('computeSessionStats', () => {
  it('scores win 4, loss 1, DNP 0', () => {
    const s = computeSessionStats(teams, [g('g1', 'A', 'B', 'A', 0)], [], [])
    expect(s.a1).toMatchObject({ points: 4, wins: 1, gamesPlayed: 1 })
    expect(s.b1).toMatchObject({ points: 1, wins: 0, gamesPlayed: 1 })
    expect(s.c1).toMatchObject({ points: 0, gamesPlayed: 0 })
  })
  it('ignores pending games', () => {
    const s = computeSessionStats(teams, [g('g1', 'A', 'B', null, 0)], [], [])
    expect(s.a1.points).toBe(0)
  })
  it('skips per-game exclusions', () => {
    const s = computeSessionStats(teams, [g('g1', 'A', 'B', 'A', 0)], [], [{ game_id: 'g1', player_id: 'a2' }])
    expect(s.a2.points).toBe(0)
    expect(s.a1.points).toBe(4)
  })
  it('skips games after a departure', () => {
    const games = [g('g1', 'A', 'B', 'A', 0), g('g2', 'A', 'C', 'A', 30)]
    const dep = [{ player_id: 'a2', departed_at: new Date(Date.UTC(2026, 5, 2, 23, 15)).toISOString() }]
    const s = computeSessionStats(teams, games, dep, [])
    expect(s.a2.points).toBe(4)
    expect(s.a1.points).toBe(8)
  })
})

describe('departureLabel', () => {
  const games = [g('g1', 'A', 'B', 'A', 0), g('g2', 'A', 'C', 'A', 30)]
  it('counts games created before departure', () => {
    expect(departureLabel(new Date(Date.UTC(2026, 5, 2, 23, 15)).toISOString(), games)).toBe('left after Game 1')
  })
  it('handles leaving before any games', () => {
    expect(departureLabel(new Date(Date.UTC(2026, 5, 2, 22, 0)).toISOString(), games)).toBe('left before any games')
  })
})
