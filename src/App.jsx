import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Viagens from './components/Viagens'
import NovaViagem from './components/NovaViagem'
import DetalheViagem from './components/DetalheViagem'
import Motoristas from './components/Motoristas'

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/viagens" element={<Viagens />} />
          <Route path="/viagens/nova" element={<NovaViagem />} />
          <Route path="/viagens/:id" element={<DetalheViagem />} />
          <Route path="/motoristas" element={<Motoristas />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
