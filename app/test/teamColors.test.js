import { describe, it, expect } from 'vitest'
import { teamColor, teamColorById, shortTeamName, BALL_COLORS, FALLBACK_COLOR } from '../src/lib/teamColors.js'

describe('teamColor', () => {
  it('maps order to ball colors: red, green, blue, yellow', () => {
    expect([0, 1, 2, 3].map(teamColor)).toEqual(['#C8372D', '#2E8B57', '#2D6CDF', '#E3B23C'])
  })
  it('wraps past the palette', () => {
    expect(teamColor(BALL_COLORS.length)).toBe(teamColor(0))
  })
  it('falls back for bad input', () => {
    expect(teamColor(-1)).toBe(FALLBACK_COLOR)
    expect(teamColor(undefined)).toBe(FALLBACK_COLOR)
  })
})

describe('teamColorById', () => {
  const teams = [{ id: 'a', name: "Colin's Team" }, { id: 'b', name: "Maya's Team" }, { id: 'c', name: "Reid's Team" }]
  it('uses the team position by name', () => {
    expect(teamColorById(teams, 'c')).toBe('#2D6CDF')
  })
  it('is independent of input order', () => {
    expect(teamColorById([...teams].reverse(), 'a')).toBe('#C8372D')
  })
  it('falls back for unknown id or missing teams', () => {
    expect(teamColorById(teams, 'zzz')).toBe(FALLBACK_COLOR)
    expect(teamColorById(null, 'a')).toBe(FALLBACK_COLOR)
  })
})

describe('shortTeamName', () => {
  it('drops trailing "Team"', () => {
    expect(shortTeamName("Reid's Team")).toBe("Reid's")
    expect(shortTeamName("Reid's team")).toBe("Reid's")
    expect(shortTeamName('Red')).toBe('Red')
  })
})
