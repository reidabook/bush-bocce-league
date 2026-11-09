import { useState } from 'react'
import {
  addGame, recordGameResult, clearGameResult, deleteGame,
  logDeparture, removeDeparture, addPlayerToTeam,
  excludePlayerFromGame, restorePlayerToGame,
} from '../../lib/db'

// Commissioner actions for one session. Each runs once at a time, then reloads.
export function useCommish(sessionId, reload) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function run(fn) {
    if (busy) return false
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reload()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }
  const excluded = (exclusions, gameId, playerId) => exclusions.some((e) => e.game_id === gameId && e.player_id === playerId)
  return {
    busy, error, setError, run,
    record: (gameId, teamId) => run(() => recordGameResult(gameId, teamId)),
    clear: (gameId) => run(() => clearGameResult(gameId)),
    remove: (gameId) => run(() => deleteGame(gameId)),
    add: (a, b, notes) => run(() => addGame(sessionId, a, b, notes || null)),
    toggleExclusion: (exclusions, gameId, playerId) => run(() =>
      excluded(exclusions, gameId, playerId) ? restorePlayerToGame(gameId, playerId) : excludePlayerFromGame(gameId, playerId)),
    leave: (playerId) => run(() => logDeparture(sessionId, playerId)),
    unleave: (playerId) => run(() => removeDeparture(sessionId, playerId)),
    lateArrival: (teamId, playerId) => run(() => addPlayerToTeam(sessionId, teamId, playerId)),
  }
}

