import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <svg viewBox="0 0 180 60" className="logo-img">
          <polygon points="30,10 50,50 30,40" fill="#4cb963"/>
          <polygon points="30,10 10,50 30,40" fill="#1a5c38"/>
          <text x="60" y="32" fill="white" fontSize="18" fontWeight="bold" fontFamily="Inter, sans-serif">
            ÁGUA <tspan fill="#4cb963">VERDE</tspan>
          </text>
          <text x="60" y="46" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="1">
            VIAGENS &amp; RECEPTIVOS
          </text>
        </svg>
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
      </ul>

      <div className="user-info">
        <div className="user-avatar">JC</div>
        <div className="user-details">
          <div className="user-name">João Carlos</div>
          <div className="user-role">Administrador</div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
