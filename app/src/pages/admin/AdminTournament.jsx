import { useEffect, useState } from 'react'
import { getStandings, getTournament, getTournamentMatches, createTournament, recordMatchResult, completeTournament } from '../../lib/db'
import { groupByRound, roundLabel, champion } from '../../lib/bracket'
import { PageTitle, SectionLabel, Card, SkeletonList, Button } from '../../components/ui'
import { ChampionCard } from '../Tournament'

export default function AdminTournament() {
  const [data, setData] = useState(null) // { standings, tournament, matches }
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [standings, tournament] = await Promise.all([getStandings(), getTournament()])
    const matches = tournament ? await getTournamentMatches(tournament.id) : []
    setData({ standings, tournament, matches })
  }

  useEffect(() => { reload().catch((e) => setError(e.message)) }, [])

  async function run(fn) {
    setBusy(true)
    setError(null)
    try { await fn(); await reload() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!data) return error ? <p className="text-danger text-sm pt-4">{error}</p> : <div className="pt-16"><SkeletonList rows={6} /></div>
  const { standings, tournament, matches } = data
  const rounds = groupByRound(matches)
  const maxRound = rounds.length ? rounds[rounds.length - 1].round : 0
  const champ = champion(matches)

  return (
    <div className="space-y-5">
      <PageTitle title="Tournament" meta={!tournament ? 'Seeded from current standings' : tournament.status === 'complete' ? 'Complete' : 'In progress'} />
      {error && <p role="alert" className="rounded-xl bg-live-bg text-live text-sm px-3 py-2">{error}</p>}

      {!tournament ? (
        <>
          <section>
            <SectionLabel right={`${standings.length} players`}>Seeds</SectionLabel>
            <Card className="overflow-hidden">
              <ol>
                {standings.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-3.5 h-12 border-t border-hair first:border-t-0">
                    <span className="font-display font-extrabold text-lg text-muted w-6 text-center tabular">{i + 1}</span>
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className="text-[13px] text-muted tabular">{p.points} pts</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
          <Button size="lg" className="w-full" disabled={busy || standings.length < 2}
            onClick={() => confirm('Seed the bracket from current standings? This can’t be undone.') && run(() => createTournament(standings.map((p) => p.id)))}>
            {busy ? 'Seeding…' : 'Seed & start tournament'}
          </Button>
        </>
      ) : (
        <>
          {champ && <ChampionCard player={champ} />}
          {rounds.map(({ round, matches: ms }) => (
            <section key={round}>
              <SectionLabel>{roundLabel(round, maxRound)}</SectionLabel>
              <div className="space-y-2">
                {ms.map((m) => (
                  <Card key={m.id} className="p-3">
                    {m.is_bye ? (
                      <p className="text-[15px]"><span className="font-semibold">{m.player_a?.name}</span><span className="text-muted"> — bye, advances</span></p>
                    ) : m.winner_id ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-[15px]"><strong>{m.winner?.name}</strong> <span className="text-muted">advances</span></span>
                        <Button size="sm" variant="ghost" disabled={busy}
                          onClick={() => run(() => recordMatchResult(m.id, null, tournament.id, m.round, m.position))}>Clear</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {[[m.player_a, m.player_a_id], [m.player_b, m.player_b_id]].map(([p, id], i) => p ? (
                          <button key={i} type="button" disabled={busy}
                            onClick={() => run(() => recordMatchResult(m.id, id, tournament.id, m.round, m.position))}
                            className="flex-1 min-w-0 h-12 px-3 rounded-xl border-2 border-line bg-card font-bold truncate disabled:opacity-50">
                            {p.name}
                          </button>
                        ) : (
                          <span key={i} className="flex-1 h-12 flex items-center justify-center text-muted">TBD</span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
          {tournament.status !== 'complete' && (
            <Button size="lg" className="w-full" disabled={busy}
              onClick={() => confirm('Mark the tournament complete?') && run(() => completeTournament(tournament.id))}>
              Mark tournament complete
            </Button>
          )}
        </>
      )}
    </div>
  )
}
