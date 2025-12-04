import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Viagens() {
  const [viagens, setViagens] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    busca: '',
    data: '',
    status: '',
    motorista: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchMotoristas()
    fetchViagens()
  }, [])

  async function fetchMotoristas() {
    const { data } = await supabase
      .from('motoristas')
      .select('*')
      .eq('ativo', true)
    setMotoristas(data || [])
  }

  async function fetchViagens() {
    setLoading(true)

    let query = supabase
      .from('viagens')
      .select('*, motoristas(id, nome)')
      .is('deleted_at', null)
      .order('data_hora', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar viagens:', error)
    } else {
      setViagens(data || [])
    }

    setLoading(false)
  }

  function aplicarFiltros() {
    let resultado = [...viagens]

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase()
      resultado = resultado.filter(v =>
        (v.passageiro_nome ?? '').toLowerCase().includes(busca) ||
        (v.passageiro_telefone ?? '').includes(busca)
      )
    }

    if (filtros.data) {
      resultado = resultado.filter(v => 
        v.data_hora.startsWith(filtros.data)
      )
    }

    if (filtros.status) {
      resultado = resultado.filter(v => v.status === filtros.status)
    }

    if (filtros.motorista) {
      if (filtros.motorista === 'sem') {
        resultado = resultado.filter(v => !v.motorista_id)
      } else {
        resultado = resultado.filter(v => v.motorista_id === filtros.motorista)
      }
    }

    return resultado
  }

  function limparFiltros() {
    setFiltros({ busca: '', data: '', status: '', motorista: '' })
  }

  function formatarDataHora(dataHora) {
    const data = new Date(dataHora)
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  function getIniciais(nome) {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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

  const viagensFiltradas = aplicarFiltros()

  return (
    <>
      <header className="header">
        <h1 className="page-title">Viagens</h1>
        <Link to="/viagens/nova" className="btn btn-primary">
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Viagem
        </Link>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filters-row">
          <div className="filter-group flex-1">
            <label className="filter-label">Buscar</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Nome do passageiro, telefone..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Data</label>
            <input
              type="date"
              className="filter-input"
              value={filtros.data}
              onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="vinculada">Vinculada</option>
              <option value="a_caminho">A Caminho</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Motorista</label>
            <select
              className="filter-select"
              value={filtros.motorista}
              onChange={(e) => setFiltros({ ...filtros, motorista: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="sem">Sem motorista</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={limparFiltros}>
            Limpar
          </button>
        </div>
      </div>

      {/* Results */}
      <p style={{ marginBottom: 16, color: 'var(--cinza-texto)', fontSize: 14 }}>
        Exibindo <strong style={{ color: 'var(--preto)' }}>{viagensFiltradas.length}</strong> viagens
      </p>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : viagensFiltradas.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--cinza-texto)' }}>
            Nenhuma viagem encontrada
          </div>
        ) : (
          <table className="trips-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data/Hora</th>
                <th>Passageiro</th>
                <th>Trajeto</th>
                <th>Motorista</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {viagensFiltradas.map((viagem) => {
                const { data, hora } = formatarDataHora(viagem.data_hora)
                return (
                  <tr key={viagem.id} onClick={() => navigate(`/viagens/${viagem.id}`)}>
                    <td><span style={{ fontWeight: 600, color: 'var(--verde-escuro)', fontSize: 13 }}>#{viagem.id}</span></td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{data}</div>
                        <div style={{ color: 'var(--cinza-texto)', fontSize: 13 }}>{hora}</div>
                      </div>
                    </td>
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
                      <span className={`status-badge status-${viagem.status}`}>
                        {formatarStatus(viagem.status)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export default Viagens
