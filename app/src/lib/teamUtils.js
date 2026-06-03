// Pure team-building utilities — no I/O, no React deps.

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function captainName(players) {
  if (!players.length) return 'TBD'
  const first = [...players].sort((a, b) => a.name.localeCompare(b.name))[0]
  return `${first.name.split(' ')[0]}'s Team`
}

// Random: Fisher-Yates shuffle + round-robin distribution.
export function buildTeams(players, n) {
  const shuffled = shuffle(players)
  const teams = Array.from({ length: n }, () => ({ players: [] }))
  shuffled.forEach((p, i) => { teams[i % n].players.push(p) })
  return teams.map((t) => ({ name: captainName(t.players), players: t.players }))
}

// Snake draft ordered by standings points (desc).
// standingsMap = { [playerId]: points }. Players absent from the map are treated
// as 0 points and go last in draft order (they pair with a strong player).
export function buildSnakeDraftTeams(players, standingsMap, n) {
  const sorted = [...players].sort((a, b) => {
    const pa = standingsMap[a.id] ?? -Infinity
    const pb = standingsMap[b.id] ?? -Infinity
    if (pb !== pa) return pb - pa
    return a.name.localeCompare(b.name)
  })

  const teams = Array.from({ length: n }, () => ({ players: [] }))

  sorted.forEach((player, pickIndex) => {
    const round = Math.floor(pickIndex / n)
    const withinRound = pickIndex % n
    const teamIndex = round % 2 === 0 ? withinRound : n - 1 - withinRound
    teams[teamIndex].players.push(player)
  })

  return teams.map((t) => ({ name: captainName(t.players), players: t.players }))
}
