import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function MotoristaApp() {
  const { perfil, logout } = useAuth()
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [showOcorrencia, setShowOcorrencia] = useState(null)
  const [ocorrenciaForm, setOcorrenciaForm] = useState({ tipo: 'outro', descricao: '' })

  useEffect(() => {
    if (perfil?.motorista_id) {
      fetchViagens()
    }
  }, [perfil, dataAtual])

  async function fetchViagens() {
    setLoading(true)
    
    const inicio = new Date(dataAtual)
    inicio.setHours(0, 0, 0, 0)
    const fim = new Date(dataAtual)
    fim.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString())
      .order('data_hora', { ascending: true })

    if (error) {
      console.error('Erro ao buscar viagens:', error)
    } else {
      setViagens(data || [])
    }
    setLoading(false)
  }

  async function atualizarStatus(viagemId, novoStatus) {
    const { error } = await supabase
      .from('viagens')
      .update({ status: novoStatus })
      .eq('id', viagemId)

    if (error) {
      alert('Erro ao atualizar status')
    } else {
      await supabase.from('ocorrencias').insert([{
        viagem_id: viagemId,
        tipo: 'alteracao_status',
        descricao: `Motorista alterou status para: ${formatarStatus(novoStatus)}`
      }])
      fetchViagens()
    }
  }

  async function salvarOcorrencia(viagemId) {
    const { error } = await supabase.from('ocorrencias').insert([{
      viagem_id: viagemId,
      tipo: ocorrenciaForm.tipo,
      descricao: ocorrenciaForm.descricao
    }])

    if (error) {
      alert('Erro ao registrar ocorrência')
    } else {
      setOcorrenciaForm({ tipo: 'outro', descricao: '' })
      setShowOcorrencia(null)
    }
  }

  function mudarData(dias) {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() + dias)
    setDataAtual(novaData)
  }

  function formatarHora(dataHora) {
    return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

  function isHoje(data) {
    const hoje = new Date()
    return data.toDateString() === hoje.toDateString()
  }

  const viagemAtual = viagens.find(v => ['a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status))
  const proximasViagens = viagens.filter(v => ['vinculada'].includes(v.status))
  const viagensConcluidas = viagens.filter(v => v.status === 'concluida').length

  return (
    <div className="motorista-app">
      {/* Header */}
      <header className="motorista-header">
        <div className="motorista-header-top">
          <svg viewBox="0 0 180 60" className="motorista-logo">
            <polygon points="30,10 50,50 30,40" fill="#4cb963"/>
            <polygon points="30,10 10,50 30,40" fill="#1a5c38"/>
            <text x="60" y="32" fill="white" fontSize="18" fontWeight="bold" fontFamily="Inter, sans-serif">
              ÁGUA <tspan fill="#4cb963">VERDE</tspan>
            </text>
          </svg>
          <button className="motorista-logout" onClick={logout}>
            <svg viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
        <div className="motorista-greeting">
          <div className="motorista-avatar">
            {perfil?.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1>Olá, {perfil?.nome?.split(' ')[0]}!</h1>
            <p>Motorista</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="motorista-content">
        {/* Date Navigation */}
        <div className="motorista-date-nav">
          <button onClick={() => mudarData(-1)}>
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="motorista-date-display">
            <div className="motorista-date-day">{isHoje(dataAtual) ? 'Hoje' : dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
            <div className="motorista-date-full">{dataAtual.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</div>
          </div>
          <button onClick={() => mudarData(1)}>
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Summary */}
        <div className="motorista-summary">
          <div className="motorista-summary-card">
            <div className="motorista-summary-value">{viagens.length}</div>
            <div className="motorista-summary-label">Viagens</div>
          </div>
          <div className="motorista-summary-card">
            <div className="motorista-summary-value">{viagensConcluidas}</div>
            <div className="motorista-summary-label">Concluídas</div>
          </div>
          <div className="motorista-summary-card">
            <div className="motorista-summary-value">{proximasViagens.length}</div>
            <div className="motorista-summary-label">Pendentes</div>
          </div>
        </div>

        {loading ? (
          <div className="motorista-loading">Carregando...</div>
        ) : viagens.length === 0 ? (
          <div className="motorista-empty">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
            </svg>
            <h3>Sem viagens</h3>
            <p>Você não tem viagens para este dia</p>
          </div>
        ) : (
          <>
            {/* Viagem Atual */}
            {viagemAtual && (
              <>
                <h2 className="motorista-section-title">Viagem Atual</h2>
                <div className="motorista-trip-card current">
                  <div className="motorista-trip-header">
                    <div className="motorista-trip-time">{formatarHora(viagemAtual.data_hora)}</div>
                    <span className={`motorista-trip-status status-${viagemAtual.status}`}>
                      {formatarStatus(viagemAtual.status)}
                    </span>
                  </div>

                  <div className="motorista-trip-route">
                    <div className="motorista-route-line">
                      <div className="motorista-route-dot"></div>
                      <div className="motorista-route-connector"></div>
                      <div className="motorista-route-dot end"></div>
                    </div>
                    <div className="motorista-route-details">
                      <div className="motorista-route-point">
                        <div className="motorista-route-label">Origem</div>
                        <div className="motorista-route-value">{viagemAtual.origem}</div>
                      </div>
                      <div className="motorista-route-point">
                        <div className="motorista-route-label">Destino</div>
                        <div className="motorista-route-value">{viagemAtual.destino}</div>
                      </div>
                    </div>
                  </div>

                  <div className="motorista-passenger">
                    <div className="motorista-passenger-info">
                      <div className="motorista-passenger-name">{viagemAtual.passageiro_nome}</div>
                      <div className="motorista-passenger-count">{viagemAtual.quantidade_passageiros} passageiro(s)</div>
                    </div>
                    <div className="motorista-passenger-actions">
                      <a href={`tel:${viagemAtual.passageiro_telefone}`} className="motorista-action-btn phone">
                        <svg viewBox="0 0 24 24">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </a>
                      <a href={`https://wa.me/55${viagemAtual.passageiro_telefone.replace(/\D/g, '')}`} target="_blank" className="motorista-action-btn whatsapp">
                        <svg viewBox="0 0 24 24">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {viagemAtual.voo_numero && (
                    <div className="motorista-flight">
                      <svg viewBox="0 0 24 24">
                        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                      </svg>
                      <span>{viagemAtual.voo_numero} - {viagemAtual.voo_companhia}</span>
                    </div>
                  )}

                  <div className="motorista-trip-actions">
                    <button className="motorista-btn warning" onClick={() => setShowOcorrencia(viagemAtual.id)}>
                      <svg viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Ocorrência
                    </button>
                    {viagemAtual.status === 'a_caminho' && (
                      <button className="motorista-btn primary" onClick={() => atualizarStatus(viagemAtual.id, 'aguardando_passageiro')}>
                        Cheguei no Local
                      </button>
                    )}
                    {viagemAtual.status === 'aguardando_passageiro' && (
                      <button className="motorista-btn primary" onClick={() => atualizarStatus(viagemAtual.id, 'em_andamento')}>
                        Iniciar Viagem
                      </button>
                    )}
                    {viagemAtual.status === 'em_andamento' && (
                      <button className="motorista-btn success" onClick={() => atualizarStatus(viagemAtual.id, 'concluida')}>
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Próximas Viagens */}
            {proximasViagens.length > 0 && (
              <>
                <h2 className="motorista-section-title">Próximas Viagens</h2>
                {proximasViagens.map(viagem => (
                  <div key={viagem.id} className="motorista-trip-card">
                    <div className="motorista-trip-header">
                      <div className="motorista-trip-time">{formatarHora(viagem.data_hora)}</div>
                      <span className={`motorista-trip-status status-${viagem.status}`}>
                        {formatarStatus(viagem.status)}
                      </span>
                    </div>

                    <div className="motorista-trip-route">
                      <div className="motorista-route-line">
                        <div className="motorista-route-dot"></div>
                        <div className="motorista-route-connector"></div>
                        <div className="motorista-route-dot end"></div>
                      </div>
                      <div className="motorista-route-details">
                        <div className="motorista-route-point">
                          <div className="motorista-route-label">Origem</div>
                          <div className="motorista-route-value">{viagem.origem}</div>
                        </div>
                        <div className="motorista-route-point">
                          <div className="motorista-route-label">Destino</div>
                          <div className="motorista-route-value">{viagem.destino}</div>
                        </div>
                      </div>
                    </div>

                    <div className="motorista-passenger">
                      <div className="motorista-passenger-info">
                        <div className="motorista-passenger-name">{viagem.passageiro_nome}</div>
                        <div className="motorista-passenger-count">{viagem.quantidade_passageiros} passageiro(s)</div>
                      </div>
                      <div className="motorista-passenger-actions">
                        <a href={`tel:${viagem.passageiro_telefone}`} className="motorista-action-btn phone">
                          <svg viewBox="0 0 24 24">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                        </a>
                        <a href={`https://wa.me/55${viagem.passageiro_telefone.replace(/\D/g, '')}`} target="_blank" className="motorista-action-btn whatsapp">
                          <svg viewBox="0 0 24 24">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                          </svg>
                        </a>
                      </div>
                    </div>

                    {viagem.voo_numero && (
                      <div className="motorista-flight">
                        <svg viewBox="0 0 24 24">
                          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                        </svg>
                        <span>{viagem.voo_numero} - {viagem.voo_companhia}</span>
                      </div>
                    )}

                    <div className="motorista-trip-actions single">
                      <button className="motorista-btn primary" onClick={() => atualizarStatus(viagem.id, 'a_caminho')}>
                        <svg viewBox="0 0 24 24">
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                          <circle cx="7" cy="17" r="2"/>
                          <circle cx="17" cy="17" r="2"/>
                        </svg>
                        Iniciar Deslocamento
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>

      {/* Modal Ocorrência */}
      {showOcorrencia && (
        <div className="motorista-modal-overlay">
          <div className="motorista-modal">
            <h2>Registrar Ocorrência</h2>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={ocorrenciaForm.tipo}
                onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, tipo: e.target.value })}
              >
                <option value="atraso_voo">Atraso de voo</option>
                <option value="atraso_passageiro">Atraso do passageiro</option>
                <option value="atraso_motorista">Atraso meu</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea"
                value={ocorrenciaForm.descricao}
                onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, descricao: e.target.value })}
                placeholder="Descreva o que aconteceu..."
                required
              />
            </div>
            <div className="motorista-modal-actions">
              <button className="motorista-btn secondary" onClick={() => setShowOcorrencia(null)}>
                Cancelar
              </button>
              <button className="motorista-btn primary" onClick={() => salvarOcorrencia(showOcorrencia)}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MotoristaApp
