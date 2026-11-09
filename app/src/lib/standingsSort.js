export function fmtWinPct(wins, gamesPlayed) {
  if (gamesPlayed === 0) return '—'
  return (wins / gamesPlayed).toFixed(3).replace(/^0/, '')
}

const winRate = (r) => (r.gamesPlayed ? r.wins / r.gamesPlayed : 0)

export const SORT_COLUMNS = [
  { col: 'pts', label: 'Points', short: 'PTS', value: (r) => r.points },
  { col: 'w', label: 'Wins', short: 'WINS', value: (r) => r.wins },
  { col: 'gp', label: 'Games', short: 'GAMES', value: (r) => r.gamesPlayed },
  { col: 'pct', label: 'Win %', short: 'WIN %', value: winRate },
]

// Sorts by the chosen column; ties fall back to the league tiebreaker
// (points → win rate → name) so order is always stable.
export function sortStandings(rows, col = 'pts', dir = 'desc') {
  const c = SORT_COLUMNS.find((x) => x.col === col) ?? SORT_COLUMNS[0]
  const sign = dir === 'asc' ? -1 : 1
  return [...rows].sort((a, b) =>
    sign * (c.value(b) - c.value(a)) ||
    b.points - a.points ||
    winRate(b) - winRate(a) ||
    a.name.localeCompare(b.name)
  )
}

export function nextSort(current, col) {
  if (current.col === col) return { col, dir: current.dir === 'desc' ? 'asc' : 'desc' }
  return { col, dir: 'desc' }
}
