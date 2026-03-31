import { useEffect, useRef, useState } from 'react'
import { getWeeks, getTeamsForWeek, getGamesForWeek, getDepartures } from '../../lib/db'
import Spinner from '../../components/Spinner'

const WELCOME = "Hey! I'm your bocce assistant. Tell me what happened — like \"Red beat Blue\" or \"log Red vs Green\"."

export default function AdminChat() {
  const [weekCtx, setWeekCtx] = useState(null)   // { week, teams, games }
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [messages, setMessages] = useState([])    // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadContext()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function loadContext() {
    try {
      const weeks = await getWeeks()
      const active = weeks.find((w) => w.status === 'active')
      if (!active) {
        setWeekCtx(null)
        return
      }
      const [teams, games, departures] = await Promise.all([
        getTeamsForWeek(active.id),
        getGamesForWeek(active.id),
        getDepartures(active.id),
      ])
      setWeekCtx({ week: active, teams, games, departures })
    } catch (e) {
      console.error('Failed to load context:', e)
    } finally {
      setLoadingCtx(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || thinking) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setThinking(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, weekContext: weekCtx }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const { reply, actionsRan } = await res.json()

      // If the agent executed any DB actions, reload the context so it stays fresh
      if (actionsRan > 0) {
        await loadContext()
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Try again.' },
      ])
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  if (loadingCtx) return <Spinner />

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 190px)' }}>
      {/* Header */}
      <div className="mb-3 flex-shrink-0">
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          AI Assistant
        </h1>
        {weekCtx && (
          <div className="text-xs opacity-40 mt-0.5">
            Week {weekCtx.week.week_number} · {weekCtx.teams.length} teams · {weekCtx.games.length} games logged
            {weekCtx.departures?.length > 0 && ` · ${weekCtx.departures.length} left early`}
          </div>
        )}
      </div>

      {!weekCtx ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-4xl">🎯</div>
            <div className="text-sm font-medium opacity-50">No active session</div>
            <div className="text-xs opacity-30">Start a new session from the admin panel first.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-2">
            <AssistantBubble content={WELCOME} />

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserBubble key={i} content={m.content} />
              ) : (
                <AssistantBubble key={i} content={m.content} />
              )
            )}

            {thinking && <ThinkingBubble />}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 pt-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Red beat Blue"
              className="flex-1 px-4 py-3 rounded-2xl border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
              disabled={thinking}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="px-4 py-3 rounded-2xl text-white text-sm font-medium disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function AssistantBubble({ content }) {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-sm leading-relaxed"
        style={{ backgroundColor: 'white', color: '#1B2F5E' }}
      >
        {content}
      </div>
    </div>
  )
}

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
        style={{ backgroundColor: '#1B2F5E' }}
      >
        {content}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center"
        style={{ backgroundColor: 'white' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ backgroundColor: '#89B4D0', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
