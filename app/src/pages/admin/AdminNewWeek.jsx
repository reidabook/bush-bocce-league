import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, getWeeks, createWeek, setAttendees, saveTeams, updateWeekStatus } from '../../lib/db'
import Spinner from '../../components/Spinner'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function captainName(players) {
  if (!players.length) return 'TBD'
  const first = [...players].sort((a, b) => a.name.localeCompare(b.name))[0]
  return `${first.name.split(' ')[0]}'s Team`
}

function buildTeams(players, n) {
  const shuffled = shuffle(players)
  const teams = Array.from({ length: n }, () => ({ players: [] }))
  shuffled.forEach((p, i) => { teams[i % n].players.push(p) })
  return teams.map((t) => ({ name: captainName(t.players), players: t.players }))
}

const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316']

export default function AdminNewWeek() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState(new Set())
  const [mode, setMode] = useState('auto') // 'auto' | 'manual'
  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState([])
  const [manualAssign, setManualAssign] = useState({}) // playerId -> team index

  useEffect(() => {
    getPlayers()
      .then((players) => {
        setAllPlayers(players)
        setSelected(new Set(players.map((p) => p.id)))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const attending = allPlayers.filter((p) => selected.has(p.id))
  const unassignedCount = attending.filter((p) => manualAssign[p.id] === undefined).length

  function togglePlayer(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function swapPlayer(player, fromTeamIndex) {
    const toTeamIndex = (fromTeamIndex + 1) % teams.length
    setTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }))
      next[fromTeamIndex].players = next[fromTeamIndex].players.filter((p) => p.id !== player.id)
      next[toTeamIndex].players.push(player)
      return next.map((t) => ({ ...t, name: captainName(t.players) }))
    })
  }

  function goToStep2() {
    if (selected.size < teamCount) {
      setError(`Select at least ${teamCount} players for ${teamCount} teams.`)
      return
    }
    setError(null)
    if (mode === 'auto') {
      setTeams(buildTeams(attending, teamCount))
    } else {
      setManualAssign({})
    }
    setStep(2)
  }

  function assignManual(playerId, teamIndex) {
    setManualAssign((prev) => {
      if (prev[playerId] === teamIndex) {
        const next = { ...prev }
        delete next[playerId]
        return next
      }
      return { ...prev, [playerId]: teamIndex }
    })
  }

  async function handleSave() {
    let finalTeams
    if (mode === 'manual') {
      const unassigned = attending.filter((p) => manualAssign[p.id] === undefined)
      if (unassigned.length > 0) {
        setError(`Unassigned: ${unassigned.map((p) => p.name).join(', ')}`)
        return
      }
      finalTeams = Array.from({ length: teamCount }, () => ({ name: '', players: [] }))
      for (const p of attending) finalTeams[manualAssign[p.id]].players.push(p)
      finalTeams = finalTeams.map((t) => ({ ...t, name: captainName(t.players) }))
    } else {
      finalTeams = teams
    }

    setSaving(true)
    setError(null)
    try {
      const weeks = await getWeeks()
      const weekNumber = weeks.length + 1
      const week = await createWeek(weekNumber, date, teamCount)
      await setAttendees(week.id, [...selected])
      await saveTeams(week.id, finalTeams)
      await updateWeekStatus(week.id, 'active')
      navigate(`/admin/weeks/${week.id}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">
          Step {step} of 2
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          {step === 1 ? 'New Session' : mode === 'auto' ? 'Review Teams' : 'Assign Teams'}
        </h1>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Step 1: Date + attendance + mode */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Who's Playing?</label>
              <span className="text-xs opacity-40">{selected.size} selected</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {allPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-0 text-left"
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: selected.has(p.id) ? '#1B2F5E' : 'white',
                      borderColor: selected.has(p.id) ? '#1B2F5E' : '#d1d5db',
                    }}
                  >
                    {selected.has(p.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Team count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Number of Teams</label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamCount(n)}
                  className="py-2 px-5 rounded-xl border-2 text-sm font-bold"
                  style={{
                    borderColor: teamCount === n ? '#1B2F5E' : '#e5e7eb',
                    backgroundColor: teamCount === n ? '#f0f4ff' : 'white',
                    color: teamCount === n ? '#1B2F5E' : '#374151',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Team Assignment</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['auto', 'Auto', 'Randomly assign'],
                ['manual', 'Manual', 'Pick yourself'],
              ].map(([val, label, sub]) => (
                <button
                  key={val}
                  onClick={() => setMode(val)}
                  className="py-3 px-4 rounded-xl border-2 text-left"
                  style={{
                    borderColor: mode === val ? '#1B2F5E' : '#e5e7eb',
                    backgroundColor: mode === val ? '#f0f4ff' : 'white',
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: mode === val ? '#1B2F5E' : '#374151' }}>{label}</div>
                  <div className="text-xs opacity-50">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={goToStep2}
            disabled={selected.size < teamCount}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-30"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            {mode === 'auto' ? 'Generate Teams →' : 'Assign Teams →'}
          </button>
        </div>
      )}

      {/* Step 2: Auto mode — review generated teams */}
      {step === 2 && mode === 'auto' && (
        <div className="space-y-4">
          <div className="text-xs opacity-40">{selected.size} players · {teamCount} teams</div>

          <div className={`grid gap-2 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {teams.map((team, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#89B4D0' }}>
                  {team.name}
                </div>
                {team.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-0.5">
                    <span className="text-sm font-medium">{p.name}</span>
                    <button
                      onClick={() => swapPlayer(p, i)}
                      className="text-xs opacity-30 hover:opacity-80 ml-2 flex-shrink-0"
                      title="Move to other team"
                    >↔</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={() => setTeams(buildTeams(attending, teamCount))}
            className="w-full py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
          >
            🔀 Re-shuffle
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              {saving ? 'Saving…' : 'Lock Teams & Start ✓'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Manual mode — assign each player to a team */}
      {step === 2 && mode === 'manual' && (
        <div className="space-y-4">
          <div className="text-xs opacity-40">
            {unassignedCount > 0
              ? `${unassignedCount} of ${attending.length} unassigned`
              : `All ${attending.length} players assigned ✓`}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {attending.map((p) => {
              const assigned = manualAssign[p.id]
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                  <span className="text-sm font-medium flex-1">{p.name}</span>
                  {Array.from({ length: teamCount }, (_, idx) => (
                    <button
                      key={idx}
                      onClick={() => assignManual(p.id, idx)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: assigned === idx ? TEAM_COLORS[idx] : '#f3f4f6',
                        color: assigned === idx ? 'white' : '#6b7280',
                      }}
                    >
                      Team {idx + 1}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || unassignedCount > 0}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              {saving ? 'Saving…' : 'Lock Teams & Start ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
