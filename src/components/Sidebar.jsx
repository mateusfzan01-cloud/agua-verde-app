import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getIniciais } from '../utils/formatters'
import { useAlertas } from '../contexts/AlertasContext'

function Sidebar() {
  const { perfil, logout } = useAuth()
  const { contador } = useAlertas()

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <img src="/logo-agua-verde.jpg" alt="Agua Verde" style={{ maxWidth: '180px', height: 'auto' }} />
      </div>

      <ul className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/viagens" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
            <path d="M9 17h6"/>
          </svg>
          <span>Viagens</span>
        </NavLink>
        
        <NavLink to="/motoristas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Motoristas</span>
        </NavLink>

        <NavLink to="/relatorios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path d="M21 21H3V3h18v18z" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 14v4M11 10v8M15 6v12M19 3v15" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>Relatorios</span>
        </NavLink>

        <NavLink to="/alertas" className={({ isActive }) => `nav-item nav-item-alertas ${isActive ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Alertas</span>
          {contador > 0 && (
            <span className="nav-badge">{contador > 99 ? '99+' : contador}</span>
          )}
        </NavLink>
      </ul>

      <div className="user-info">
        <NavLink to="/perfil" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'white', flex: 1 }}>
          <div className="user-avatar">{getIniciais(perfil?.nome)}</div>
          <div className="user-details">
            <div className="user-name">{perfil?.nome || 'Usuario'}</div>
            <div className="user-role">{perfil?.tipo === 'admin' ? 'Administrador' : 'Gerente'}</div>
          </div>
        </NavLink>
        <button onClick={logout} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px'
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: 'rgba(255,255,255,0.7)', strokeWidth: 2, fill: 'none' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar