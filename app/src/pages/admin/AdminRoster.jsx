import { useEffect, useState } from 'react'
import { getPlayers, addPlayer, deactivatePlayer, renamePlayer } from '../../lib/db'
import { PageTitle, Card, SkeletonList, Button, EmptyState } from '../../components/ui'

const input = 'w-full h-12 px-4 rounded-xl bg-card border border-line text-base outline-none focus:border-sky'

export default function AdminRoster() {
  const [players, setPlayers] = useState(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => getPlayers().then((p) => setPlayers([...p].sort((a, b) => a.name.localeCompare(b.name))))
  useEffect(() => { load().catch((e) => setError(e.message)) }, [])

  async function run(fn) {
    setBusy(true)
    setError(null)
    try { await fn(); await load(); return true } catch (e) { setError(e.message); return false } finally { setBusy(false) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (newName.trim() && await run(() => addPlayer(newName.trim()))) setNewName('')
  }

  async function handleRename(e) {
    e.preventDefault()
    if (editName.trim() && await run(() => renamePlayer(editingId, editName.trim()))) setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Roster">{players && <span className="text-[13px] text-muted pb-0.5">{players.length} players</span>}</PageTitle>

      <form onSubmit={handleAdd} className="flex gap-2">
        <label className="flex-1"><span className="sr-only">New player name</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New player's name" className={input} />
        </label>
        <Button type="submit" className="h-12" disabled={busy || !newName.trim()}>Add player</Button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-live-bg text-live text-sm px-3 py-2">{error}</p>}

      {!players ? <SkeletonList rows={8} height={52} /> : players.length === 0 ? (
        <EmptyState title="No players yet">Add the first name above.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {players.map((p) => (
              <li key={p.id} className="border-t border-hair first:border-t-0">
                {editingId === p.id ? (
                  <form onSubmit={handleRename} className="p-2.5 space-y-2">
                    <label><span className="sr-only">Name</span>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className={input} />
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={busy || !editName.trim()}>Save name</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" variant="danger" className="ml-auto" disabled={busy}
                        onClick={async () => {
                          if (confirm(`Remove ${p.name} from the league? They leave pickers and standings; their past games stay on record.`) && await run(() => deactivatePlayer(p.id))) setEditingId(null)
                        }}>Remove</Button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                    className="w-full flex items-center h-[52px] px-3.5 text-left">
                    <span className="flex-1 font-semibold text-base">{p.name}</span>
                    <span className="text-[13px] font-semibold text-muted">Edit</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
