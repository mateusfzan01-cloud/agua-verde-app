import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AlertasPanel from './AlertasPanel'
import { formatarHora, getIniciais, formatarStatus } from '../utils/formatters'

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
      .select('*, motoristas(id, nome, foto_url)')
      .is('deleted_at', null)
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

    // Buscar motoristas com foto
    const { data: motoristasData, error: motoristasError } = await supabase
      .from('motoristas')
      .select('*, foto_url')
      .eq('ativo', true)

    if (motoristasError) {
      console.error('Erro ao buscar motoristas:', motoristasError)
    } else {
      setMotoristas(motoristasData || [])
    }

    setLoading(false)
  }



  function getStatusClass(status) {
    return `status-badge status-${status}`
  }


  // Componente de Avatar reutilizável
  function Avatar({ nome, fotoUrl, tamanho = 'normal' }) {
    const tamanhos = {
      small: { width: 28, height: 28, fontSize: 11 },
      normal: { width: 40, height: 40, fontSize: 14 }
    }
    const t = tamanhos[tamanho] || tamanhos.normal

    if (fotoUrl) {
      return (
        <img 
          src={fotoUrl} 
          alt={nome}
          style={{
            width: t.width,
            height: t.height,
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      )
    }

    return (
      <div 
        className={tamanho === 'small' ? 'driver-avatar-small' : 'driver-avatar'}
        style={{
          width: t.width,
          height: t.height,
          fontSize: t.fontSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {getIniciais(nome)}
      </div>
    )
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
                          <Avatar 
                            nome={viagem.motoristas.nome} 
                            fotoUrl={viagem.motoristas.foto_url} 
                            tamanho="small" 
                          />
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
          {/* Alertas do Sistema */}
          <AlertasPanel />

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
                    <Avatar 
                      nome={motorista.nome} 
                      fotoUrl={motorista.foto_url} 
                      tamanho="normal" 
                    />
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
