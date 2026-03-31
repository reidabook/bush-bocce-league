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
  const sizes = [...Array(extra).fill(base + 1), ...Array(numTeams - extra).fill(base)]
  return `${numTeams} teams (${sizes.join('+')})`
}

function buildTeams(players, numTeams) {
  const shuffled = shuffle(players)
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    name: `${TEAM_COLORS[i] || `Team ${i + 1}`} Team`,
    players: [],
  }))
  shuffled.forEach((p, i) => { teams[i % numTeams].players.push(p) })
  return teams
}

export default function AdminNewWeek() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState(new Set())
  const [playersPerTeam, setPlayersPerTeam] = useState(2)
  const [teams, setTeams] = useState([])

  useEffect(() => {
    getPlayers()
      .then((players) => {
        setAllPlayers(players)
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

  function makeTeams(ppt) {
    const attending = allPlayers.filter((p) => selected.has(p.id))
    const numTeams = deriveNumTeams(attending.length, ppt)
    return buildTeams(attending, numTeams)
  }

  function goToStep2() {
    if (selected.size < 3) {
      setError('Select at least 3 players.')
      return
    }
    setError(null)
    // Pick a sensible default: 3 per team if 9+ players, otherwise 2
    const defaultPpt = selected.size >= 9 ? 3 : 2
    setPlayersPerTeam(defaultPpt)
    setTeams(makeTeams(defaultPpt))
    setStep(2)
  }

  function changePpt(ppt) {
    setPlayersPerTeam(ppt)
    setTeams(makeTeams(ppt))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
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

  const numTeams = deriveNumTeams(selected.size, playersPerTeam)

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">
          Step {step} of 2
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          {step === 1 ? "New Session" : 'Review Teams'}
        </h1>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Step 1: Date + attendance */}
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

          <button
            onClick={goToStep2}
            disabled={selected.size < 3}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-30"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            Generate Teams →
          </button>
        </div>
      )}

      {/* Step 2: Review teams */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Team size picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Players per Team</label>
              <span className="text-xs opacity-40">
                {teamSizeLabel(selected.size, deriveNumTeams(selected.size, playersPerTeam))}
              </span>
            </div>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => changePpt(n)}
                  className="flex-1 py-2 rounded-xl border text-sm font-medium transition-colors"
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
          </div>

          {/* Teams grid */}
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
            onClick={() => setTeams(makeTeams(playersPerTeam))}
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
    </div>
  )
}
