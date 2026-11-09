import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../../lib/chatClient'
import { Icon } from '../../components/ui'
import Sheet from '../../components/Sheet'

const HELLO = "Tell me what happened — like \"Kat's beat Colin's\", \"new game Anna's vs Kat's\" or \"Luis left\"."

// Composer docked on Tonight; the conversation opens in a sheet.
export default function Assistant({ data, reload }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [open, setOpen] = useState(false)
  const bottom = useRef(null)

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages, thinking, open])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || thinking) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setOpen(true)
    setThinking(true)
    try {
      const { reply, actionsRan } = await sendChat(next, data)
      if (actionsRan > 0) await reload()
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Couldn't reach the assistant. Try again.", error: true }])
    } finally {
      setThinking(false)
    }
  }

  const composer = (autoFocus) => (
    <form onSubmit={send} className="flex-1 flex items-center gap-2 h-12 pl-3.5 pr-1 bg-card rounded-full ring-1 ring-line focus-within:ring-sky">
      <Icon name="sparkle" size={18} className="text-muted shrink-0" />
      <input value={input} onChange={(e) => setInput(e.target.value)} autoFocus={autoFocus}
        placeholder="“Kat's beat Colin's”" aria-label="Tell the assistant what happened" enterKeyHint="send"
        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-medium placeholder:text-muted" />
      {input.trim() && (
        <button type="submit" disabled={thinking} aria-label="Send"
          className="w-10 h-10 rounded-full bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530] flex items-center justify-center disabled:opacity-40">
          <Icon name="send" size={18} />
        </button>
      )}
    </form>
  )

  return (
    <>
      {messages.length > 0 && !open ? (
        <div className="flex-1 flex gap-2 min-w-0">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open assistant conversation"
            className="w-12 h-12 shrink-0 rounded-full bg-card ring-1 ring-line flex items-center justify-center text-brand">
            <Icon name="chat" size={20} />
          </button>
          {composer(false)}
        </div>
      ) : composer(false)}

      <Sheet open={open} title="Assistant" onClose={() => setOpen(false)}
        footer={<div className="flex">{composer(true)}</div>}>
        <div className="space-y-2.5 min-h-[30svh]">
          <Bubble role="assistant">{HELLO}</Bubble>
          {messages.map((m, i) => <Bubble key={i} role={m.role} error={m.error}>{m.content}</Bubble>)}
          {thinking && (
            <div className="flex" role="status" aria-label="Assistant is thinking">
              <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-sky animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>
      </Sheet>
    </>
  )
}

function Bubble({ role, error, children }) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : ''}`}>
      <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-[15px] leading-snug
        ${mine ? 'rounded-tr-sm bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530]' : `rounded-tl-sm bg-card ${error ? 'text-danger' : ''}`}`}>
        {children}
      </div>
    </div>
  )
}
