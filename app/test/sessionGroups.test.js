import { describe, it, expect } from 'vitest'
import { groupSessionsByMonth, dayParts } from '../src/lib/sessionGroups.js'

const s = (id, n, date) => ({ id, session_number: n, date })

describe('groupSessionsByMonth', () => {
  it('groups newest first by month', () => {
    const g = groupSessionsByMonth([s('a', 1, '2026-05-05'), s('b', 2, '2026-06-02'), s('c', 3, '2026-05-26')])
    expect(g.map((x) => x.label)).toEqual(['June', 'May'])
    expect(g[1].sessions.map((x) => x.id)).toEqual(['c', 'a'])
  })
  it('orders same-date sessions by number, highest first', () => {
    const g = groupSessionsByMonth([s('a', 10, '2026-05-11'), s('b', 11, '2026-05-11')])
    expect(g[0].sessions.map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('adds the year for older years', () => {
    const g = groupSessionsByMonth([s('a', 1, '2025-10-07'), s('b', 2, '2026-04-14')])
    expect(g.map((x) => x.label)).toEqual(['April', 'October 2025'])
  })
  it('handles empty input', () => {
    expect(groupSessionsByMonth([])).toEqual([])
  })
})

describe('dayParts', () => {
  it('pads day and gives weekday', () => {
    expect(dayParts('2026-06-02')).toEqual({ day: '02', dow: 'TUE' })
  })
})
