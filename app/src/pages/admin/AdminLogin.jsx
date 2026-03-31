import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../lib/auth'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (login(password)) {
      navigate('/admin')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="max-w-xs mx-auto pt-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">⚙</div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2F5E' }}>Commissioner Login</h1>
        <p className="text-sm opacity-50 mt-1">Enter the commissioner password to manage the league.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false) }}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
          style={{ borderColor: error ? '#ef4444' : '#e5e7eb', '--tw-ring-color': '#1B2F5E' }}
          autoFocus
        />
        {error && <p className="text-red-500 text-xs text-center">Incorrect password</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl text-white font-medium text-sm"
          style={{ backgroundColor: '#1B2F5E' }}
        >
          Enter
        </button>
      </form>
    </div>
  )
}
