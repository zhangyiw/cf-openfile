import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Room from './pages/Room'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/room/:key" element={<Room />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
