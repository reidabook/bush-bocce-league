// Commissioner-only controls for the Session screen (ADR 0001).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateSessionStatus, updateSessionDate, deleteSession } from '../../lib/db'
import { invalidateSessionsCache } from '../../lib/useActiveSession'
import { sittingOut, closeWarning, gameMatchup, unassignedPlayers } from '../../lib/gameFlow'
import { shortTeamName } from '../../lib/teamColors'
import { Button, Card, Icon, SectionLabel } from '../../components/ui'
import Ball from '../../components/Ball'
import Sheet from '../../components/Sheet'

function WinnerButton({ team, color, picked, disabled, onClick, big }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={picked}
      className={`flex-1 min-w-0 flex items-center gap-2.5 ${big ? 'h-16' : 'h-14'} px-3.5 rounded-[14px] border-2 font-bold text-[17px] text-left transition-colors disabled:opacity-50
        ${picked ? 'border-[#1B2F5E] bg-select dark:border-sky' : 'border-line bg-card'}`}>
      <Ball color={color} size={big ? 30 : 24} />
      <span className="truncate">{shortTeamName(team.name)}</span>
    </button>
  )
}

function PlayerChips({ game, teams, exclusions, colorOf, onToggle, disabled }) {
  const playing = teams.filter((t) => t.id === game.team_a_id || t.id === game.team_b_id)
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] text-muted">Tap anyone who didn't play this game</p>
      <div className="flex flex-wrap gap-1.5">
        {playing.flatMap((t) => t.players.map((p) => {
          const out = exclusions.some((e) => e.game_id === game.id && e.player_id === p.id)
          return (
            <button key={p.id} type="button" disabled={disabled} aria-pressed={out}
              aria-label={`${p.name}${out ? ' — sat out, tap to restore' : ''}`}
              onClick={() => onToggle(p.id)}
              className={`h-9 px-3 rounded-full border-[1.5px] bg-card inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50
                ${out ? 'border-dashed border-line text-muted line-through' : 'border-line'}`}>
              <Ball color={colorOf(t.id)} size={10} />{p.name}
            </button>
          )
        }))}
      </div>
    </div>
  )
}

export function PendingGameCard({ game, number, teams, exclusions, colorOf, c }) {
  const a = teams.find((t) => t.id === game.team_a_id)
  const b = teams.find((t) => t.id === game.team_b_id)
  if (!a || !b) return null
  const out = sittingOut(teams, game)
  return (
    <Card className="p-3.5 space-y-3 ring-2 ring-[#1B2F5E] dark:ring-sky">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display font-extrabold text-xl text-brand">Game {number} · Who won?</span>
        {out.length > 0 && <span className="text-[13px] text-muted truncate">{out.map((t) => shortTeamName(t.name)).join(', ')} sit{out.length === 1 ? 's' : ''} out</span>}
      </div>
      <div className="flex gap-2">
        {[a, b].map((t) => (
          <WinnerButton key={t.id} big team={t} color={colorOf(t.id)} disabled={c.busy} onClick={() => c.record(game.id, t.id)} />
        ))}
      </div>
      <PlayerChips game={game} teams={teams} exclusions={exclusions} colorOf={colorOf} disabled={c.busy}
        onToggle={(pid) => c.toggleExclusion(exclusions, game.id, pid)} />
    </Card>
  )
}

export function UndoBar({ text, onUndo, onDismiss, busy }) {
  return (
    <div role="status" className="flex items-center gap-2 bg-select rounded-xl pl-3 pr-1 py-1 text-sm">
      <span className="flex-1"><strong>{text}</strong></span>
      <button type="button" onClick={onUndo} disabled={busy} className="h-9 px-2 font-bold text-brand">Undo</button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="h-9 w-9 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
    </div>
  )
}

export function GameSheet({ game, number, teams, exclusions, colorOf, c, onClose }) {
  if (!game) return null
  const a = teams.find((t) => t.id === game.team_a_id)
  const b = teams.find((t) => t.id === game.team_b_id)
  return (
    <Sheet open title={`Game ${number}`} onClose={onClose}>
      {a && b && (
        <>
          <div>
            <SectionLabel>Winner</SectionLabel>
            <div className="flex gap-2">
              {[a, b].map((t) => (
                <WinnerButton key={t.id} team={t} color={colorOf(t.id)} picked={game.winner_team_id === t.id} disabled={c.busy}
                  onClick={() => (game.winner_team_id === t.id ? null : c.record(game.id, t.id))} />
              ))}
            </div>
            {game.winner_team_id && (
              <Button variant="ghost" size="sm" className="mt-1 -ml-2" disabled={c.busy} onClick={() => c.clear(game.id)}>Clear result</Button>
            )}
          </div>
          <PlayerChips game={game} teams={teams} exclusions={exclusions} colorOf={colorOf} disabled={c.busy}
            onToggle={(pid) => c.toggleExclusion(exclusions, game.id, pid)} />
        </>
      )}
      {game.notes && <p className="text-sm text-muted italic">{game.notes}</p>}
      <Button variant="danger" className="w-full" disabled={c.busy}
        onClick={async () => { if (confirm(`Delete game ${number}? Its points come off everyone's total.`) && await c.remove(game.id)) onClose() }}>
        <Icon name="trash" size={18} /> Delete game
      </Button>
    </Sheet>
  )
}

