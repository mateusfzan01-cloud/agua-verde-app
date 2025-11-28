import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Viagens from './components/Viagens'
import NovaViagem from './components/NovaViagem'
import DetalheViagem from './components/DetalheViagem'
import Motoristas from './components/Motoristas'
import Login from './components/Login'
import MotoristaApp from './components/MotoristaApp'
import Perfil from './components/Perfil'
import EditarViagem from './components/EditarViagem'
import AcompanharViagem from './components/AcompanharViagem'


function AppContent() {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  // Não logado -> tela de login
  if (!user) {
    return <Login />
  }

  // Sem perfil ainda -> aguardar
  if (!perfil) {
    return (
      <div className="loading-screen">
        <p>Configurando perfil...</p>
      </div>
    )
  }

  // Motorista -> app mobile
  if (perfil.tipo === 'motorista') {
    return <MotoristaApp />
  }

  // Admin ou Gerente -> app desktop
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
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/viagens/:id/editar" element={<EditarViagem />} />
          <Route path="/acompanhar/:token" element={<AcompanharViagem />} />

        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
