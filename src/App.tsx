import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import Funil from '@/pages/Funil'
import Leads from '@/pages/Leads'
import Whatsapp from '@/pages/Whatsapp'
import Placeholder from '@/pages/Placeholder'
import { AppLayout } from '@/components/layout/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/cadastro" element={<Signup />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="funil" element={<Funil />} />
        <Route path="leads" element={<Leads />} />
        <Route path="chat" element={<Whatsapp />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
