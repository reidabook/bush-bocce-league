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

function buildTeams(players) {
  const shuffled = shuffle(players)
  const teams = [{ name: 'Red Team', players: [] }, { name: 'Blue Team', players: [] }]
  shuffled.forEach((p, i) => { teams[i % 2].players.push(p) })
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

  function makeTeams() {
    const attending = allPlayers.filter((p) => selected.has(p.id))
    return buildTeams(attending)
  }

  function swapPlayer(player, fromTeamIndex) {
    const toTeamIndex = fromTeamIndex === 0 ? 1 : 0
    setTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }))
      next[fromTeamIndex].players = next[fromTeamIndex].players.filter((p) => p.id !== player.id)
      next[toTeamIndex].players.push(player)
      return next
    })
  }

  function goToStep2() {
    if (selected.size < 2) {
      setError('Select at least 2 players.')
      return
    }
    setError(null)
    setTeams(makeTeams())
    setStep(2)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const weeks = await getWeeks()
      const weekNumber = weeks.length + 1
      const week = await createWeek(weekNumber, date, 2)
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
          <div className="text-xs opacity-40">{selected.size} players · 2 teams</div>

          {/* Teams grid */}
          <div className="grid grid-cols-2 gap-2">
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
            onClick={() => setTeams(makeTeams())}
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
