import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SessionList from './pages/SessionList'
import Session from './pages/Session'
import Tournament from './pages/Tournament'
import Rules from './pages/Rules'
import AdminLogin from './pages/admin/AdminLogin'
import AdminRoster from './pages/admin/AdminRoster'
import AdminNewSession from './pages/admin/AdminNewSession'
import AdminTournament from './pages/admin/AdminTournament'
import { isAdmin } from './lib/auth'

function RequireAdmin({ children }) {
  return isAdmin() ? children : <Navigate to="/admin/login" replace />
}

function SessionRedirect() {
  const { id } = useParams()
  return <Navigate to={`/sessions/${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/sessions" element={<Layout><SessionList /></Layout>} />
      <Route path="/sessions/:id" element={<Layout><Session /></Layout>} />
      <Route path="/tournament" element={<Layout><Tournament /></Layout>} />
      <Route path="/tonight" element={<Layout><Session tonight /></Layout>} />
      <Route path="/active" element={<Navigate to="/tonight" replace />} />
      <Route path="/rules" element={<Layout><Rules /></Layout>} />
      <Route path="/admin/login" element={<Layout><AdminLogin /></Layout>} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAdmin><Navigate to="/?commish=1" replace /></RequireAdmin>} />
      <Route path="/admin/roster" element={<RequireAdmin><Layout><AdminRoster /></Layout></RequireAdmin>} />
      <Route path="/admin/sessions/new" element={<RequireAdmin><AdminNewSession /></RequireAdmin>} />
      <Route path="/admin/sessions/:id" element={<SessionRedirect />} />
      <Route path="/admin/tournament" element={<RequireAdmin><Layout><AdminTournament /></Layout></RequireAdmin>} />
      <Route path="/admin/chat" element={<Navigate to="/tonight" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
