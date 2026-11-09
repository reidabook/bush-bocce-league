// Team identity = bocce-ball color by the team's position when the session's
// teams are sorted by name (same order the API returns). No data stored.

export const BALL_COLORS = [
  { name: 'red', hex: '#C8372D' },
  { name: 'green', hex: '#2E8B57' },
  { name: 'blue', hex: '#2D6CDF' },
  { name: 'yellow', hex: '#E3B23C' },
  { name: 'purple', hex: '#7B4FD0' },
  { name: 'orange', hex: '#E07B2E' },
]

export const FALLBACK_COLOR = '#52627F'

export function teamColor(index) {
  if (!Number.isInteger(index) || index < 0) return FALLBACK_COLOR
  return BALL_COLORS[index % BALL_COLORS.length].hex
}

export function sortTeams(teams) {
  return [...(teams || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export function teamColorById(teams, teamId) {
  const i = sortTeams(teams).findIndex((t) => t.id === teamId)
  return i === -1 ? FALLBACK_COLOR : teamColor(i)
}

// "Reid's Team" → "Reid's" for tight spaces.
export function shortTeamName(name = '') {
  return name.replace(/\s+team$/i, '')
}
