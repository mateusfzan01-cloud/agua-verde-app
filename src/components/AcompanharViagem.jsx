import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function AcompanharViagem() {
  const { token } = useParams()
  const [viagem, setViagem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregarViagem()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarViagem, 30000)
    return () => clearInterval(interval)
  }, [token])

  async function carregarViagem() {
    let data = null
    
    // Primeiro tenta buscar por ID numérico
    const idNumerico = parseInt(token)
    if (!isNaN(idNumerico)) {
      const { data: dataById, error: errorById } = await supabase
        .from('viagens')
        .select('*, motoristas(id, nome, telefone, marca_modelo, cor, placa, foto_url)')
        .eq('id', idNumerico)
        .single()
      
      if (!errorById && dataById) {
        data = dataById
      }
    }
    
    // Se não encontrou por ID, tentar por token_cliente
    if (!data) {
      const { data: dataByToken, error: errorByToken } = await supabase
        .from('viagens')
        .select('*, motoristas(id, nome, telefone, marca_modelo, cor, placa, foto_url)')
        .eq('token_cliente', token)
        .single()
      
      if (!errorByToken && dataByToken) {
        data = dataByToken
      }
    }
    
    if (!data) {
      setErro('Viagem não encontrada')
      setLoading(false)
      return
    }

    setViagem(data)
    setLoading(false)
  }

  function formatarDataHora(dataHora) {
    const data = new Date(dataHora)
    return {
      data: data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  function getStatusInfo(status) {
    const statusMap = {
      'pendente': { 
        label: 'Viagem Confirmada', 
        descricao: 'Aguardando atribuição do motorista',
        icone: '📋',
        cor: '#f39c12',
        etapa: 1
      },
      'vinculada': { 
        label: 'Motorista Definido', 
        descricao: 'Seu motorista já foi designado',
        icone: '✅',
        cor: '#3498db',
        etapa: 2
      },
      'a_caminho': { 
        label: 'Motorista a Caminho', 
        descricao: 'O motorista está indo até você',
        icone: '🚗',
        cor: '#9b59b6',
        etapa: 3
      },
      'aguardando_passageiro': { 
        label: 'Motorista no Local', 
        descricao: 'O motorista chegou e está aguardando',
        icone: '📍',
        cor: '#e67e22',
        etapa: 4
      },
      'em_andamento': { 
        label: 'Em Trânsito', 
        descricao: 'Você está a caminho do destino',
        icone: '🛣️',
        cor: '#27ae60',
        etapa: 5
      },
      'concluida': { 
        label: 'Viagem Concluída', 
        descricao: 'Você chegou ao destino!',
        icone: '🎉',
        cor: '#27ae60',
        etapa: 6
      },
      'cancelada': { 
        label: 'Viagem Cancelada', 
        descricao: 'Esta viagem foi cancelada',
        icone: '❌',
        cor: '#e74c3c',
        etapa: 0
      },
      'no_show': { 
        label: 'Não Comparecimento', 
        descricao: 'Passageiro não compareceu',
        icone: '⚠️',
        cor: '#e74c3c',
        etapa: 0
      }
    }
    return statusMap[status] || { label: status, descricao: '', icone: '❓', cor: '#999', etapa: 0 }
  }

  function getIniciais(nome) {
    if (!nome) return '??'
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Número de contato da agência
  const telefoneAgencia = '81999473200'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <div style={{ color: '#666' }}>Carregando viagem...</div>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{ 
          textAlign: 'center', 
          background: 'white', 
          padding: 40, 
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, color: '#c62828' }}>Viagem não encontrada</h1>
          <p style={{ color: '#666', margin: 0 }}>Não se preocupe! O link pode estar incorreto, por isso entre em contato com nosso canal de atendimento e solicite ajuda.</p>
        </div>
      </div>
    )
  }

  const { data, hora } = formatarDataHora(viagem.data_hora)
  const statusInfo = getStatusInfo(viagem.status)
  const etapas = [
    { num: 1, label: 'Confirmada' },
    { num: 2, label: 'Motorista' },
    { num: 3, label: 'A caminho' },
    { num: 4, label: 'No local' },
    { num: 5, label: 'Em trânsito' },
    { num: 6, label: 'Concluída' }
  ]

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
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <img 
          src="/logo-agua-verde.jpg" 
          alt="Água Verde" 
          style={{ height: 40 }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        <span style={{ 
          fontSize: 20, 
          fontWeight: 700, 
          color: '#1b5e20',
          marginLeft: 12
        }}>
          Água Verde Turismo
        </span>
      </div>

      <div style={{ padding: '20px', maxWidth: 500, margin: '0 auto' }}>
        
        {/* Status Principal */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{statusInfo.icone}</div>
          <h1 style={{ 
            margin: '0 0 8px', 
            fontSize: 22, 
            color: statusInfo.cor 
          }}>
            {statusInfo.label}
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            {statusInfo.descricao}
          </p>

          {/* Timeline de etapas */}
          {viagem.status !== 'cancelada' && viagem.status !== 'no_show' && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 24,
              padding: '0 10px'
            }}>
              {etapas.map((etapa, index) => (
                <div key={etapa.num} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flex: 1,
                  position: 'relative'
                }}>
                  {/* Linha conectora */}
                  {index < etapas.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: '50%',
                      width: '100%',
                      height: 3,
                      background: statusInfo.etapa > etapa.num ? '#27ae60' : '#e0e0e0',
                      zIndex: 0
                    }} />
                  )}
                  
                  {/* Círculo */}
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: statusInfo.etapa >= etapa.num ? '#27ae60' : '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    marginBottom: 4
                  }}>
                    {statusInfo.etapa >= etapa.num && (
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'white' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span style={{ 
                    fontSize: 9, 
                    color: statusInfo.etapa >= etapa.num ? '#27ae60' : '#999',
                    fontWeight: statusInfo.etapa === etapa.num ? 600 : 400,
                    textAlign: 'center'
                  }}>
                    {etapa.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dados da Viagem */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#333' }}>
            📅 Detalhes da Viagem
          </h2>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>DATA E HORÁRIO</div>
            <div style={{ fontSize: 16, fontWeight: 600, textTransform: 'capitalize' }}>{data}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>{hora}</div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: '#f8f9fa',
            borderRadius: 8,
            marginBottom: 12
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#27ae60'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999' }}>ORIGEM</div>
              <div style={{ fontWeight: 600 }}>{viagem.origem}</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: '#f8f9fa',
            borderRadius: 8
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#e74c3c'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999' }}>DESTINO</div>
              <div style={{ fontWeight: 600 }}>{viagem.destino}</div>
            </div>
          </div>

          {viagem.voo_numero && (
            <div style={{ marginTop: 16, padding: 12, background: '#e3f2fd', borderRadius: 8 }}>
              <span style={{ fontSize: 13 }}>✈️ Voo: <strong>{viagem.voo_numero}</strong></span>
              {viagem.voo_companhia && <span> ({viagem.voo_companhia})</span>}
            </div>
          )}
        </div>

        {/* Motorista */}
        {viagem.motoristas && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#333' }}>
              🚗 Seu Motorista
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {viagem.motoristas.foto_url ? (
                <img 
                  src={viagem.motoristas.foto_url} 
                  alt={viagem.motoristas.nome}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  fontWeight: 700
                }}>
                  {getIniciais(viagem.motoristas.nome)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{viagem.motoristas.nome}</div>
                {viagem.motoristas.marca_modelo && (
                  <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    {viagem.motoristas.marca_modelo}
                    {viagem.motoristas.cor && ` - ${viagem.motoristas.cor}`}
                  </div>
                )}
                {viagem.motoristas.placa && (
                  <div style={{ 
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '4px 12px',
                    background: '#f0f0f0',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                    {viagem.motoristas.placa}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contato */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#333' }}>
            📞 Precisa de Ajuda?
          </h2>

          <div style={{ display: 'flex', gap: 12 }}>
            <a 
              href={`tel:${telefoneAgencia}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 14,
                background: '#f0f0f0',
                color: '#333',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#333' }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              Ligar
            </a>
            <a 
              href={`https://wa.me/55${telefoneAgencia}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 14,
                background: '#25d366',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.90-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Atualização automática */}
        <p style={{ 
          textAlign: 'center', 
          fontSize: 12, 
          color: '#999',
          margin: '20px 0'
        }}>
          Esta página atualiza automaticamente a cada 30 segundos
        </p>
      </div>
    </div>
  )
}

export default AcompanharViagem
