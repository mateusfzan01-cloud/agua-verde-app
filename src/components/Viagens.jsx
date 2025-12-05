import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { formatarDataHora, getIniciais, formatarStatus } from '../utils/formatters'

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
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(50)
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
    setPaginaAtual(1)
  }

  function handleFiltroChange(novosFiltros) {
    setFiltros(novosFiltros)
    setPaginaAtual(1)
  }

  function handleItensPorPaginaChange(valor) {
    setItensPorPagina(valor)
    setPaginaAtual(1)
  }

  const viagensFiltradas = aplicarFiltros()
  const totalPaginas = Math.ceil(viagensFiltradas.length / itensPorPagina)
  const indiceInicial = (paginaAtual - 1) * itensPorPagina
  const indiceFinal = indiceInicial + itensPorPagina
  const viagensPaginadas = viagensFiltradas.slice(indiceInicial, indiceFinal)

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
              onChange={(e) => handleFiltroChange({ ...filtros, busca: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Data</label>
            <input
              type="date"
              className="filter-input"
              value={filtros.data}
              onChange={(e) => handleFiltroChange({ ...filtros, data: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filtros.status}
              onChange={(e) => handleFiltroChange({ ...filtros, status: e.target.value })}
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
              onChange={(e) => handleFiltroChange({ ...filtros, motorista: e.target.value })}
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

      {/* Results and Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: 'var(--cinza-texto)', fontSize: 14, margin: 0 }}>
          {viagensFiltradas.length === 0 ? (
            <>Nenhuma viagem encontrada</>
          ) : (
            <>Exibindo <strong style={{ color: 'var(--preto)' }}>{indiceInicial + 1}-{Math.min(indiceFinal, viagensFiltradas.length)}</strong> de <strong style={{ color: 'var(--preto)' }}>{viagensFiltradas.length}</strong> viagens</>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 14, color: 'var(--cinza-texto)' }}>Itens por página:</label>
          <select
            className="filter-select"
            value={itensPorPagina}
            onChange={(e) => handleItensPorPaginaChange(Number(e.target.value))}
            style={{ minWidth: 70 }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : viagensPaginadas.length === 0 ? (
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
              {viagensPaginadas.map((viagem) => {
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

      {/* Pagination Navigation */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            style={{ minWidth: 100 }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 14, color: 'var(--cinza-texto)' }}>
            Página <strong style={{ color: 'var(--preto)' }}>{paginaAtual}</strong> de <strong style={{ color: 'var(--preto)' }}>{totalPaginas}</strong>
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            style={{ minWidth: 100 }}
          >
            Próxima →
          </button>
        </div>
      )}
    </>
  )
}

export default Viagens
