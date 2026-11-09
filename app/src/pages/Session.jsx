import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSessionManageData } from '../lib/db'
import { fetchSessionsCached } from '../lib/useActiveSession'
import { computeSessionStats, departureLabel } from '../lib/sessionStats'
import { teamColorById, shortTeamName } from '../lib/teamColors'
import { isAdmin } from '../lib/auth'
import { PageTitle, SectionLabel, Card, LiveLabel, Pill, EmptyState, SkeletonList, Button, Icon } from '../components/ui'
import { pendingGame } from '../lib/gameFlow'
import { useCommish } from './session/useCommish'
import Assistant from './session/Assistant'
import { PendingGameCard, UndoBar, GameSheet, AddGameSheet, TeamsSheet, OptionsSheet } from './session/commish'
import Ball from '../components/Ball'
import ErrorState from '../components/ErrorState'

const fmtDate = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts)

// One screen for any session (ADR 0001). `tonight` = show the active session.
export default function Session({ tonight = false }) {
  const params = useParams()
  const [activeId, setActiveId] = useState(null)
  const [loaded, setLoaded] = useState(null) // { id, data }
  const [none, setNone] = useState(false)
  const [error, setError] = useState(null)
  const admin = isAdmin()
  const id = tonight ? activeId : params.id

  useEffect(() => {
    if (!tonight) return
    fetchSessionsCached({ force: true })
      .then((s) => {
        const a = s.find((x) => x.status === 'active')
        if (a) setActiveId(a.id)
        else setNone(true)
      })
      .catch((e) => setError(e.message))
  }, [tonight])

  const reload = useCallback(() => {
    if (!id) return Promise.resolve()
    return getSessionManageData(id).then((d) => setLoaded({ id, data: d })).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => { reload() }, [reload])

  const data = loaded?.id === id ? loaded.data : null

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

export function SessionView({ data, reload, admin }) {
  const { session, teams, games, departures, exclusions, allPlayers = [] } = data
  const live = session.status === 'active'
  const c = useCommish(session.id, reload)
  const [sheet, setSheet] = useState(null) // 'add' | 'teams' | 'options' | { gameId }
  const [undo, setUndo] = useState(null)   // { gameId, text }
  const pending = admin && live ? pendingGame(games) : null
  const numberOf = (gameId) => games.findIndex((g) => g.id === gameId) + 1
  const sheetGame = sheet?.gameId ? games.find((g) => g.id === sheet.gameId) : null

  async function recordFromCard(gameId, teamId) {
    const t = teams.find((x) => x.id === teamId)
    if (await c.record(gameId, teamId)) setUndo({ gameId, text: `${shortTeamName(t.name)} won game ${numberOf(gameId)}.` })
  }
  async function quickAddGame() {
    if (teams.length === 2) await c.add(teams[0].id, teams[1].id)
    else setSheet('add')
  }
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
      >
        {admin && (
          <button type="button" aria-label="Session options" onClick={() => setSheet('options')}
            className="w-11 h-11 rounded-full bg-card flex items-center justify-center text-brand shrink-0">
            <Icon name="more" size={20} />
          </button>
        )}
      </PageTitle>

      {c.error && (
        <div role="alert" className="rounded-xl bg-live-bg text-live text-sm px-3 py-2 flex items-start gap-2">
          <span className="flex-1">That didn't save: {c.error}</span>
          <button type="button" className="font-bold" onClick={() => c.setError(null)}>OK</button>
        </div>
      )}
      {undo && live && (
        <UndoBar text={undo.text} busy={c.busy} onDismiss={() => setUndo(null)}
          onUndo={async () => { if (await c.clear(undo.gameId)) setUndo(null) }} />
      )}
      {pending && (
        <PendingGameCard game={pending} number={numberOf(pending.id)} teams={teams} exclusions={exclusions}
          colorOf={colorOf} c={{ ...c, record: recordFromCard }} />
      )}

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
          {admin && (
            <button type="button" onClick={() => setSheet('teams')} className="mt-1 h-11 px-0.5 text-sm font-semibold text-brand">
              Teams &amp; who left early ›
            </button>
          )}
        </section>
      )}

      {games.length > 0 && (
        <section>
          <SectionLabel right="newest first">Games</SectionLabel>
          <Card className="overflow-hidden">
            <ol>
              {games.map((g, i) => ({ g, n: i + 1 })).reverse().filter(({ g }) => g.id !== pending?.id).map(({ g, n }) => {
                const a = teamById[g.team_a_id], b = teamById[g.team_b_id]
                if (!a || !b) return null
                const undecided = !g.winner_team_id
                const [w, l] = undecided ? [a, b] : g.winner_team_id === a.id ? [a, b] : [b, a]
                return (
                  <li key={g.id} className="px-3.5 py-3 border-t border-hair first:border-t-0">
                    <div className="flex items-center gap-2 min-h-[28px]">
                      <span className="font-display font-extrabold text-lg text-muted w-5 tabular">{n}</span>
                      <Ball color={colorOf(w.id)} size={18} />
                      <span className={`text-[15px] ${undecided ? 'font-semibold' : 'font-bold'}`}>{shortTeamName(w.name)}</span>
                      <span className="text-[13px] text-muted">{undecided ? 'vs' : 'beat'}</span>
                      <Ball color={colorOf(l.id)} size={18} />
                      <span className={`text-[15px] ${undecided ? 'font-semibold' : 'text-muted'}`}>{shortTeamName(l.name)}</span>
                      {undecided && <span className="ml-auto"><Pill>{live ? 'In play' : 'No result'}</Pill></span>}
                      {admin && (
                        <button type="button" aria-label={`Edit game ${n}`} onClick={() => setSheet({ gameId: g.id })}
                          className={`${undecided ? '' : 'ml-auto'} -my-2 -mr-2 w-11 h-11 flex items-center justify-center text-muted`}>
                          <Icon name="edit" size={18} />
                        </button>
                      )}
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

      {admin && live && (
        <>
          <div className="h-16" aria-hidden="true" />
          <div className="fixed inset-x-0 z-20 bg-ice/95 backdrop-blur" style={{ bottom: 'calc(62px + max(10px, env(safe-area-inset-bottom)))' }}>
            <div className="max-w-lg mx-auto px-3 py-2.5 flex items-center gap-2">
              <Assistant data={data} reload={reload} />
              <Button className="h-12 rounded-full px-4 min-[380px]:px-5 shrink-0" disabled={c.busy || teams.length < 2} onClick={quickAddGame}>
                <Icon name="plus" size={16} strokeWidth={2.5} /> Game
              </Button>
            </div>
          </div>
        </>
      )}

      {admin && (
        <>
          <AddGameSheet open={sheet === 'add'} teams={teams} colorOf={colorOf} c={c} onClose={() => setSheet(null)} />
          <TeamsSheet open={sheet === 'teams'} teams={teams} departures={departures} allPlayers={allPlayers} colorOf={colorOf} c={c} onClose={() => setSheet(null)} />
          {sheet === 'options' && <OptionsSheet open session={session} games={games} c={c} onClose={() => setSheet(null)} />}
          {sheetGame && <GameSheet game={sheetGame} number={numberOf(sheetGame.id)} teams={teams} exclusions={exclusions} colorOf={colorOf} c={c} onClose={() => setSheet(null)} />}
        </>
      )}
    </div>
  )
}
