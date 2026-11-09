import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, getSessions, getStandings, createSession, setAttendees, saveTeams, updateSessionStatus } from '../../lib/db'
import { buildTeams, buildSnakeDraftTeams, moveToNextTeam, teamsFromAssignment } from '../../lib/teamUtils'
import { teamColorById, shortTeamName, sortTeams } from '../../lib/teamColors'
import { invalidateSessionsCache } from '../../lib/useActiveSession'
import { Header } from '../../components/Layout'
import { Icon, SkeletonList, Button } from '../../components/ui'
import Ball from '../../components/Ball'

const MODES = [
  { id: 'auto', label: 'Random', hint: 'Shuffle everyone into even teams.' },
  { id: 'snake', label: 'Snake draft', hint: 'Draft by standings so teams are balanced.' },
  { id: 'manual', label: 'Manual', hint: 'You put each player on a team.' },
]
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Give in-progress teams stable ids so ball colors follow name order like saved teams do.
const withIds = (teams) => teams.map((t, i) => ({ ...t, id: `new-${i}` }))

function Segmented({ options, value, onChange, label, size = 'md' }) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 bg-ice rounded-[14px] p-[3px]">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`flex-1 ${size === 'sm' ? 'h-9' : 'h-11'} rounded-xl text-[15px] font-semibold transition-colors
            ${value === o.id ? 'bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530]' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminNewSession() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [allPlayers, setAllPlayers] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState(new Set())
  const [mode, setMode] = useState('auto')
  const [standingsMap, setStandingsMap] = useState({})
  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState([])
  const [manualAssign, setManualAssign] = useState({})

  useEffect(() => {
    Promise.all([getPlayers(), getStandings()])
      .then(([players, standings]) => {
        setAllPlayers(players)
        setSelected(new Set(players.map((p) => p.id)))
        setStandingsMap(Object.fromEntries(standings.map((s) => [s.id, s.points])))
      })
      .catch((e) => setError(e.message))
  }, [])

  const players = allPlayers ?? []
  const attending = players.filter((p) => selected.has(p.id))
  const allOn = attending.length === players.length
  const unassigned = attending.filter((p) => manualAssign[p.id] === undefined)
  const modeInfo = MODES.find((m) => m.id === mode)

  function togglePlayer(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generate() {
    if (mode === 'auto') setTeams(withIds(buildTeams(attending, teamCount)))
    else if (mode === 'snake') setTeams(withIds(buildSnakeDraftTeams(attending, standingsMap, teamCount)))
  }

  function goToStep2() {
    if (attending.length < teamCount) {
      setError(`Pick at least ${teamCount} players for ${teamCount} teams.`)
      return
    }
    setError(null)
    if (mode === 'manual') setManualAssign({})
    else generate()
    setStep(2)
  }

  async function handleSave() {
    const finalTeams = mode === 'manual'
      ? teamsFromAssignment(attending, manualAssign, teamCount)
      : teams.map(({ name, players: ps }) => ({ name, players: ps }))
    if (mode === 'manual' && unassigned.length) {
      setError(`Still to place: ${unassigned.map((p) => p.name).join(', ')}`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const sessions = await getSessions()
      const session = await createSession(sessions.length + 1, date, teamCount)
      await setAttendees(session.id, [...selected])
      await saveTeams(session.id, finalTeams)
      await updateSessionStatus(session.id, 'active')
      invalidateSessionsCache()
      navigate('/tonight', { replace: true })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const manualTeams = withIds(teamsFromAssignment(attending, manualAssign, teamCount))
  const shownTeams = mode === 'manual' ? manualTeams : teams
  const colorOf = (id) => teamColorById(shownTeams, id)

  return (
    <div className="flex flex-col min-h-svh">
      <Header>
        {step === 2 && (
          <button type="button" onClick={() => { setStep(1); setError(null) }} aria-label="Back to who's here"
            className="-ml-3 w-11 h-11 flex items-center justify-center text-white"><Icon name="back" /></button>
        )}
        <div className="flex-1">
          <div className="text-xs font-bold tracking-[.12em] uppercase text-sky">
            Step {step} of 2{step === 2 ? ` · ${modeInfo.label}` : ''}
          </div>
          <h1 className="font-display font-black text-[28px] leading-none">{step === 1 ? "Who's here?" : mode === 'manual' ? 'Pick teams' : "Tonight's teams"}</h1>
        </div>
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Cancel new session"
          className="-mr-2 w-11 h-11 flex items-center justify-center text-white"><Icon name="close" /></button>
      </Header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-1.5 pb-6 space-y-3">
        {error && <p role="alert" className="rounded-xl bg-live-bg text-live text-sm px-3 py-2">{error}</p>}

        {!allPlayers ? <SkeletonList rows={8} height={48} /> : step === 1 ? (
          <>
            <div className="flex gap-2">
              <label className="flex-1 bg-card rounded-[14px] px-3 py-2">
                <span className="block text-xs font-bold tracking-[.12em] uppercase text-muted">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-7 bg-transparent outline-none text-base font-semibold" />
              </label>
              <div className="flex-[1.3] bg-card rounded-[14px] px-2 pt-2 pb-1.5">
                <span className="block text-xs font-bold tracking-[.12em] uppercase text-muted pl-1 mb-1">Teams</span>
                <Segmented size="sm" label="Number of teams" value={teamCount} onChange={setTeamCount}
                  options={[2, 3, 4].map((n) => ({ id: n, label: String(n) }))} />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">{attending.length} of {players.length} playing</span>
              <button type="button" className="h-9 font-bold text-sm text-brand"
                onClick={() => setSelected(allOn ? new Set() : new Set(players.map((p) => p.id)))}>
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <ul className="bg-card rounded-2xl overflow-hidden">
              {players.map((p) => {
                const on = selected.has(p.id)
                return (
                  <li key={p.id} className="border-t border-hair first:border-t-0">
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => togglePlayer(p.id)}
                      className="w-full flex items-center gap-3 h-12 px-3.5 text-left">
                      <span className={`w-6 h-6 rounded-[7px] border-2 flex items-center justify-center shrink-0
                        ${on ? 'bg-[#1B2F5E] border-[#1B2F5E] dark:bg-sky dark:border-sky text-white dark:text-[#0B1530]' : 'border-line'}`}>
                        {on && <Icon name="check" size={14} strokeWidth={3.5} />}
                      </span>
                      <span className="flex-1 font-semibold text-base">{p.name}</span>
                      <span className="text-[13px] text-muted tabular">{standingsMap[p.id] ?? 0} pts</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : mode === 'manual' ? (
          <>
            <p className="text-sm text-muted">Tap a number to put each player on a team. Teams get their ball colors once you start.</p>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-3.5 h-12">
              {manualTeams.map((t, i) => (
                <span key={t.id} className="flex items-center gap-1.5 text-sm font-semibold tabular">
                  <span className="w-6 h-6 rounded-full bg-ice text-xs font-bold flex items-center justify-center">{i + 1}</span>{t.players.length}
                </span>
              ))}
              <span className="ml-auto text-[13px] text-muted">{unassigned.length ? `${unassigned.length} to place` : 'Everyone placed'}</span>
            </div>
            <ul className="bg-card rounded-2xl overflow-hidden">
              {attending.map((p) => (
                <li key={p.id} className="flex items-center gap-2 pl-3.5 pr-2 h-14 border-t border-hair first:border-t-0">
                  <span className="flex-1 font-semibold">{p.name}</span>
                  {manualTeams.map((t, i) => {
                    const on = manualAssign[p.id] === i
                    return (
                      <button key={t.id} type="button" aria-pressed={on} aria-label={`Put ${p.name} on team ${i + 1}`}
                        onClick={() => setManualAssign((prev) => {
                          const next = { ...prev }
                          if (on) delete next[p.id]
                          else next[p.id] = i
                          return next
                        })}
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors
                          ${on ? 'bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530]' : 'bg-ice text-muted'}`}>
                        {i + 1}
                      </button>
                    )
                  })}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Tap the ball to move someone to the next team. Captain = first name alphabetically.</p>
            {sortTeams(teams).map((t, ti, sorted) => {
              const next = sorted[(ti + 1) % sorted.length]
              return (
                <section key={t.id} className="bg-card rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <Ball color={colorOf(t.id)} size={26} />
                    <h2 className="font-display font-extrabold text-xl text-brand flex-1">{t.name}</h2>
                    <span className="text-[13px] text-muted">{t.players.length} players</span>
                  </div>
                  <ul>
                    {t.players.map((p) => (
                      <li key={p.id} className="flex items-center pl-[50px] pr-1 h-11 border-t border-hair">
                        <span className="flex-1 font-semibold">{p.name}</span>
                        <button type="button" aria-label={`Move ${p.name} to ${shortTeamName(next.name)}`}
                          onClick={() => setTeams((prev) => moveToNextTeam(sortTeams(prev), p.id))}
                          className="h-11 px-2.5 flex items-center gap-1.5 text-muted">
                          <Icon name="arrow" size={14} strokeWidth={2.2} />
                          <Ball color={colorOf(next.id)} size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </>
        )}
      </main>

      {allPlayers && (
        <footer className="sticky bottom-0 bg-card border-t border-line" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-lg mx-auto px-4 pt-3 space-y-2.5">
            {step === 1 ? (
              <>
                <Segmented label="How to split teams" value={mode} onChange={setMode} options={MODES} />
                <p className="text-[13px] text-muted text-center">{modeInfo.hint}</p>
                <Button size="lg" className="w-full" onClick={goToStep2} disabled={attending.length < teamCount}>
                  {mode === 'manual' ? `Place ${attending.length} players →` : `Make ${teamCount} teams →`}
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                {mode !== 'manual' && (
                  <Button size="lg" variant="secondary" onClick={generate} disabled={saving}>
                    <Icon name="shuffle" size={18} /> {mode === 'snake' ? 'Re-draft' : 'Reshuffle'}
                  </Button>
                )}
                <Button size="lg" className="flex-1" onClick={handleSave} disabled={saving || (mode === 'manual' && unassigned.length > 0)}>
                  {saving ? 'Starting…' : 'Lock teams & start'}
                </Button>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
