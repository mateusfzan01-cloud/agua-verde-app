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
        return { texto: 'Iniciar Deslocamento', proximo: 'a_caminho', cor: '#3adb34' }
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
  padding: '10px 14px', background: '#25d366', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center'
}}>
  <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: 'white' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
</a>
          </>
        )}

        <button onClick={() => setModalOcorrencia(viagem.id)} style={{
          padding: '12px 16px', background: '#fee', color: '#c00', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
        }}>
          Ocorrência
        </button>
      </div>
    </div>
  )
}

export default MotoristaApp