import { useEffect, useState } from 'react'
import { getTournament, getTournamentMatches } from '../lib/db'
import { groupByRound, roundLabel, champion } from '../lib/bracket'
import { isAdmin } from '../lib/auth'
import { PageTitle, SectionLabel, Card, EmptyState, SkeletonList, Button } from '../components/ui'
import Ball from '../components/Ball'
import ErrorState from '../components/ErrorState'

export function ChampionCard({ player }) {
  return (
    <Card className="p-5 text-center bg-[#1B2F5E] dark:bg-card text-white">
      <div className="flex justify-center mb-2"><Ball pallino size={22} /></div>
      <div className="text-xs font-bold tracking-[.12em] uppercase text-sky">League champion</div>
      <div className="font-display font-black text-[40px] leading-none mt-1">{player.name}</div>
    </Card>
  )
}

export function MatchLine({ match }) {
  if (match.is_bye) {
    return <div className="text-[15px]"><span className="font-semibold">{match.player_a?.name}</span><span className="text-muted"> — bye</span></div>
  }
  const side = (p, id) => {
    const won = match.winner_id && match.winner_id === id
    const lost = match.winner_id && !won
    return (
      <span className={`flex-1 min-w-0 truncate text-[15px] ${won ? 'font-bold' : lost ? 'text-muted' : 'font-semibold'}`}>
        {p?.name ?? <span className="text-muted font-normal">TBD</span>}
      </span>
    )
  }
  return (
    <div className="flex items-center gap-3">
      {side(match.player_a, match.player_a_id)}
      <span className="text-[13px] text-muted">{match.winner_id ? '' : 'vs'}</span>
      <span className="flex-1 min-w-0 text-right">{side(match.player_b, match.player_b_id)}</span>
    </div>
  )
}

export default function Tournament() {
  const [state, setState] = useState(null) // { tournament, matches }
  const [error, setError] = useState(null)
  const admin = isAdmin()

  useEffect(() => {
    getTournament()
      .then(async (t) => setState({ tournament: t, matches: t ? await getTournamentMatches(t.id) : [] }))
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState title="Couldn't load the tournament" error={error} />
  if (!state) return <div className="pt-16"><SkeletonList rows={4} /></div>
  const { tournament, matches } = state

  if (!tournament) {
    return (
      <EmptyState title="Tournament"
        action={admin && <Button to="/admin/tournament">Set up tournament</Button>}>
        Starts after the regular season, seeded from final standings.
      </EmptyState>
    )
  }

  const rounds = groupByRound(matches)
  const maxRound = rounds.length ? rounds[rounds.length - 1].round : 0
  const champ = champion(matches)

  return (
    <div className="space-y-5">
      <PageTitle title="Tournament" meta={tournament.status === 'complete' ? 'Season complete' : 'In progress'}>
        {admin && <Button size="sm" variant="secondary" to="/admin/tournament">Manage</Button>}
      </PageTitle>
      {champ && <ChampionCard player={champ} />}
      {rounds.map(({ round, matches: ms }) => (
        <section key={round}>
          <SectionLabel>{roundLabel(round, maxRound)}</SectionLabel>
          <Card className="overflow-hidden">
            {ms.map((m) => <div key={m.id} className="px-3.5 py-3 border-t border-hair first:border-t-0"><MatchLine match={m} /></div>)}
          </Card>
        </section>
      ))}
    </div>
  )
}
