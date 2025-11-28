import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

function MotoristaApp() {
  const { perfil, logout } = useAuth()
  const [viagens, setViagens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [modalOcorrencia, setModalOcorrencia] = useState(null)
  const [textoOcorrencia, setTextoOcorrencia] = useState('')

  useEffect(() => {
    if (perfil?.motorista_id) {
      carregarViagens()
    }
  }, [perfil, dataAtual])

  async function carregarViagens() {
    setCarregando(true)
    const dataStr = dataAtual.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .gte('data_hora', dataStr + 'T00:00:00')
      .lte('data_hora', dataStr + 'T23:59:59')
      .order('data_hora', { ascending: true })

    if (!error) {
      setViagens(data || [])
    }
    setCarregando(false)
  }

  async function atualizarStatus(viagemId, novoStatus) {
    const { error } = await supabase
      .from('viagens')
      .update({ status: novoStatus })
      .eq('id', viagemId)

    if (!error) {
      carregarViagens()
    }
  }

  async function registrarOcorrencia() {
    if (!textoOcorrencia.trim()) return

    const { error } = await supabase
      .from('ocorrencias')
      .insert({
        viagem_id: modalOcorrencia,
        descricao: textoOcorrencia,
        tipo: 'outro',
        registrado_por: perfil.nome
      })

    if (!error) {
      setModalOcorrencia(null)
      setTextoOcorrencia('')
      alert('Ocorrencia registrada!')
    }
  }

  function navegarData(dias) {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() + dias)
    setDataAtual(novaData)
  }

  function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatarHora(dataHora) {
    return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getBotaoAcao(viagem) {
    switch (viagem.status) {
      case 'vinculada':
        return { texto: 'Iniciar Deslocamento', proximo: 'a_caminho', cor: '#3498db' }
      case 'a_caminho':
        return { texto: 'Cheguei no Local', proximo: 'aguardando_passageiro', cor: '#9b59b6' }
      case 'aguardando_passageiro':
        return { texto: 'Iniciar Viagem', proximo: 'em_andamento', cor: '#f39c12' }
      case 'em_andamento':
        return { texto: 'Concluir Viagem', proximo: 'concluida', cor: '#27ae60' }
      default:
        return null
    }
  }

  function getStatusLabel(status) {
    const labels = {
      vinculada: 'Aguardando',
      a_caminho: 'A caminho',
      aguardando_passageiro: 'No local',
      em_andamento: 'Em andamento',
      concluida: 'Concluida',
      cancelada: 'Cancelada'
    }
    return labels[status] || status
  }

  const viagemAtual = viagens.find(v => ['a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status))
  const proximasViagens = viagens.filter(v => v.status === 'vinculada')
  const viagensConcluidas = viagens.filter(v => v.status === 'concluida')

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <img src="/logo-agua-verde.jpg" alt="Agua Verde" style={{ height: '40px' }} />
        <button onClick={logout} style={{
          background: '#f0f0f0',
          border: 'none',
          color: '#333',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 500
        }}>
          Sair
        </button>
      </div>

      {/* Navegacao de Data */}
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee'
      }}>
        <button onClick={() => navegarData(-1)} style={{
          background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
        }}>{'<'}</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{formatarData(dataAtual)}</div>
        </div>
        <button onClick={() => navegarData(1)} style={{
          background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
        }}>{'>'}</button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px 20px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#27ae60' }}>{viagens.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
        </div>
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3498db' }}>{viagensConcluidas.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Concluidas</div>
        </div>
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f39c12' }}>{proximasViagens.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Pendentes</div>
        </div>
      </div>

      {/* Conteudo */}
      <div style={{ padding: '0 20px 20px' }}>
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando...</div>
        ) : (
          <>
            {/* Viagem Atual */}
            {viagemAtual && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                  Viagem Atual
                </h3>
                <ViagemCard 
                  viagem={viagemAtual} 
                  formatarHora={formatarHora}
                  getStatusLabel={getStatusLabel}
                  getBotaoAcao={getBotaoAcao}
                  atualizarStatus={atualizarStatus}
                  setModalOcorrencia={setModalOcorrencia}
                  destaque
                />
              </div>
            )}

            {/* Proximas Viagens */}
            {proximasViagens.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                  Proximas Viagens
                </h3>
                {proximasViagens.map(viagem => (
                  <ViagemCard 
                    key={viagem.id}
                    viagem={viagem}
                    formatarHora={formatarHora}
                    getStatusLabel={getStatusLabel}
                    getBotaoAcao={getBotaoAcao}
                    atualizarStatus={atualizarStatus}
                    setModalOcorrencia={setModalOcorrencia}
                  />
                ))}
              </div>
            )}

            {/* Concluidas */}
            {viagensConcluidas.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                  Concluidas
                </h3>
                {viagensConcluidas.map(viagem => (
                  <ViagemCard 
                    key={viagem.id}
                    viagem={viagem}
                    formatarHora={formatarHora}
                    getStatusLabel={getStatusLabel}
                    getBotaoAcao={getBotaoAcao}
                    atualizarStatus={atualizarStatus}
                    setModalOcorrencia={setModalOcorrencia}
                  />
                ))}
              </div>
            )}

            {viagens.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666', background: 'white', borderRadius: '12px', marginTop: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <div>Nenhuma viagem para este dia</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Ocorrencia */}
      {modalOcorrencia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px' }}>Registrar Ocorrencia</h3>
            <textarea
              value={textoOcorrencia}
              onChange={(e) => setTextoOcorrencia(e.target.value)}
              placeholder="Descreva a ocorrencia..."
              style={{
                width: '100%', minHeight: '120px', padding: '12px', border: '2px solid #e0e0e0',
                borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setModalOcorrencia(null)} style={{
                flex: 1, padding: '12px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Cancelar
              </button>
              <button onClick={registrarOcorrencia} style={{
                flex: 1, padding: '12px', background: '#e74c3c', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ViagemCard({ viagem, formatarHora, getStatusLabel, getBotaoAcao, atualizarStatus, setModalOcorrencia, destaque }) {
  const botao = getBotaoAcao(viagem)

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: destaque ? '2px solid #27ae60' : 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '18px' }}>{formatarHora(viagem.data_hora)}</div>
          <div style={{
            display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
            background: viagem.status === 'concluida' ? '#d4edda' : '#fff3cd',
            color: viagem.status === 'concluida' ? '#155724' : '#856404'
          }}>
            {getStatusLabel(viagem.status)}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '14px', color: '#666' }}>
          {viagem.num_passageiros} passageiro{viagem.num_passageiros > 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ fontSize: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ color: '#27ae60', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.origem}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ color: '#e74c3c', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.destino}</span>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        <strong>Passageiro:</strong> {viagem.passageiro_nome}
      </div>

      {viagem.voo_numero && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', padding: '8px', background: '#f8f9fa', borderRadius: '6px' }}>
          Voo: {viagem.voo_numero} - {viagem.voo_horario}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {botao && (
          <button
            onClick={() => atualizarStatus(viagem.id, botao.proximo)}
            style={{
              flex: 1, padding: '12px', background: botao.cor, color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', minWidth: '140px'
            }}
          >
            {botao.texto}
          </button>
        )}

        {viagem.passageiro_telefone && (
          <>
            <a href={`tel:${viagem.passageiro_telefone}`} style={{
              padding: '12px 16px', background: '#f0f0f0', borderRadius: '8px', textDecoration: 'none', color: '#333', fontWeight: 500
            }}>
              Tel
            </a>
            <a href={`https://wa.me/55${viagem.passageiro_telefone.replace(/\D/g, '')}`} style={{
              padding: '12px 16px', background: '#25d366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 500
            }}>
              Zap
            </a>
          </>
        )}

        <button onClick={() => setModalOcorrencia(viagem.id)} style={{
          padding: '12px 16px', background: '#fee', color: '#c00', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
        }}>
          !!!
        </button>
      </div>
    </div>
  )
}

export default MotoristaApp