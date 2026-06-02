import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SessionList from './pages/SessionList'
import SessionDetail from './pages/SessionDetail'
import Tournament from './pages/Tournament'
import Rules from './pages/Rules'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRoster from './pages/admin/AdminRoster'
import AdminNewSession from './pages/admin/AdminNewSession'
import AdminSessionManage from './pages/admin/AdminSessionManage'
import AdminTournament from './pages/admin/AdminTournament'
import AdminChat from './pages/admin/AdminChat'
import ActiveSession from './pages/ActiveSession'
import { isAdmin } from './lib/auth'

function RequireAdmin({ children }) {
  return isAdmin() ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/sessions" element={<Layout><SessionList /></Layout>} />
      <Route path="/sessions/:id" element={<Layout><SessionDetail /></Layout>} />
      <Route path="/tournament" element={<Layout><Tournament /></Layout>} />
      <Route path="/active" element={<Layout><ActiveSession /></Layout>} />
      <Route path="/rules" element={<Layout><Rules /></Layout>} />
      <Route path="/admin/login" element={<Layout><AdminLogin /></Layout>} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAdmin><Layout><AdminDashboard /></Layout></RequireAdmin>} />
      <Route path="/admin/roster" element={<RequireAdmin><Layout><AdminRoster /></Layout></RequireAdmin>} />
      <Route path="/admin/sessions/new" element={<RequireAdmin><Layout><AdminNewSession /></Layout></RequireAdmin>} />
      <Route path="/admin/sessions/:id" element={<RequireAdmin><Layout><AdminSessionManage /></Layout></RequireAdmin>} />
      <Route path="/admin/tournament" element={<RequireAdmin><Layout><AdminTournament /></Layout></RequireAdmin>} />
      <Route path="/admin/chat" element={<RequireAdmin><Layout><AdminChat /></Layout></RequireAdmin>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
