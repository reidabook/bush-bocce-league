import { describe, it, expect } from 'vitest'
import { buildChatRequest } from '../src/lib/chatClient.js'

describe('buildChatRequest', () => {
  const data = { session: { id: 's1', session_number: 3 }, teams: [{ id: 't1' }], games: [], departures: [], exclusions: [1], allPlayers: [2] }
  it('maps session data to the weekContext the API expects', () => {
    const r = buildChatRequest([{ role: 'user', content: 'Red beat Blue', extra: 1 }], data)
    expect(r.weekContext).toEqual({ week: data.session, teams: data.teams, games: [], departures: [] })
    expect(r.messages).toEqual([{ role: 'user', content: 'Red beat Blue' }])
  })
  it('null context with no session', () => {
    expect(buildChatRequest([], null).weekContext).toBeNull()
  })
})
