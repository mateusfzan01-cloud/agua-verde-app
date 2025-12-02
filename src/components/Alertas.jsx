import { useNavigate } from 'react-router-dom'
import { useAlertas } from '../contexts/AlertasContext'

function Alertas() {
  const navigate = useNavigate()
  const { alertas, alertasNaoLidos, loading, marcarComoLido, marcarTodosComoLidos } = useAlertas()

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

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
        titulo: 'Modificação'
      },
      nova_reserva: {
        classe: 'info',
        icone: (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="var(--verde-claro)" strokeWidth="1.5">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
        ),
        titulo: 'Nova Reserva'
      }
    }
    return configs[tipo] || configs.modificacao
  }

  async function handleAlertaClick(alerta) {
    if (!alerta.lido) {
      await marcarComoLido(alerta.id)
    }
    if (alerta.viagem_id) {
      navigate(`/viagens/${alerta.viagem_id}`)
    }
  }

  if (loading) {
    return <div className="loading">Carregando alertas...</div>
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="page-title">Alertas</h1>
        </div>
        {alertasNaoLidos.length > 0 && (
          <button onClick={marcarTodosComoLidos} className="btn btn-secondary">
            Marcar todos como lidos
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '400px' }}>
        <div className="stat-card alert">
          <div className="stat-label">Não Lidos</div>
          <div className="stat-value">{alertasNaoLidos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{alertas.length}</div>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Todos os Alertas</h2>
        </div>
        <div className="alerts-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {alertas.length === 0 ? (
            <div className="alert-item info">
              <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="var(--verde-claro)" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <div className="alert-content">
                <div className="alert-title">Nenhum alerta</div>
                <div className="alert-desc">Não há alertas registrados no sistema</div>
              </div>
            </div>
          ) : (
            alertas.map((alerta) => {
              const config = getAlertaConfig(alerta.tipo)
              return (
                <div
                  key={alerta.id}
                  className={`alert-item ${config.classe} alert-clickable ${alerta.lido ? 'alert-lido' : ''}`}
                  onClick={() => handleAlertaClick(alerta)}
                >
                  {config.icone}
                  <div className="alert-content">
                    <div className="alert-title">
                      {config.titulo}
                      {alerta.numero_reserva && (
                        <span className="alert-reserva"> #{alerta.numero_reserva}</span>
                      )}
                      {!alerta.lido && <span className="alert-novo">Novo</span>}
                    </div>
                    <div className="alert-desc">{alerta.mensagem}</div>
                    <div className="alert-time">{formatarTempo(alerta.criado_em)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

export default Alertas
