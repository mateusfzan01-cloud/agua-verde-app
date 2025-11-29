import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function AcompanharViagem() {
  const { token } = useParams()
  const [viagem, setViagem] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [modalOcorrencia, setModalOcorrencia] = useState(false)
  const [textoOcorrencia, setTextoOcorrencia] = useState('')
  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [nota, setNota] = useState(5)
  const [comentario, setComentario] = useState('')
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)

  useEffect(() => {
    if (token) {
      fetchViagem()
      const interval = setInterval(fetchViagem, 30000) // Atualiza a cada 30s
      return () => clearInterval(interval)
    }
  }, [token])

  async function fetchViagem() {
    const { data, error } = await supabase
      .from('viagens')
      .select('*, motoristas(id, nome, telefone, marca_modelo, cor, placa), avaliacoes(*)')
      .eq('token_cliente', token)
      .single()

    if (error) {
      setErro('Viagem não encontrada')
      setLoading(false)
      return
    }

    setViagem(data)
    setAvaliacaoEnviada(data.avaliacoes && data.avaliacoes.length > 0)

    // Buscar notificacoes do cliente
    const { data: notifs } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('viagem_id', data.id)
      .eq('tipo', 'cliente')
      .eq('lida', false)
      .order('criado_em', { ascending: false })

    setNotificacoes(notifs || [])
    setLoading(false)
  }

  async function marcarNotificacoesLidas() {
    if (viagem && notificacoes.length > 0) {
      await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('viagem_id', viagem.id)
        .eq('tipo', 'cliente')

      setNotificacoes([])
    }
    setMostrarNotificacoes(false)
  }

  async function registrarOcorrencia() {
    if (!textoOcorrencia.trim()) return

    const { error } = await supabase
      .from('ocorrencias')
      .insert({
        viagem_id: viagem.id,
        descricao: textoOcorrencia,
        tipo: 'outro',
        registrado_por: 'Cliente: ' + viagem.passageiro_nome
      })

    if (!error) {
      setModalOcorrencia(false)
      setTextoOcorrencia('')
      alert('Ocorrência registrada! A equipe entrará em contato.')
    }
  }

  async function enviarAvaliacao() {
    const { error } = await supabase
      .from('avaliacoes')
      .insert({
        viagem_id: viagem.id,
        nota,
        comentario: comentario.trim() || null
      })

    if (!error) {
      setModalAvaliacao(false)
      setAvaliacaoEnviada(true)
      alert('Obrigado pela sua avaliação!')
    }
  }

  function formatarDataHora(dataHora) {
    const data = new Date(dataHora)
    return {
      data: data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  function getStatusTimeline() {
    const status = viagem?.status || 'pendente'
    const etapas = [
      { id: 'vinculada', label: 'Viagem confirmada', icone: '✓' },
      { id: 'a_caminho', label: 'Motorista a caminho', icone: '🚗' },
      { id: 'aguardando_passageiro', label: 'Motorista no local', icone: '📍' },
      { id: 'em_andamento', label: 'Em trânsito', icone: '🛣️' },
      { id: 'concluida', label: 'Chegou ao destino', icone: '✅' }
    ]

    const statusOrder = ['pendente', 'vinculada', 'a_caminho', 'aguardando_passageiro', 'em_andamento', 'concluida']
    const currentIndex = statusOrder.indexOf(status)

    return etapas.map((etapa, index) => {
      const etapaIndex = statusOrder.indexOf(etapa.id)
      let estado = 'pendente'
      if (etapaIndex < currentIndex) estado = 'completo'
      else if (etapaIndex === currentIndex) estado = 'atual'
      
      return { ...etapa, estado }
    })
  }

  function getTelefoneContato() {
    return viagem?.telefone_contato || '81999999999' // Telefone padrão do admin
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div>Carregando...</div>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '40px', 
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#333' }}>Link inválido</h2>
          <p style={{ color: '#666', margin: 0 }}>Esta viagem não foi encontrada ou o link expirou.</p>
        </div>
      </div>
    )
  }

  const { data, hora } = formatarDataHora(viagem.data_hora)
  const timeline = getStatusTimeline()
  const telefoneContato = getTelefoneContato()

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <img src="/logo-agua-verde.jpg" alt="Água Verde" style={{ height: '40px' }} />
        
        {/* Sino de notificacoes */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
            style={{
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: '#333' }}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
            </svg>
            {notificacoes.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#e74c3c',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {notificacoes.length}
              </span>
            )}
          </button>

          {mostrarNotificacoes && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '280px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 600 }}>
                Atualizações
              </div>
              {notificacoes.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Nenhuma atualização
                </div>
              ) : (
                <>
                  {notificacoes.map(notif => (
                    <div key={notif.id} style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #eee',
                      background: '#f8fff8'
                    }}>
                      <div style={{ fontSize: '13px' }}>{notif.mensagem}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        {new Date(notif.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={marcarNotificacoesLidas}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Marcar todas como lidas
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {/* Info da viagem */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>{data}</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#27ae60' }}>{hora}</div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Origem</div>
              <div style={{ fontWeight: 600 }}>{viagem.origem}</div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#27ae60',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: 'white' }}>→</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Destino</div>
              <div style={{ fontWeight: 600 }}>{viagem.destino}</div>
            </div>
          </div>

          {viagem.voo_numero && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#e3f2fd',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              ✈️ Voo {viagem.voo_numero} {viagem.voo_companhia && `(${viagem.voo_companhia})`}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Status da Viagem</h3>
          
          {viagem.status === 'cancelada' ? (
            <div style={{
              padding: '20px',
              background: '#fee',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
              <div style={{ fontWeight: 600, color: '#c00' }}>Viagem Cancelada</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {timeline.map((etapa, index) => (
                <div key={etapa.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  paddingBottom: index < timeline.length - 1 ? '24px' : '0',
                  position: 'relative'
                }}>
                  {/* Linha conectora */}
                  {index < timeline.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '32px',
                      width: '2px',
                      height: 'calc(100% - 32px)',
                      background: etapa.estado === 'completo' ? '#27ae60' : '#e0e0e0'
                    }} />
                  )}
                  
                  {/* Icone */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: etapa.estado === 'pendente' ? '#f0f0f0' : 
                               etapa.estado === 'atual' ? '#27ae60' : '#27ae60',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '14px',
                    border: etapa.estado === 'atual' ? '3px solid #a5d6a7' : 'none',
                    boxSizing: 'border-box',
                    zIndex: 1
                  }}>
                    {etapa.estado === 'pendente' ? '' : etapa.icone}
                  </div>

                  {/* Texto */}
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{
                      fontWeight: etapa.estado === 'atual' ? 700 : 400,
                      color: etapa.estado === 'pendente' ? '#999' : '#333'
                    }}>
                      {etapa.label}
                    </div>
                    {etapa.estado === 'atual' && (
                      <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '2px' }}>
                        Agora
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Motorista */}
        {viagem.motoristas && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Seu Motorista</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 700
              }}>
                {viagem.motoristas.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{viagem.motoristas.nome}</div>
                {viagem.motoristas.marca_modelo && (
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    🚗 {viagem.motoristas.marca_modelo}
                    {viagem.motoristas.cor && ` - ${viagem.motoristas.cor}`}
                  </div>
                )}
                {viagem.motoristas.placa && (
                  <div style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '14px',
                    letterSpacing: '1px'
                  }}>
                    {viagem.motoristas.placa}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botoes de contato */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Precisa de Ajuda?</h3>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={`tel:${telefoneContato}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                background: '#f0f0f0',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#333',
                fontWeight: 500
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#333' }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              Ligar
            </a>
            <a
              href={`https://wa.me/55${telefoneContato.replace(/\D/g, '')}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                background: '#25d366',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'white',
                fontWeight: 500
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'white' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>

          <button
            onClick={() => setModalOcorrencia(true)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '14px',
              background: '#fff3cd',
              border: 'none',
              borderRadius: '12px',
              color: '#856404',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            ⚠️ Reportar Problema
          </button>
        </div>

        {/* Avaliacao */}
        {viagem.status === 'concluida' && !avaliacaoEnviada && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Como foi sua viagem?</h3>
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px' }}>Sua opinião é muito importante!</p>
            <button
              onClick={() => setModalAvaliacao(true)}
              style={{
                padding: '14px 32px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ⭐ Avaliar Viagem
            </button>
          </div>
        )}

        {avaliacaoEnviada && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🙏</div>
            <div style={{ fontWeight: 600, color: '#27ae60' }}>Obrigado pela avaliação!</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
          Água Verde Transfers © {new Date().getFullYear()}
        </div>
      </div>

      {/* Modal Ocorrencia */}
      {modalOcorrencia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px' }}>Reportar Problema</h3>
            <textarea
              value={textoOcorrencia}
              onChange={(e) => setTextoOcorrencia(e.target.value)}
              placeholder="Descreva o problema..."
              style={{
                width: '100%', minHeight: '120px', padding: '12px', border: '2px solid #e0e0e0',
                borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setModalOcorrencia(false)} style={{
                flex: 1, padding: '12px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Cancelar
              </button>
              <button onClick={registrarOcorrencia} style={{
                flex: 1, padding: '12px', background: '#e74c3c', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Avaliacao */}
      {modalAvaliacao && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px', textAlign: 'center' }}>Avalie sua Viagem</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setNota(n)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '32px',
                    cursor: 'pointer',
                    opacity: n <= nota ? 1 : 0.3
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Deixe um comentário (opcional)"
              style={{
                width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #e0e0e0',
                borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setModalAvaliacao(false)} style={{
                flex: 1, padding: '12px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Cancelar
              </button>
              <button onClick={enviarAvaliacao} style={{
                flex: 1, padding: '12px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {mostrarNotificacoes && (
        <div 
          onClick={() => setMostrarNotificacoes(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  )
}

export default AcompanharViagem
