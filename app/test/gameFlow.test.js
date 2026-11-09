import { describe, it, expect } from 'vitest'
import { pendingGame, pendingCount, sittingOut, closeWarning, gameMatchup, unassignedPlayers } from '../src/lib/gameFlow.js'

const g = (id, a, b, w, min) => ({ id, team_a_id: a, team_b_id: b, winner_team_id: w, created_at: new Date(Date.UTC(2026, 5, 2, 23, min)).toISOString() })
const teams = [{ id: 'A', players: [{ id: 'p1' }] }, { id: 'B', players: [{ id: 'p2' }] }, { id: 'C', players: [] }]

describe('pendingGame', () => {
  it('returns the newest game without a result', () => {
    expect(pendingGame([g('1', 'A', 'B', null, 0), g('2', 'A', 'C', null, 10), g('3', 'B', 'C', 'B', 20)]).id).toBe('2')
  })
  it('null when all decided', () => {
    expect(pendingGame([g('1', 'A', 'B', 'A', 0)])).toBeNull()
    expect(pendingGame([])).toBeNull()
  })
})

describe('sittingOut', () => {
  it('lists teams not in the game', () => {
    expect(sittingOut(teams, g('1', 'A', 'B', null, 0)).map((t) => t.id)).toEqual(['C'])
    expect(sittingOut(teams, null)).toEqual([])
  })
})

describe('closeWarning', () => {
  it('warns with count and grammar', () => {
    expect(closeWarning([g('1', 'A', 'B', 'A', 0)])).toBeNull()
    expect(closeWarning([g('1', 'A', 'B', null, 0)])).toBe('1 game still has no result. Close the session anyway?')
    expect(pendingCount([g('1', 'A', 'B', null, 0), g('2', 'A', 'B', null, 1)])).toBe(2)
    expect(closeWarning([g('1', 'A', 'B', null, 0), g('2', 'A', 'B', null, 1)])).toMatch(/^2 games still have/)
  })
})

describe('gameMatchup', () => {
  it('auto with two teams', () => {
    expect(gameMatchup(teams.slice(0, 2))).toEqual(['A', 'B'])
  })
  it('needs exactly two picks with 3+ teams', () => {
    expect(gameMatchup(teams, ['A'])).toBeNull()
    expect(gameMatchup(teams, ['A', 'C'])).toEqual(['A', 'C'])
  })
})

describe('unassignedPlayers', () => {
  it('excludes players already on a team', () => {
    expect(unassignedPlayers([{ id: 'p1' }, { id: 'p3' }], teams)).toEqual([{ id: 'p3' }])
  })
})
