import { useEffect, useState } from 'react'
import { getSessions } from './db'

// Shared, briefly cached lookup of the active session so the tab bar's live dot
// doesn't cost an extra Sheets call on every navigation.
let cache = { at: 0, promise: null }
const TTL_MS = 60_000

export function fetchSessionsCached({ force = false } = {}) {
  if (force || !cache.promise || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), promise: getSessions().catch((e) => { cache = { at: 0, promise: null }; throw e }) }
  }
  return cache.promise
}

export function invalidateSessionsCache() {
  cache = { at: 0, promise: null }
}

export function useActiveSession() {
  const [active, setActive] = useState(null)
  useEffect(() => {
    let alive = true
    fetchSessionsCached()
      .then((s) => { if (alive) setActive(s.find((x) => x.status === 'active') || null) })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return active
}
