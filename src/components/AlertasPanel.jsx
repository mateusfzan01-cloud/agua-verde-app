import { useNavigate } from 'react-router-dom'
import { useAlertas } from '../contexts/AlertasContext'

function AlertasPanel() {
  const navigate = useNavigate()
  const { alertasNaoLidos, loading, marcarComoLido, marcarTodosComoLidos } = useAlertas()

  function formatarTempo(dataString) {
    const data = new Date(dataString)
    const agora = new Date()
    const diffMs = agora - data
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffHoras < 24) return `${diffHoras}h atrás`
    if (diffDias < 7) return `${diffDias}d atrás`

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  function getAlertaConfig(tipo) {
    const configs = {
      cancelamento: {
        classe: 'danger',
        icone: (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        ),
        titulo: 'Cancelamento'
      },
      modificacao: {
        classe: 'warning',
        icone: (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="1.5">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        ),
        titulo: 'Modificacao'
      },
      nova_reserva: {
        classe: 'info',
        icone: (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="var(--verde-claro)" strokeWidth="1.5">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
        ),
        titulo: 'Nova Reserva'
      },
      avaliacao_baixa: {
        classe: 'warning',
        icone: (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="#f39c12" stroke="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ),
        titulo: 'Avaliacao Baixa'
      }
    }
    return configs[tipo] || configs.modificacao
  }

  async function handleAlertaClick(alerta) {
    await marcarComoLido(alerta.id)
    if (alerta.viagem_id) {
      navigate(`/viagens/${alerta.viagem_id}`)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Alertas</h2>
        </div>
        <div className="alerts-list">
          <div className="loading" style={{ padding: '20px' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Alertas</h2>
        {alertasNaoLidos.length > 0 && (
          <button
            onClick={marcarTodosComoLidos}
            className="card-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Marcar todos como lidos
          </button>
        )}
      </div>
      <div className="alerts-list">
        {alertasNaoLidos.length === 0 ? (
          <div className="alert-item info">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="var(--verde-claro)" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div className="alert-content">
              <div className="alert-title">Tudo em ordem!</div>
              <div className="alert-desc">Não há alertas pendentes</div>
            </div>
          </div>
        ) : (
          alertasNaoLidos.slice(0, 5).map((alerta) => {
            const config = getAlertaConfig(alerta.tipo)
            return (
              <div
                key={alerta.id}
                className={`alert-item ${config.classe} alert-clickable`}
                onClick={() => handleAlertaClick(alerta)}
              >
                {config.icone}
                <div className="alert-content">
                  <div className="alert-title">
                    {config.titulo}
                    {alerta.numero_reserva && (
                      <span className="alert-reserva"> #{alerta.numero_reserva}</span>
                    )}
                  </div>
                  <div className="alert-desc">{alerta.mensagem}</div>
                  <div className="alert-time">{formatarTempo(alerta.criado_em)}</div>
                </div>
              </div>
            )
          })
        )}
        {alertasNaoLidos.length > 5 && (
          <div className="alert-more">
            +{alertasNaoLidos.length - 5} outros alertas
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertasPanel
