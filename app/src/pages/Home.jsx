import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStandings, getTeamsForSession } from '../lib/db'
import { fetchSessionsCached } from '../lib/useActiveSession'
import { sortStandings, nextSort, fmtWinPct, SORT_COLUMNS } from '../lib/standingsSort'
import { teamColorById, sortTeams } from '../lib/teamColors'
import { PageTitle, Card, LiveLabel, EmptyState, SkeletonList, Icon } from '../components/ui'
import Ball from '../components/Ball'
import ErrorState from '../components/ErrorState'

export { fmtWinPct }

export default function Home() {
  const [standings, setStandings] = useState(null)
  const [active, setActive] = useState(null)
  const [activeTeams, setActiveTeams] = useState([])
  const [error, setError] = useState(null)
  const [sort, setSort] = useState({ col: 'pts', dir: 'desc' })

  useEffect(() => {
    Promise.all([getStandings(), fetchSessionsCached()])
      .then(([s, sessions]) => {
        setStandings(s)
        const a = sessions.find((x) => x.status === 'active') || null
        setActive(a)
        if (a) getTeamsForSession(a.id).then(setActiveTeams).catch(() => {})
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState error={error} />

  const col = SORT_COLUMNS.find((c) => c.col === sort.col)
  const rows = standings ? sortStandings(standings, sort.col, sort.dir) : []

  return (
    <div className="space-y-5">
      {active && <LiveCard session={active} teams={activeTeams} />}

      <section className="space-y-2.5">
        <PageTitle title="Standings">
          {standings && <span className="text-[13px] text-muted pb-0.5">{standings.length} players</span>}
        </PageTitle>

        <div role="group" aria-label="Sort standings by" className="inline-flex gap-1 bg-card rounded-full p-[3px]">
          {SORT_COLUMNS.map((c) => {
            const on = sort.col === c.col
            return (
              <button key={c.col} type="button" aria-pressed={on}
                onClick={() => setSort((s) => nextSort(s, c.col))}
                className={`h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${on ? 'bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530]' : 'text-muted'}`}>
                {c.label}{on && sort.dir === 'asc' ? ' ↑' : ''}
              </button>
            )
          })}
        </div>

        {!standings ? (
          <SkeletonList rows={8} />
        ) : standings.length === 0 ? (
          <EmptyState title="No games yet">Standings start after the first session closes.</EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <ol>
              {rows.map((p, i) => {
                const leader = sort.col === 'pts' && sort.dir === 'desc' && i === 0 && p.points > 0
                const big = sort.col === 'pct' ? fmtWinPct(p.wins, p.gamesPlayed) : col.value(p)
                const sub = sort.col === 'pts'
                  ? `${p.wins}W · ${p.gamesPlayed} games · ${fmtWinPct(p.wins, p.gamesPlayed)}`
                  : `${p.points} pts · ${p.wins}W · ${p.gamesPlayed} games`
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3.5 h-[56px] border-t border-hair first:border-t-0">
                    <span className="font-display font-extrabold text-xl text-muted w-6 text-center tabular">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-[17px] leading-tight">
                        <span className="truncate">{p.name}</span>
                        {leader && <Ball pallino size={10} title="Leader — closest to the pallino" />}
                      </div>
                      <div className="text-[13px] text-muted tabular">{sub}</div>
                    </div>
                    <div className="flex flex-col items-end leading-none">
                      <span className="font-display font-black text-[30px] text-brand tabular">{big}</span>
                      <span className="text-[10px] font-bold tracking-[.12em] text-muted">{col.short}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        )}
      </section>
    </div>
  )
}

function LiveCard({ session, teams }) {
  const sorted = sortTeams(teams)
  const date = new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <Link to="/tonight" className="flex items-center gap-3 bg-card rounded-2xl p-3.5 shadow-[0_1px_0_var(--line)]">
      <div className="flex-1 min-w-0 space-y-1.5">
        <LiveLabel>Live now</LiveLabel>
        <div className="font-display font-extrabold text-[22px] leading-none text-brand">Tonight · Session {session.session_number}</div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          {sorted.map((t) => <Ball key={t.id} color={teamColorById(teams, t.id)} size={14} />)}
          <span>{sorted.length ? `${sorted.length} teams · ` : ''}{date}</span>
        </div>
      </div>
      <Icon name="chevron" size={20} className="text-muted" />
    </Link>
  )
}
