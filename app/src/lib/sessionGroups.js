const parse = (d) => new Date(d + 'T12:00:00')

// Newest first, grouped by month. Year is shown only when it differs from the newest session's year.
export function groupSessionsByMonth(sessions) {
  const sorted = [...sessions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.session_number - a.session_number)
  if (!sorted.length) return []
  const newestYear = parse(sorted[0].date).getFullYear()
  const groups = []
  for (const s of sorted) {
    const d = parse(s.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      const month = d.toLocaleDateString('en-US', { month: 'long' })
      g = { key, label: d.getFullYear() === newestYear ? month : `${month} ${d.getFullYear()}`, sessions: [] }
      groups.push(g)
    }
    g.sessions.push(s)
  }
  return groups
}

export const STATUS_TEXT = {
  active: 'Live',
  setup: 'Setting up',
  completed: 'Final',
  historical: 'Archived stats',
}

export function dayParts(date) {
  const d = parse(date)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
  }
}
