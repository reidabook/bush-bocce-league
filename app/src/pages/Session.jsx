import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSessionManageData } from '../lib/db'
import { fetchSessionsCached } from '../lib/useActiveSession'
import { computeSessionStats, departureLabel } from '../lib/sessionStats'
import { teamColorById, shortTeamName } from '../lib/teamColors'
import { isAdmin } from '../lib/auth'
import { PageTitle, SectionLabel, Card, LiveLabel, Pill, EmptyState, SkeletonList, Button } from '../components/ui'
import Ball from '../components/Ball'
import ErrorState from '../components/ErrorState'

const fmtDate = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts)

// One screen for any session (ADR 0001). `tonight` = show the active session.
export default function Session({ tonight = false }) {
  const params = useParams()
  const [id, setId] = useState(tonight ? null : params.id)
  const [data, setData] = useState(null)
  const [none, setNone] = useState(false)
  const [error, setError] = useState(null)
  const admin = isAdmin()

  useEffect(() => {
    if (!tonight) { setId(params.id); return }
    fetchSessionsCached({ force: true })
      .then((s) => {
        const a = s.find((x) => x.status === 'active')
        if (a) setId(a.id)
        else setNone(true)
      })
      .catch((e) => setError(e.message))
  }, [tonight, params.id])

  const reload = useCallback(() => {
    if (!id) return Promise.resolve()
    return getSessionManageData(id).then(setData).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => { setData(null); reload() }, [reload])

  if (error) return <ErrorState title="Couldn't load this session" error={error} />
  if (none) {
    return (
      <EmptyState title="No session tonight"
        action={admin && <Button to="/admin/sessions/new">Start a session</Button>}>
        Check back when the commissioner starts one.
      </EmptyState>
    )
  }
  if (!data) return <div className="pt-16"><SkeletonList rows={5} /></div>

  return <SessionView data={data} reload={reload} admin={admin} />
}

export function SessionView({ data }) {
  const { session, teams, games, departures, exclusions } = data
  const live = session.status === 'active'
  const stats = computeSessionStats(teams, games, departures, exclusions)
  const depMap = Object.fromEntries(departures.map((d) => [d.player_id, d]))
  const colorOf = (teamId) => teamColorById(teams, teamId)
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const longDate = fmtDate(session.date, { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5">
      <PageTitle
        size={live ? 'lg' : 'md'}
        eyebrow={live ? <LiveLabel /> : <span className="text-xs font-bold tracking-[.12em] uppercase text-muted">Session {session.session_number}</span>}
        title={live ? 'Tonight' : fmtDate(session.date, { weekday: 'long', month: 'short', day: 'numeric' })}
        meta={live ? `Session ${session.session_number} · ${longDate}` : session.status === 'setup' ? 'Setting up' : `${games.length} games`}
      />

      {teams.length === 0 ? (
        <EmptyState title="No teams yet">Teams show up here once the commissioner locks them in.</EmptyState>
      ) : (
        <section>
          <SectionLabel>{live ? "Tonight's teams" : 'Teams'}</SectionLabel>
          <div className={`grid gap-2 ${teams.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {teams.map((t) => (
              <Card key={t.id} className="p-2.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 mb-2">
                  <Ball color={colorOf(t.id)} size={20} />
                  <span className="font-bold text-sm truncate">{shortTeamName(t.name)}</span>
                </div>
                <ul className="space-y-1">
                  {t.players.map((p) => {
                    const dep = depMap[p.id]
                    return (
                      <li key={p.id} className={`text-[13px] leading-tight ${dep ? 'text-muted' : ''}`}>
                        <div className="flex justify-between gap-1">
                          <span className="truncate">{p.name}</span>
                          <span className="font-semibold tabular">{stats[p.id]?.points ?? 0}</span>
                        </div>
                        {dep && <div className="text-[11px] italic">{departureLabel(dep.departed_at, games)}</div>}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      {games.length > 0 && (
        <section>
          <SectionLabel right="newest first">Games</SectionLabel>
          <Card className="overflow-hidden">
            <ol>
              {games.map((g, i) => ({ g, n: i + 1 })).reverse().map(({ g, n }) => {
                const a = teamById[g.team_a_id], b = teamById[g.team_b_id]
                if (!a || !b) return null
                const pending = !g.winner_team_id
                const [w, l] = pending ? [a, b] : g.winner_team_id === a.id ? [a, b] : [b, a]
                return (
                  <li key={g.id} className="px-3.5 py-3 border-t border-hair first:border-t-0">
                    <div className="flex items-center gap-2 min-h-[28px]">
                      <span className="font-display font-extrabold text-lg text-muted w-5 tabular">{n}</span>
                      <Ball color={colorOf(w.id)} size={18} />
                      <span className={`text-[15px] ${pending ? 'font-semibold' : 'font-bold'}`}>{shortTeamName(w.name)}</span>
                      <span className="text-[13px] text-muted">{pending ? 'vs' : 'beat'}</span>
                      <Ball color={colorOf(l.id)} size={18} />
                      <span className={`text-[15px] ${pending ? 'font-semibold' : 'text-muted'}`}>{shortTeamName(l.name)}</span>
                      {pending && <span className="ml-auto"><Pill>{live ? 'In play' : 'No result'}</Pill></span>}
                    </div>
                    {g.notes && <p className="text-xs text-muted italic mt-1 pl-7">{g.notes}</p>}
                  </li>
                )
              })}
            </ol>
          </Card>
        </section>
      )}

      {live && (
        <p className="text-[13px] text-muted leading-snug px-0.5">
          Win = 4 pts, loss = 1. Tonight's points join the standings when the session closes.
        </p>
      )}
    </div>
  )
}
