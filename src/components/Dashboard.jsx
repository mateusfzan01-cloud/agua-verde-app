import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Dashboard() {
  const [viagens, setViagens] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [stats, setStats] = useState({ total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    
    // Buscar viagens de hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const { data: viagensData, error: viagensError } = await supabase
      .from('viagens')
      .select('*, motoristas(id, nome)')
      .gte('data_hora', hoje.toISOString())
      .lt('data_hora', amanha.toISOString())
      .order('data_hora', { ascending: true })

    if (viagensError) {
      console.error('Erro ao buscar viagens:', viagensError)
    } else {
      setViagens(viagensData || [])
      
      // Calcular stats
      const total = viagensData?.length || 0
      const pendentes = viagensData?.filter(v => v.status === 'pendente').length || 0
      const emAndamento = viagensData?.filter(v => ['a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status)).length || 0
      const concluidas = viagensData?.filter(v => v.status === 'concluida').length || 0
      
      setStats({ total, pendentes, emAndamento, concluidas })
    }

    // Buscar motoristas
    const { data: motoristasData, error: motoristasError } = await supabase
      .from('motoristas')
      .select('*')
      .eq('ativo', true)

    if (motoristasError) {
      console.error('Erro ao buscar motoristas:', motoristasError)
    } else {
      setMotoristas(motoristasData || [])
    }

    setLoading(false)
  }

  function formatarHora(dataHora) {
    return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getIniciais(nome) {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  function getStatusClass(status) {
    return `status-badge status-${status}`
  }

  function formatarStatus(status) {
    const statusMap = {
      'pendente': 'Pendente',
      'vinculada': 'Vinculada',
      'a_caminho': 'A Caminho',
      'aguardando_passageiro': 'Aguardando',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada'
    }
    return statusMap[status] || status
  }

  const dataHoje = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <>
      <header className="header">
        <p className="header-date" style={{ textTransform: 'capitalize' }}>{dataHoje}</p>
        <Link to="/viagens/nova" className="btn btn-primary">
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Viagem
        </Link>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Viagens Hoje</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card alert">
          <div className="stat-label">Pendentes</div>
          <div className="stat-value">{stats.pendentes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Em Andamento</div>
          <div className="stat-value">{stats.emAndamento}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Concluídas</div>
          <div className="stat-value">{stats.concluidas}</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Trips Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Viagens de Hoje</h2>
            <Link to="/viagens" className="card-link">Ver todas →</Link>
          </div>
          {viagens.length === 0 ? (
            <div className="card-body">
              <p style={{ color: 'var(--cinza-texto)', textAlign: 'center', padding: '20px' }}>
                Nenhuma viagem para hoje
              </p>
            </div>
          ) : (
            <table className="trips-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Passageiro</th>
                  <th>Trajeto</th>
                  <th>Motorista</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {viagens.slice(0, 5).map((viagem) => (
                  <tr key={viagem.id} onClick={() => navigate(`/viagens/${viagem.id}`)}>
                    <td><strong>{formatarHora(viagem.data_hora)}</strong></td>
                    <td>
                      <div className="passenger-info">
                        <span className="passenger-name">{viagem.passageiro_nome}</span>
                        <span className="passenger-phone">{viagem.passageiro_telefone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="route">
                        <span className="route-from">{viagem.origem} →</span>
                        <span className="route-to">{viagem.destino}</span>
                      </div>
                    </td>
                    <td>
                      {viagem.motoristas ? (
                        <div className="driver-cell">
                          <div className="driver-avatar-small">{getIniciais(viagem.motoristas.nome)}</div>
                          <span>{viagem.motoristas.nome.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="no-driver">— Sem motorista</span>
                      )}
                    </td>
                    <td>
                      <span className={getStatusClass(viagem.status)}>
                        {formatarStatus(viagem.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Alertas</h2>
            </div>
            <div className="alerts-list">
              {viagens.filter(v => v.status === 'pendente').length > 0 ? (
                viagens.filter(v => v.status === 'pendente').map(v => (
                  <div key={v.id} className="alert-item danger">
                    <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div className="alert-content">
                      <div className="alert-title">Viagem sem motorista</div>
                      <div className="alert-desc">{v.passageiro_nome} - {formatarHora(v.data_hora)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert-item info">
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="var(--verde-claro)" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <div className="alert-content">
                    <div className="alert-title">Tudo em ordem!</div>
                    <div className="alert-desc">Todas as viagens têm motorista</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drivers Status */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Motoristas</h2>
              <Link to="/motoristas" className="card-link">Ver todos →</Link>
            </div>
            <div className="drivers-list">
              {motoristas.map((motorista) => {
                const viagensMotorista = viagens.filter(v => v.motorista_id === motorista.id)
                const emViagem = viagensMotorista.some(v => ['a_caminho', 'em_andamento'].includes(v.status))
                
                return (
                  <div key={motorista.id} className="driver-item">
                    <div className="driver-avatar">{getIniciais(motorista.nome)}</div>
                    <div className="driver-info">
                      <div className="driver-name">{motorista.nome}</div>
                      <div className="driver-trips">{viagensMotorista.length} viagens hoje</div>
                    </div>
                    <div className={`driver-status ${emViagem ? 'busy' : 'available'}`} title={emViagem ? 'Em viagem' : 'Disponível'}></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
