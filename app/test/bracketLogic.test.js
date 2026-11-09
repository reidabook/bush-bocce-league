import { describe, it, expect } from 'vitest'
import { seedOrder, bracketSize, nextSlot, buildBracket, isFinal } from '../api/_bracketLogic.js'

const ids = (n) => Array.from({ length: n }, (_, i) => `s${i + 1}`)
const round = (rows, r) => rows.filter((m) => m.round === String(r))

describe('seedOrder / bracketSize', () => {
  it('keeps top seeds apart', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
  it('rounds up to a power of two', () => {
    expect([2, 3, 4, 5, 8, 9].map(bracketSize)).toEqual([2, 4, 4, 8, 8, 16])
  })
})

describe('nextSlot', () => {
  it('odd positions fill slot A, even fill slot B', () => {
    expect(nextSlot(1, 3)).toEqual({ round: 2, position: 2, slot: 'player_a_id' })
    expect(nextSlot('2', '2')).toEqual({ round: 3, position: 1, slot: 'player_b_id' })
  })
})

describe('buildBracket', () => {
  it('4 players: 1v4, 2v3, empty final', () => {
    const rows = buildBracket(ids(4))
    expect(round(rows, 1).map((m) => [m.player_a_id, m.player_b_id])).toEqual([['s1', 's4'], ['s2', 's3']])
    expect(round(rows, 2)).toHaveLength(1)
    expect(rows.some((m) => m.is_bye === 'true')).toBe(false)
  })
  it('5 players: top 3 seeds get byes and are already in round 2', () => {
    const rows = buildBracket(ids(5))
    const byes = round(rows, 1).filter((m) => m.is_bye === 'true')
    expect(byes.map((m) => m.winner_id).sort()).toEqual(['s1', 's2', 's3'])
    const r2 = round(rows, 2).flatMap((m) => [m.player_a_id, m.player_b_id]).filter(Boolean)
    expect(r2.sort()).toEqual(['s1', 's2', 's3'])
    expect(round(rows, 3)).toHaveLength(1)
  })
  it('3 players: seed 1 bye straight to the final', () => {
    const rows = buildBracket(ids(3))
    expect(round(rows, 2)[0].player_a_id).toBe('s1')
  })
  it('2 players: a single final, no byes', () => {
    const rows = buildBracket(ids(2))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ player_a_id: 's1', player_b_id: 's2', is_bye: 'false' })
  })
  it('rejects fewer than 2 players', () => {
    expect(() => buildBracket(['s1'])).toThrow()
  })
})

describe('isFinal', () => {
  it('only the single last-round match', () => {
    const rows = buildBracket(ids(4))
    expect(isFinal(rows, 1)).toBe(false)
    expect(isFinal(rows, 2)).toBe(true)
  })
})
