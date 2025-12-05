import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { formatarData, formatarHora, formatarStatus, getIniciais, formatarValor } from '../utils/formatters'

function Relatorios() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [viagens, setViagens] = useState([])
  const [motoristas, setMotoristas] = useState([])

  // Filtros de periodo
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(1) // Primeiro dia do mes
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  // Metricas calculadas
  const [metricas, setMetricas] = useState({
    total: 0,
    concluidas: 0,
    canceladas: 0,
    noShow: 0,
    emAndamento: 0,
    faturamentoPorMoeda: {}
  })

  // Ranking de motoristas
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    carregarDados()
  }, [dataInicio, dataFim])

  async function carregarDados() {
    setLoading(true)

    // Carregar viagens do periodo
    const { data: viagensData, error: viagensError } = await supabase
      .from('viagens')
      .select('*, motoristas(id, nome, telefone, foto_url)')
      .is('deleted_at', null)
      .gte('data_hora', `${dataInicio}T00:00:00`)
      .lte('data_hora', `${dataFim}T23:59:59`)
      .order('data_hora', { ascending: false })

    if (!viagensError) {
      setViagens(viagensData || [])
      calcularMetricas(viagensData || [])
      calcularRanking(viagensData || [])
    }

    // Carregar lista de motoristas
    const { data: motoristasData } = await supabase
      .from('motoristas')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    setMotoristas(motoristasData || [])
    setLoading(false)
  }

  function calcularMetricas(dados) {
    const total = dados.length
    const concluidas = dados.filter(v => v.status === 'concluida').length
    const canceladas = dados.filter(v => v.status === 'cancelada').length
    const noShow = dados.filter(v => v.status === 'no_show').length
    const emAndamento = dados.filter(v => ['vinculada', 'a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status)).length

    // Calcular faturamento por moeda apenas das viagens concluidas com valor
    const faturamentoPorMoeda = {}
    dados
      .filter(v => v.status === 'concluida' && v.valor)
      .forEach(v => {
        const moeda = v.moeda || 'BRL'
        if (!faturamentoPorMoeda[moeda]) {
          faturamentoPorMoeda[moeda] = 0
        }
        faturamentoPorMoeda[moeda] += v.valor
      })

    setMetricas({
      total,
      concluidas,
      canceladas,
      noShow,
      emAndamento,
      faturamentoPorMoeda
    })
  }

  function calcularRanking(dados) {
    // Agrupar viagens por motorista
    const porMotorista = {}

    dados.forEach(v => {
      if (v.motorista_id && v.motoristas) {
        if (!porMotorista[v.motorista_id]) {
          porMotorista[v.motorista_id] = {
            motorista: v.motoristas,
            total: 0,
            concluidas: 0,
            canceladas: 0,
            noShow: 0,
            faturamentoPorMoeda: {}
          }
        }
        porMotorista[v.motorista_id].total++
        if (v.status === 'concluida') {
          porMotorista[v.motorista_id].concluidas++
          if (v.valor) {
            const moeda = v.moeda || 'BRL'
            if (!porMotorista[v.motorista_id].faturamentoPorMoeda[moeda]) {
              porMotorista[v.motorista_id].faturamentoPorMoeda[moeda] = 0
            }
            porMotorista[v.motorista_id].faturamentoPorMoeda[moeda] += v.valor
          }
        }
        if (v.status === 'cancelada') {
          porMotorista[v.motorista_id].canceladas++
        }
        if (v.status === 'no_show') {
          porMotorista[v.motorista_id].noShow++
        }
      }
    })

    // Converter para array e ordenar por viagens concluidas
    const rankingArray = Object.values(porMotorista)
      .sort((a, b) => b.concluidas - a.concluidas)

    setRanking(rankingArray)
  }

  function aplicarPeriodoRapido(tipo) {
    const hoje = new Date()
    let inicio, fim

    switch (tipo) {
      case 'hoje':
        inicio = hoje.toISOString().split('T')[0]
        fim = inicio
        break
      case 'semana':
        const diaSemana = hoje.getDay()
        const inicioSemana = new Date(hoje)
        inicioSemana.setDate(hoje.getDate() - diaSemana)
        inicio = inicioSemana.toISOString().split('T')[0]
        fim = hoje.toISOString().split('T')[0]
        break
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
        fim = hoje.toISOString().split('T')[0]
        break
      case 'mesPassado':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0]
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0]
        break
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]
        fim = hoje.toISOString().split('T')[0]
        break
      default:
        return
    }

    setDataInicio(inicio)
    setDataFim(fim)
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="page-title">Relatorios</h1>
          <span style={{ color: 'var(--cinza-texto)', fontSize: 14 }}>
            {viagens.length} viagens no periodo
          </span>
        </div>
      </header>

      {/* Filtros de Periodo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#666' }}>
                Data Inicio
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#666' }}>
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => aplicarPeriodoRapido('hoje')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Hoje
              </button>
              <button onClick={() => aplicarPeriodoRapido('semana')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Esta Semana
              </button>
              <button onClick={() => aplicarPeriodoRapido('mes')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Este Mes
              </button>
              <button onClick={() => aplicarPeriodoRapido('mesPassado')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Mes Passado
              </button>
              <button onClick={() => aplicarPeriodoRapido('ano')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>
                Este Ano
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <>
          {/* Cards de Metricas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#3498db' }}>{metricas.total}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Total de Viagens</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#27ae60' }}>{metricas.concluidas}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Concluidas</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#e74c3c' }}>{metricas.canceladas}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Canceladas</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#c0392b' }}>{metricas.noShow}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>No-Show</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#f39c12' }}>{metricas.emAndamento}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Em Andamento</div>
            </div>
            {Object.keys(metricas.faturamentoPorMoeda).length > 0 ? (
              Object.entries(metricas.faturamentoPorMoeda).map(([moeda, valor]) => {
                const simbolos = { 'BRL': 'R$', 'USD': 'US$', 'EUR': 'EUR' }
                const cores = {
                  'BRL': 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  'USD': 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)',
                  'EUR': 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'
                }
                return (
                  <div key={moeda} className="card" style={{ padding: 20, textAlign: 'center', background: cores[moeda] || cores['BRL'] }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                      {simbolos[moeda] || moeda} {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>Faturamento ({moeda})</div>
                  </div>
                )
              })
            ) : (
              <div className="card" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                  R$ 0,00
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>Faturamento</div>
              </div>
            )}
          </div>

          <div className="content-grid">
            {/* Ranking de Motoristas */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Ranking de Motoristas</h2>
              </div>
              <div className="card-body">
                {ranking.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                    Nenhuma viagem com motorista no periodo
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ranking.map((item, index) => (
                      <div key={item.motorista.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: index === 0 ? '#fff8e1' : index === 1 ? '#f5f5f5' : index === 2 ? '#fff3e0' : 'white',
                        borderRadius: 8,
                        border: '1px solid #eee'
                      }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: index === 0 ? '#ffc107' : index === 1 ? '#9e9e9e' : index === 2 ? '#ff9800' : '#e0e0e0',
                          color: index < 3 ? 'white' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {index + 1}
                        </div>

                        {item.motorista.foto_url ? (
                          <img
                            src={item.motorista.foto_url}
                            alt={item.motorista.nome}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--verde-escuro)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600
                          }}>
                            {getIniciais(item.motorista.nome)}
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.motorista.nome}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {item.concluidas} concluidas de {item.total} viagens
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {Object.keys(item.faturamentoPorMoeda).length > 0 ? (
                            Object.entries(item.faturamentoPorMoeda).map(([moeda, valor]) => {
                              const simbolos = { 'BRL': 'R$', 'USD': 'US$', 'EUR': 'EUR' }
                              return (
                                <div key={moeda} style={{ fontWeight: 700, color: 'var(--verde-escuro)', fontSize: 14 }}>
                                  {simbolos[moeda] || moeda} {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              )
                            })
                          ) : (
                            <div style={{ fontWeight: 700, color: '#999', fontSize: 14 }}>-</div>
                          )}
                          {item.noShow > 0 && (
                            <div style={{ fontSize: 11, color: '#c62828' }}>
                              {item.noShow} no-show
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Viagens */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Viagens do Periodo</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {viagens.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                    Nenhuma viagem encontrada no periodo selecionado
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Data/Hora
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Passageiro
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Rota
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Motorista
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Status
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {viagens.slice(0, 50).map(viagem => (
                          <tr
                            key={viagem.id}
                            onClick={() => navigate(`/viagens/${viagem.id}`)}
                            style={{
                              borderBottom: '1px solid #eee',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500 }}>{formatarData(viagem.data_hora)}</div>
                              <div style={{ fontSize: 13, color: '#666' }}>{formatarHora(viagem.data_hora)}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500 }}>{viagem.passageiro_nome}</div>
                              <div style={{ fontSize: 13, color: '#666' }}>{viagem.passageiro_telefone}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: 13 }}>
                                <span style={{ color: '#27ae60' }}>●</span> {viagem.origem}
                              </div>
                              <div style={{ fontSize: 13 }}>
                                <span style={{ color: '#e74c3c' }}>●</span> {viagem.destino}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {viagem.motoristas ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {viagem.motoristas.foto_url ? (
                                    <img
                                      src={viagem.motoristas.foto_url}
                                      alt={viagem.motoristas.nome}
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                      }}
                                    />
                                  ) : (
                                    <div style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      background: 'var(--verde-escuro)',
                                      color: 'white',
                                      fontSize: 11,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 600
                                    }}>
                                      {getIniciais(viagem.motoristas.nome)}
                                    </div>
                                  )}
                                  <span style={{ fontSize: 13 }}>{viagem.motoristas.nome}</span>
                                </div>
                              ) : (
                                <span style={{ color: '#999', fontSize: 13 }}>Sem motorista</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span className={`status-badge status-${viagem.status}`} style={{ fontSize: 11 }}>
                                {formatarStatus(viagem.status)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {viagem.valor ? (
                                <span style={{ fontWeight: 600, color: 'var(--verde-escuro)' }}>
                                  {formatarValor(viagem.valor, viagem.moeda)}
                                </span>
                              ) : (
                                <span style={{ color: '#999' }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {viagens.length > 50 && (
                      <div style={{ padding: 16, textAlign: 'center', color: '#666', fontSize: 13 }}>
                        Mostrando 50 de {viagens.length} viagens
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default Relatorios
