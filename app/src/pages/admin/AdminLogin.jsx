import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../lib/auth'
import { Button } from '../../components/ui'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (login(password)) {
      navigate('/?commish=1', { replace: true })
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="max-w-xs mx-auto pt-8">
      <div className="text-center mb-7">
        <img src="/logo-192.png" alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-sm" />
        <h1 className="font-display font-black text-[34px] leading-none text-brand">Commissioner</h1>
        <p className="text-[15px] text-muted mt-2">Log in to run sessions and keep score.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="sr-only">Password</span>
          <input type="password" value={password} autoFocus autoComplete="current-password"
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password" aria-invalid={error} aria-describedby={error ? 'login-error' : undefined}
            className={`w-full h-14 px-4 rounded-2xl bg-card border text-base outline-none focus:border-sky ${error ? 'border-danger' : 'border-line'}`} />
        </label>
        {error && <p id="login-error" className="text-sm text-danger">That password didn't work.</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!password}>Log in</Button>
      </form>
    </div>
  )
}
