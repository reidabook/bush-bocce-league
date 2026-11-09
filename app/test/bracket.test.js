import { describe, it, expect } from 'vitest'
import { groupByRound, roundLabel, champion } from '../src/lib/bracket.js'

describe('roundLabel', () => {
  it('names the last two rounds', () => {
    expect([1, 2, 3].map((r) => roundLabel(r, 3))).toEqual(['Round 1', 'Semifinal', 'Final'])
    expect([1, 2].map((r) => roundLabel(r, 2))).toEqual(['Round 1', 'Final'])
    expect(roundLabel(1, 1)).toBe('Round 1')
  })
})

describe('groupByRound', () => {
  it('sorts rounds and positions', () => {
    const g = groupByRound([{ id: 'c', round: 2, position: 0 }, { id: 'b', round: 1, position: 1 }, { id: 'a', round: 1, position: 0 }])
    expect(g.map((r) => r.round)).toEqual([1, 2])
    expect(g[0].matches.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('champion', () => {
  it('is the final winner, or null', () => {
    expect(champion([{ round: 1, position: 0, winner: { name: 'Al' } }, { round: 2, position: 0, winner: { name: 'Bo' } }])).toEqual({ name: 'Bo' })
    expect(champion([{ round: 1, position: 0, winner: null }])).toBeNull()
    expect(champion([])).toBeNull()
  })
})
