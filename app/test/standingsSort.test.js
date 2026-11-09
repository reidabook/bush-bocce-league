import { describe, it, expect } from 'vitest'
import { sortStandings, nextSort, fmtWinPct } from '../src/lib/standingsSort.js'

const rows = [
  { name: 'Ann', points: 10, wins: 2, gamesPlayed: 4 },  // .500
  { name: 'Bo', points: 13, wins: 3, gamesPlayed: 4 },   // .750
  { name: 'Cy', points: 10, wins: 2, gamesPlayed: 4 },   // tie with Ann
  { name: 'Di', points: 3, wins: 0, gamesPlayed: 3 },
  { name: 'Ed', points: 0, wins: 0, gamesPlayed: 0 },    // no games
]
const names = (r) => r.map((x) => x.name)

describe('sortStandings', () => {
  it('points desc by default, ties by name', () => {
    expect(names(sortStandings(rows))).toEqual(['Bo', 'Ann', 'Cy', 'Di', 'Ed'])
  })
  it('points asc', () => {
    expect(names(sortStandings(rows, 'pts', 'asc'))).toEqual(['Ed', 'Di', 'Ann', 'Cy', 'Bo'])
  })
  it('wins desc', () => {
    expect(names(sortStandings(rows, 'w'))[0]).toBe('Bo')
  })
  it('games desc', () => {
    expect(names(sortStandings(rows, 'gp')).slice(-1)).toEqual(['Ed'])
  })
  it('win % treats 0 games as 0', () => {
    expect(names(sortStandings(rows, 'pct'))).toEqual(['Bo', 'Ann', 'Cy', 'Di', 'Ed'])
    expect(names(sortStandings(rows, 'pct', 'asc')).slice(0, 2)).toEqual(['Di', 'Ed'])
  })
  it('does not mutate input', () => {
    const copy = [...rows]
    sortStandings(rows, 'w')
    expect(rows).toEqual(copy)
  })
})

describe('nextSort', () => {
  it('toggles direction on same column, resets to desc on new column', () => {
    expect(nextSort({ col: 'pts', dir: 'desc' }, 'pts')).toEqual({ col: 'pts', dir: 'asc' })
    expect(nextSort({ col: 'pts', dir: 'asc' }, 'w')).toEqual({ col: 'w', dir: 'desc' })
  })
})

describe('fmtWinPct (re-export)', () => {
  it('formats', () => expect(fmtWinPct(1, 2)).toBe('.500'))
})
