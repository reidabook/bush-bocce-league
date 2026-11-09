import { useState } from 'react'
import { Card, Button } from './ui'

// Load failure with a way forward. Offers sheet setup when tabs are missing.
export default function ErrorState({ title = "Couldn't load the league", error }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const missing = String(error).includes('not found')

  async function handleInit() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/init-sheets')
      const data = await res.json()
      const created = data.sheets?.filter((s) => s.action === 'created').length ?? 0
      setResult({ ok: true, message: `Created ${created} sheet tab(s). Reloading…` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setResult({ ok: false, message: err.message })
      setBusy(false)
    }
  }

  return (
    <Card className="p-4 mt-2 space-y-3">
      <p className="font-bold text-danger">{title}</p>
      <p className="text-xs text-muted font-mono break-all">{String(error)}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => window.location.reload()}>Try again</Button>
        {missing && (
          <Button size="sm" variant="secondary" onClick={handleInit} disabled={busy}>
            {busy ? 'Setting up…' : 'Set up sheet tabs'}
          </Button>
        )}
      </div>
      {result && <p className={`text-xs ${result.ok ? 'text-muted' : 'text-danger'}`}>{result.message}</p>}
      <p className="text-xs text-muted">Connection details: <a href="/api/debug" className="underline" target="_blank" rel="noreferrer">/api/debug</a></p>
    </Card>
  )
}
