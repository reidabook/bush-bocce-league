import { useEffect, useState } from 'react'
import { getPlayers, addPlayer, deactivatePlayer, renamePlayer } from '../../lib/db'
import Spinner from '../../components/Spinner'

export default function AdminRoster() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const p = await getPlayers()
    setPlayers(p)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await addPlayer(newName)
      setNewName('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id, name) {
    if (!confirm(`Remove ${name} from the roster?`)) return
    try {
      await deactivatePlayer(id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  function startEdit(player) {
    setEditingId(player.id)
    setEditName(player.name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)
    try {
      await renamePlayer(editingId, editName)
      setEditingId(null)
      setEditName('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>Roster</h1>
        <p className="text-xs opacity-50 mt-1">{players.length} active players</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Add player */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Player name"
          className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
          style={{ borderColor: '#e5e7eb' }}
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="px-4 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: '#1B2F5E' }}
        >
          Add
        </button>
      </form>

      {/* Player list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {players.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-8">No players yet.</p>
        ) : (
          players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-4 py-3 border-b last:border-0"
            >
              {editingId === p.id ? (
                <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded border text-sm outline-none focus:ring-2"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <button
                    type="submit"
                    disabled={saving || !editName.trim()}
                    className="text-xs font-medium disabled:opacity-40"
                    style={{ color: '#1B2F5E' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="font-medium text-sm flex-1">{p.name}</div>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs text-blue-400 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(p.id, p.name)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