export function AddGameSheet({ open, teams, colorOf, c, onClose }) {
  const [picked, setPicked] = useState([])
  const [notes, setNotes] = useState('')
  const matchup = gameMatchup(teams, picked)
  function toggle(id) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]))
  }
  async function submit(e) {
    e.preventDefault()
    if (!matchup) return
    if (await c.add(matchup[0], matchup[1], notes.trim())) { setPicked([]); setNotes(''); onClose() }
  }
  return (
    <Sheet open={open} title="New game" onClose={onClose}
      footer={<Button size="lg" className="w-full" type="submit" form="add-game" disabled={!matchup || c.busy}>{c.busy ? 'Adding…' : 'Add game'}</Button>}>
      <form id="add-game" onSubmit={submit} className="space-y-4">
        {teams.length > 2 && (
          <div>
            <SectionLabel right={`${picked.length} of 2`}>Who's playing?</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((t) => (
                <WinnerButton key={t.id} team={t} color={colorOf(t.id)} picked={picked.includes(t.id)} onClick={() => toggle(t.id)} />
              ))}
            </div>
          </div>
        )}
        <label className="block">
          <span className="text-xs font-bold tracking-[.12em] uppercase text-muted">Note (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. played to 7"
            className="mt-1.5 w-full h-12 px-4 rounded-xl bg-card border border-line text-base outline-none focus:border-sky" />
        </label>
      </form>
    </Sheet>
  )
}

export function TeamsSheet({ open, teams, departures, allPlayers, colorOf, c, onClose }) {
  const [addingTo, setAddingTo] = useState(null)
  const left = new Set(departures.map((d) => d.player_id))
  const free = unassignedPlayers(allPlayers, teams)
  return (
    <Sheet open={open} title="Teams & who left" onClose={onClose}>
      <p className="text-[13px] text-muted">"Left early" stops a player earning points in any game after now.</p>
      {teams.map((t) => (
        <Card key={t.id} className="overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <Ball color={colorOf(t.id)} size={22} />
            <span className="font-display font-extrabold text-lg text-brand flex-1">{t.name}</span>
          </div>
          <ul>
            {t.players.map((p) => {
              const gone = left.has(p.id)
              return (
                <li key={p.id} className="flex items-center gap-2 pl-3.5 pr-2 h-12 border-t border-hair">
                  <span className={`flex-1 font-semibold ${gone ? 'text-muted line-through' : ''}`}>{p.name}</span>
                  {gone
                    ? <Button size="sm" variant="ghost" disabled={c.busy} onClick={() => c.unleave(p.id)}>Undo</Button>
                    : <Button size="sm" variant="secondary" disabled={c.busy} onClick={() => c.leave(p.id)}>Left early</Button>}
                </li>
              )
            })}
          </ul>
          {free.length > 0 && (
            addingTo === t.id ? (
              <div className="border-t border-hair p-3 space-y-2">
                <p className="text-[13px] text-muted">Add to {shortTeamName(t.name)}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {free.map((p) => (
                    <button key={p.id} type="button" disabled={c.busy}
                      onClick={async () => { if (await c.lateArrival(t.id, p.id)) setAddingTo(null) }}
                      className="h-9 px-3 rounded-full border-[1.5px] border-line bg-card text-sm font-semibold disabled:opacity-50">{p.name}</button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)}>Cancel</Button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingTo(t.id)}
                className="w-full h-12 border-t border-hair text-sm font-bold text-brand flex items-center justify-center gap-1.5">
                <Icon name="plus" size={16} /> Add late arrival
              </button>
            )
          )}
        </Card>
      ))}
    </Sheet>
  )
}

export function OptionsSheet({ open, session, games, c, onClose }) {
  const navigate = useNavigate()
  const [date, setDate] = useState(session.date)
  const active = session.status === 'active'
  async function closeOrReopen() {
    if (active) {
      const warn = closeWarning(games)
      if (warn && !confirm(warn)) return
    }
    const ok = await c.run(() => updateSessionStatus(session.id, active ? 'completed' : 'active'))
    if (ok) {
      invalidateSessionsCache()
      onClose()
      navigate(`/sessions/${session.id}`)
    }
  }
  async function remove() {
    if (!confirm(`Delete Session ${session.session_number}? This permanently removes its teams, games and results.`)) return
    if (await c.run(() => deleteSession(session.id))) {
      invalidateSessionsCache()
      navigate('/sessions')
    }
  }
  return (
    <Sheet open={open} title={`Session ${session.session_number}`} onClose={onClose}>
      <form className="flex items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (date && await c.run(() => updateSessionDate(session.id, date))) onClose() }}>
        <label className="flex-1">
          <span className="text-xs font-bold tracking-[.12em] uppercase text-muted">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 w-full h-12 px-4 rounded-xl bg-card border border-line text-base outline-none focus:border-sky" />
        </label>
        <Button type="submit" variant="secondary" className="h-12" disabled={c.busy || date === session.date}>Save date</Button>
      </form>
      <Button size="lg" className="w-full" disabled={c.busy} onClick={closeOrReopen}>
        {active ? 'Close session' : 'Reopen session'}
      </Button>
      {active && <p className="text-[13px] text-muted -mt-2">Closing adds tonight's points to the standings. You can reopen it later.</p>}
      <Button variant="danger" className="w-full" disabled={c.busy} onClick={remove}>
        <Icon name="trash" size={18} /> Delete session
      </Button>
    </Sheet>
  )
}
