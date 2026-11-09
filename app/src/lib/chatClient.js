// Client for /api/chat (Gemini function calling). Context = the session on screen.

export function buildChatRequest(messages, data) {
  const { session, teams = [], games = [], departures = [] } = data || {}
  return {
    messages: messages.map(({ role, content }) => ({ role, content })),
    weekContext: session ? { week: session, teams, games, departures } : null,
  }
}

export async function sendChat(messages, data) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildChatRequest(messages, data)),
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json() // { reply, actionsRan }
}
