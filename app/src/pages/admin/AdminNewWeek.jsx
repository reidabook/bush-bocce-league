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

const TEAM_COLORS = ['Red', 'Green', 'Blue', 'Yellow', 'Orange', 'Purple', 'Black']

function deriveNumTeams(playerCount, playersPerTeam) {
  const raw = Math.round(playerCount / playersPerTeam)
  const n = raw < 3 ? 3 : raw
  return n % 2 === 0 ? n + 1 : n  // must be odd
}

function teamSizeLabel(playerCount, numTeams) {
  const base = Math.floor(playerCount / numTeams)
  const extra = playerCount % numTeams
  if (extra === 0) return `${numTeams} teams of ${base}`
  const sizes = [
    ...Array(extra).fill(base + 1),
    ...Array(numTeams - extra).fill(base),
  ]
  return `${numTeams} teams (${sizes.join('+')})`
}

function buildTeams(players, numTeams) {
  const shuffled = shuffle(players)
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    name: `${TEAM_COLORS[i] || `Team ${i + 1}`} Team`,
    players: [],
  }))
  // Distribute round-robin so sizes are as even as possible
  shuffled.forEach((p, i) => {
    teams[i % numTeams].players.push(p)
  })
  return teams
}

export default function AdminNewWeek() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [playersPerTeam, setPlayersPerTeam] = useState(2)

  // Step 2
  const [selected, setSelected] = useState(new Set())

  // Step 3
  const [teams, setTeams] = useState([])

  useEffect(() => {
    Promise.all([getPlayers(), getWeeks()])
      .then(([players, weeks]) => {
        setAllPlayers(players)
        // Pre-select everyone
        setSelected(new Set(players.map((p) => p.id)))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function togglePlayer(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function generateTeams() {
    const attending = allPlayers.filter((p) => selected.has(p.id))
    const numTeams = deriveNumTeams(attending.length, playersPerTeam)
    setTeams(buildTeams(attending, numTeams))
  }

  function goToStep3() {
    const numTeams = deriveNumTeams(selected.size, playersPerTeam)
    if (selected.size < numTeams) {
      setError(`Select at least ${numTeams} players for ${numTeams} teams.`)
      return
    }
    setError(null)
    generateTeams()
    setStep(3)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Get current week count to assign a week number
      const weeks = await getWeeks()
      const weekNumber = weeks.length + 1

      const week = await createWeek(weekNumber, date, playersPerTeam)
      await setAttendees(week.id, [...selected])
      await saveTeams(week.id, teams)
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
          Step {step} of 3
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          {step === 1 ? 'New Session' : step === 2 ? "Who's Playing?" : 'Review Teams'}
        </h1>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Step 1: Date + team size */}
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
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Players per Team</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayersPerTeam(n)}
                  className="flex-1 py-3 rounded-xl border text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: playersPerTeam === n ? '#1B2F5E' : 'white',
                    color: playersPerTeam === n ? 'white' : '#1B2F5E',
                    borderColor: '#1B2F5E',
                  }}
                >
                  {n}v{n}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-40 mt-2">
              Number of teams is calculated from attendance. Must be odd — one team sits out each game.
            </p>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Attendance */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-sm opacity-50">
            <span>{selected.size} selected</span>
            {selected.size >= 3 && (
              <span className="ml-2">
                → {teamSizeLabel(selected.size, deriveNumTeams(selected.size, playersPerTeam))}
              </span>
            )}
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
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
            >
              ← Back
            </button>
            <button
              onClick={goToStep3}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              Generate Teams →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review teams */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {teams.map((team, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#89B4D0' }}>
                  {team.name}
                </div>
                {team.players.map((p) => (
                  <div key={p.id} className="text-sm py-0.5 font-medium">{p.name}</div>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={generateTeams}
            className="w-full py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
          >
            🔀 Re-shuffle
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
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
    </div>
  )
}
