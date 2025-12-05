import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { formatarHora, getIniciais } from '../utils/formatters'
import {
  ViagemCard,
  CalendarioMensal,
  PerfilMotorista,
  ModalOcorrencia,
  ModalConfirmacao,
  ModalNoShow
} from './motorista'

function MotoristaApp() {
  const { perfil, logout, user } = useAuth()
  const [viagens, setViagens] = useState([])
  const [viagensMes, setViagensMes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [modalOcorrencia, setModalOcorrencia] = useState(null)
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
  const [visualizacao, setVisualizacao] = useState('dia')

  // Modal de confirmação ao finalizar
  const [modalConfirmacao, setModalConfirmacao] = useState(null)

  // Modal de No-Show
  const [modalNoShow, setModalNoShow] = useState(null)

  // Dropdown de notificações
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [viagensNaoLidas, setViagensNaoLidas] = useState([])

  useEffect(() => {
    if (perfil?.motorista_id) {
      carregarViagensNaoLidas()
    }
  }, [perfil])

  useEffect(() => {
    if (perfil?.motorista_id) {
      if (visualizacao === 'dia') {
        carregarViagensDia()
      } else {
        carregarViagensMes()
      }
    }
  }, [perfil, dataAtual, visualizacao])

  async function carregarViagensNaoLidas() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .is('deleted_at', null)
      .in('status', ['vinculada', 'pendente'])
      .gte('data_hora', hoje.toISOString())
      .is('notificacao_lida', null)
      .order('data_hora', { ascending: true })
      .limit(10)

    if (!error) {
      setViagensNaoLidas(data || [])
    }
  }

  async function marcarComoLida(viagemId) {
    const { error } = await supabase
      .from('viagens')
      .update({ notificacao_lida: true })
      .eq('id', viagemId)

    if (!error) {
      setViagensNaoLidas(prev => prev.filter(v => v.id !== viagemId))
    }
  }

  async function marcarTodasComoLidas() {
    const ids = viagensNaoLidas.map(v => v.id)
    if (ids.length === 0) return

    const { error } = await supabase
      .from('viagens')
      .update({ notificacao_lida: true })
      .in('id', ids)

    if (!error) {
      setViagensNaoLidas([])
      setDropdownAberto(false)
    }
  }

  async function carregarViagensDia() {
    setCarregando(true)

    const inicioLocal = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 0, 0, 0)
    const fimLocal = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 23, 59, 59)

    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .is('deleted_at', null)
      .gte('data_hora', inicioLocal.toISOString())
      .lte('data_hora', fimLocal.toISOString())
      .order('data_hora', { ascending: true })

    if (!error) {
      setViagens(data || [])
    }
    setCarregando(false)
  }

  async function carregarViagensMes() {
    setCarregando(true)
    const ano = dataAtual.getFullYear()
    const mes = dataAtual.getMonth()

    const inicioMes = new Date(ano, mes, 1, 0, 0, 0)
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59)

    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .is('deleted_at', null)
      .gte('data_hora', inicioMes.toISOString())
      .lte('data_hora', fimMes.toISOString())
      .order('data_hora', { ascending: true })

    if (!error) {
      setViagensMes(data || [])
    }
    setCarregando(false)
  }

  async function atualizarStatus(viagemId, novoStatus) {
    const agora = new Date().toISOString()

    const updateData = { status: novoStatus }

    switch (novoStatus) {
      case 'a_caminho':
        updateData.timestamp_iniciou_deslocamento = agora
        break
      case 'aguardando_passageiro':
        updateData.timestamp_chegou_local = agora
        break
      case 'em_andamento':
        updateData.timestamp_passageiro_embarcou = agora
        break
    }

    const { error } = await supabase
      .from('viagens')
      .update(updateData)
      .eq('id', viagemId)

    if (!error) {
      const descricaoStatus = {
        'a_caminho': 'Motorista iniciou deslocamento',
        'aguardando_passageiro': 'Motorista chegou no local',
        'em_andamento': 'Passageiro embarcou - Viagem iniciada'
      }

      await supabase.from('ocorrencias').insert([{
        viagem_id: viagemId,
        tipo: 'alteracao_status',
        descricao: descricaoStatus[novoStatus] || `Status alterado para: ${novoStatus}`,
        registrado_por: perfil.nome
      }])

      carregarViagensDia()
    }
  }

  function abrirModalConfirmacao(viagem) {
    setModalConfirmacao(viagem)
  }

  function abrirModalNoShow(viagem) {
    setModalNoShow(viagem)
  }

  function navegarData(dias) {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() + dias)
    setDataAtual(novaData)
  }

  function navegarMes(meses) {
    const novaData = new Date(dataAtual)
    novaData.setMonth(novaData.getMonth() + meses)
    setDataAtual(novaData)
  }

  function selecionarDia(dia) {
    const novaData = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia)
    setDataAtual(novaData)
    setVisualizacao('dia')
  }

  function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatarMes(data) {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  function getBotaoAcao(viagem) {
    switch (viagem.status) {
      case 'vinculada':
        return { texto: 'Iniciar Deslocamento', proximo: 'a_caminho', cor: '#3498db' }
      case 'a_caminho':
        return { texto: 'Cheguei no Local', proximo: 'aguardando_passageiro', cor: '#9b59b6' }
      case 'aguardando_passageiro':
        return { texto: 'Passageiro Embarcou', proximo: 'em_andamento', cor: '#f39c12' }
      case 'em_andamento':
        return { texto: 'Viagem Concluida', proximo: 'concluida', cor: '#27ae60', abreModal: true }
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
      cancelada: 'Cancelada',
      no_show: 'No-Show'
    }
    return labels[status] || status
  }

  function contarViagensDia(dia) {
    const dataStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return viagensMes.filter(v => v.data_hora.startsWith(dataStr)).length
  }

  const viagemAtual = viagens.find(v => ['a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status))
  const proximasViagens = viagens.filter(v => v.status === 'vinculada')
  const viagensConcluidas = viagens.filter(v => v.status === 'concluida' || v.status === 'no_show')

  if (mostrarPerfil) {
    return <PerfilMotorista perfil={perfil} user={user} logout={logout} voltar={() => setMostrarPerfil(false)} getIniciais={getIniciais} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <img src="/logo-agua-verde.jpg" alt="Agua Verde" style={{ height: '40px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sino de notificacao com dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              style={{
                position: 'relative',
                background: dropdownAberto ? '#e8f5e9' : '#f0f0f0',
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
              {viagensNaoLidas.length > 0 && (
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
                  {viagensNaoLidas.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {dropdownAberto && (
              <div style={{
                position: 'fixed',
                top: '60px',
                left: '16px',
                right: '16px',
                maxWidth: '320px',
                marginLeft: 'auto',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Notificações</span>
                  {viagensNaoLidas.length > 0 && (
                    <button
                      onClick={marcarTodasComoLidas}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#27ae60',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {viagensNaoLidas.length === 0 ? (
                  <div style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#999'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                    <div>Nenhuma notificação pendente</div>
                  </div>
                ) : (
                  viagensNaoLidas.map(viagem => (
                    <div
                      key={viagem.id}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f5f5f5',
                        background: '#fffef5'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: '#27ae60'
                        }}>
                          Nova viagem
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(viagem.data_hora).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <strong>{new Date(viagem.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                        {' - '}{viagem.passageiro_nome}
                      </div>

                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        {viagem.origem} → {viagem.destino}
                      </div>

                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                        {viagem.quantidade_passageiros} passageiro{viagem.quantidade_passageiros > 1 ? 's' : ''}
                        {(viagem.bagagens_grandes > 0 || viagem.bagagens_pequenas > 0) && (
                          <span> • {viagem.bagagens_grandes || 0}G + {viagem.bagagens_pequenas || 0}P bagagens</span>
                        )}
                      </div>

                      <button
                        onClick={() => marcarComoLida(viagem.id)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          color: '#555'
                        }}
                      >
                        ✓ Marcar como lida
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setMostrarPerfil(true)}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: perfil?.foto_url ? 'transparent' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 0
            }}
          >
            {perfil?.foto_url ? (
              <img
                src={perfil.foto_url}
                alt={perfil?.nome}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getIniciais(perfil?.nome)
            )}
          </button>
        </div>
      </div>

      {/* Toggle Dia/Mes */}
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={() => setVisualizacao('dia')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            background: visualizacao === 'dia' ? '#27ae60' : '#f0f0f0',
            color: visualizacao === 'dia' ? 'white' : '#333',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Dia
        </button>
        <button
          onClick={() => setVisualizacao('mes')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            background: visualizacao === 'mes' ? '#27ae60' : '#f0f0f0',
            color: visualizacao === 'mes' ? 'white' : '#333',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Mes
        </button>
      </div>

      {visualizacao === 'mes' ? (
        <CalendarioMensal
          dataAtual={dataAtual}
          navegarMes={navegarMes}
          formatarMes={formatarMes}
          contarViagensDia={contarViagensDia}
          selecionarDia={selecionarDia}
          carregando={carregando}
        />
      ) : (
        <>
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
                      abrirModalConfirmacao={abrirModalConfirmacao}
                      abrirModalNoShow={abrirModalNoShow}
                      destaque
                    />
                  </div>
                )}

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
                        abrirModalConfirmacao={abrirModalConfirmacao}
                        abrirModalNoShow={abrirModalNoShow}
                      />
                    ))}
                  </div>
                )}

                {viagensConcluidas.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                      Finalizadas
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
                        abrirModalConfirmacao={abrirModalConfirmacao}
                        abrirModalNoShow={abrirModalNoShow}
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
        </>
      )}

      {/* Modal Ocorrencia */}
      {modalOcorrencia && (
        <ModalOcorrencia
          viagemId={modalOcorrencia}
          perfilNome={perfil.nome}
          onClose={() => setModalOcorrencia(null)}
          onSucesso={carregarViagensDia}
        />
      )}

      {/* Modal Confirmação de Dados */}
      {modalConfirmacao && (
        <ModalConfirmacao
          viagem={modalConfirmacao}
          perfilNome={perfil.nome}
          onClose={() => setModalConfirmacao(null)}
          onSucesso={carregarViagensDia}
        />
      )}

      {/* Modal No-Show */}
      {modalNoShow && (
        <ModalNoShow
          viagem={modalNoShow}
          perfilNome={perfil.nome}
          onClose={() => setModalNoShow(null)}
          onSucesso={carregarViagensDia}
        />
      )}
    </div>
  )
}

export default MotoristaApp
