// Pure single-elimination bracket logic — no I/O. Used by api/_db.js and the
// e2e fake backend. Rows use the sheet's string format.

// Standard seed order so the top seeds meet as late as possible:
// size 4 → [1,4,2,3], size 8 → [1,8,4,5,2,7,3,6].
export function seedOrder(size) {
  let order = [1, 2]
  while (order.length < size) {
    const n = order.length * 2 + 1
    order = order.flatMap((s) => [s, n - s])
  }
  return order.slice(0, size)
}

export function bracketSize(n) {
  let size = 2
  while (size < n) size *= 2
  return size
}

// Where the winner of (round, position) goes next.
export function nextSlot(round, position) {
  return {
    round: Number(round) + 1,
    position: Math.ceil(Number(position) / 2),
    slot: Number(position) % 2 === 1 ? 'player_a_id' : 'player_b_id',
  }
}

// All matches for a new bracket, every round laid out. Missing seeds become
// byes for the top seeds, and bye winners are already placed in round 2.
// Returns rows without id/tournament_id (caller adds them).
export function buildBracket(seededPlayerIds) {
  const n = seededPlayerIds.length
  if (n < 2) throw new Error('A tournament needs at least 2 players.')
  const size = bracketSize(n)
  const rounds = Math.log2(size)
  const order = seedOrder(size)
  const rows = []
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r
    for (let p = 1; p <= count; p++) {
      rows.push({ round: String(r), position: String(p), player_a_id: '', player_b_id: '', winner_id: '', is_bye: 'false' })
    }
  }
  const at = (r, p) => rows.find((m) => m.round === String(r) && m.position === String(p))
  for (let p = 1; p <= size / 2; p++) {
    const [sa, sb] = [order[2 * p - 2], order[2 * p - 1]]
    const a = seededPlayerIds[sa - 1] ?? ''
    const b = seededPlayerIds[sb - 1] ?? ''
    const m = at(1, p)
    m.player_a_id = a || b
    m.player_b_id = a && b ? b : ''
    if (!(a && b)) {
      m.is_bye = 'true'
      m.winner_id = m.player_a_id
      if (rounds > 1) {
        const next = nextSlot(1, p)
        at(next.round, next.position)[next.slot] = m.player_a_id
      }
    }
  }
  return rows
}

// The final is the only match in the last round.
export function isFinal(matches, round) {
  const maxRound = Math.max(...matches.map((m) => Number(m.round)))
  return Number(round) >= maxRound && matches.filter((m) => Number(m.round) === Number(round)).length === 1
}
