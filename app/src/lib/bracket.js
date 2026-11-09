export function groupByRound(matches) {
  const rounds = {}
  for (const m of matches) (rounds[m.round] ||= []).push(m)
  return Object.keys(rounds).map(Number).sort((a, b) => a - b)
    .map((r) => ({ round: r, matches: rounds[r].sort((a, b) => a.position - b.position) }))
}

export function roundLabel(r, maxRound) {
  if (r === maxRound && maxRound > 1) return 'Final'
  if (r === maxRound - 1 && maxRound > 2) return 'Semifinal'
  return `Round ${r}`
}

export function champion(matches) {
  const rounds = groupByRound(matches)
  const final = rounds[rounds.length - 1]?.matches[0]
  return final?.winner ?? null
}
