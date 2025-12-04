import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function DetalheViagem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [viagem, setViagem] = useState(null)
  const [ocorrencias, setOcorrencias] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOcorrencia, setShowOcorrencia] = useState(false)
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: 'outro', descricao: '' })
  const [excluindo, setExcluindo] = useState(false)
  const [vinculacao, setVinculacao] = useState({ motorista_id: '', valor_motorista: '' })

  useEffect(() => {
    fetchViagem()
    fetchMotoristas()
  }, [id])

  async function fetchViagem() {
    setLoading(true)
    
    const { data: viagemData, error: viagemError } = await supabase
      .from('viagens')
      .select('*, motoristas(id, nome, telefone)')
      .eq('id', id)
      .single()

    if (viagemError) {
      console.error('Erro ao buscar viagem:', viagemError)
    } else {
      setViagem(viagemData)
    }

    const { data: ocorrenciasData } = await supabase
      .from('ocorrencias')
      .select('*')
      .eq('viagem_id', id)
      .order('criado_em', { ascending: false })

    setOcorrencias(ocorrenciasData || [])
    setLoading(false)
  }

  async function fetchMotoristas() {
    const { data } = await supabase
      .from('motoristas')
      .select('*')
      .eq('ativo', true)
    setMotoristas(data || [])
  }

  async function atualizarStatus(novoStatus) {
    const { error } = await supabase
      .from('viagens')
      .update({ status: novoStatus })
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar status')
    } else {
      // Registrar ocorrência de alteração de status
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: `Status alterado para: ${formatarStatus(novoStatus)}`
      }])
      fetchViagem()
    }
  }

  async function vincularMotorista(e) {
    e.preventDefault()
    
    if (!vinculacao.motorista_id) {
      alert('Selecione um motorista')
      return
    }

    const updateData = { 
      motorista_id: vinculacao.motorista_id,
      status: 'vinculada'
    }

    // Adiciona valor_motorista se foi informado
    if (vinculacao.valor_motorista) {
      updateData.valor_motorista = parseFloat(vinculacao.valor_motorista)
    }

    const { error } = await supabase
      .from('viagens')
      .update(updateData)
      .eq('id', id)

    if (error) {
      alert('Erro ao vincular motorista')
    } else {
      const motorista = motoristas.find(m => m.id === vinculacao.motorista_id)
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: `Motorista vinculado: ${motorista?.nome}`
      }])
      setVinculacao({ motorista_id: '', valor_motorista: '' })
      fetchViagem()
    }
  }

  async function salvarOcorrencia(e) {
    e.preventDefault()

    const { error } = await supabase.from('ocorrencias').insert([{
      viagem_id: parseInt(id),
      tipo: novaOcorrencia.tipo,
      descricao: novaOcorrencia.descricao
    }])

    if (error) {
      alert('Erro ao registrar ocorrência')
    } else {
      setNovaOcorrencia({ tipo: 'outro', descricao: '' })
      setShowOcorrencia(false)
      fetchViagem()
    }
  }

  async function excluirViagem() {
    if (!confirm('Tem certeza que deseja excluir esta viagem? Esta ação não pode ser desfeita.')) {
      return
    }

    setExcluindo(true)

    const { error } = await supabase
      .from('viagens')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('Erro ao excluir viagem')
      setExcluindo(false)
    } else {
      navigate('/viagens')
    }
  }

  function formatarDataHora(dataHora) {
    const data = new Date(dataHora)
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      relativo: formatarTempo(data)
    }
  }

  function formatarTempo(data) {
    const agora = new Date()
    const diff = agora - data
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)

    if (dias > 0) return `Há ${dias} dia${dias > 1 ? 's' : ''}`
    if (horas > 0) return `Há ${horas} hora${horas > 1 ? 's' : ''}`
    if (minutos > 0) return `Há ${minutos} min`
    return 'Agora'
  }

  function formatarStatus(status) {
    const statusMap = {
      'pendente': 'Pendente',
      'vinculada': 'Vinculada',
      'a_caminho': 'A Caminho',
      'aguardando_passageiro': 'Aguardando Passageiro',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada',
      'no_show': 'No-Show'
    }
    return statusMap[status] || status
  }

  function getIniciais(nome) {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  function getTipoOcorrencia(tipo) {
    const tipos = {
      'atraso_voo': 'Atraso de voo',
      'atraso_motorista': 'Atraso do motorista',
      'atraso_passageiro': 'Atraso do passageiro',
      'cancelamento': 'Cancelamento',
      'alteracao_status': 'Alteração de status',
      'no_show': 'No-Show',
      'outro': 'Outro'
    }
    return tipos[tipo] || tipo
  }

  function formatarValor(valor, moeda) {
    const simbolos = {
      'BRL': 'R$',
      'USD': 'US$',
      'EUR': 'EUR'
    }
    const simbolo = simbolos[moeda] || moeda || 'R$'
    return `${simbolo} ${valor.toFixed(2)}`
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!viagem) {
    return <div className="loading">Viagem não encontrada</div>
  }

  const { data, hora } = formatarDataHora(viagem.data_hora)
  const totalBagagens = (viagem.bagagens_grandes || 0) + (viagem.bagagens_pequenas || 0)

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="page-title">Viagem #{viagem.id}</h1>
            <p style={{ fontSize: 14, color: 'var(--cinza-texto)' }}>
              Criada em {formatarDataHora(viagem.criado_em).data}
            </p>
          </div>
        </div>
       <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
  <button className="btn btn-secondary" onClick={() => navigate(`/viagens/${id}/editar`)}>
    Editar
  </button>
  {viagem.status !== 'cancelada' && viagem.status !== 'concluida' && viagem.status !== 'no_show' && (
    <button className="btn btn-danger" onClick={() => atualizarStatus('cancelada')}>
      Cancelar
    </button>
  )}
  {isAdmin && (
    <button
      onClick={excluirViagem}
      disabled={excluindo}
      title="Excluir viagem"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        padding: 0,
        border: '1px solid #dc3545',
        borderRadius: 8,
        background: 'transparent',
        cursor: excluindo ? 'not-allowed' : 'pointer',
        opacity: excluindo ? 0.6 : 1
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#dc3545', strokeWidth: 2, fill: 'none' }}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
    </button>
  )}
</div>
      </header>

      <div className="content-grid">
        {/* Main Info */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Informações da Viagem</h2>
            <span className={`status-badge status-${viagem.status}`}>
              {formatarStatus(viagem.status)}
            </span>
          </div>
          <div className="card-body">
            {/* No-Show Alert */}
            {viagem.no_show && (
              <div style={{
                padding: 16,
                background: '#ffebee',
                borderRadius: 8,
                marginBottom: 24,
                border: '1px solid #ffcdd2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: '#c62828' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span style={{ fontWeight: 600, color: '#c62828', fontSize: 16 }}>Passageiro não compareceu (No-Show)</span>
                </div>
                {viagem.no_show_timestamp && (
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    Registrado em: {new Date(viagem.no_show_timestamp).toLocaleString('pt-BR')}
                  </div>
                )}
                {viagem.no_show_endereco && (
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                    Local: {viagem.no_show_endereco}
                  </div>
                )}
                {viagem.no_show_foto_url && (
                  <a 
                    href={viagem.no_show_foto_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      background: '#c62828',
                      color: 'white',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'white' }}>
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    Ver foto comprovante
                  </a>
                )}
              </div>
            )}

            {/* Dados Confirmados pelo Motorista */}
            {viagem.dados_confirmados && (
              <div style={{
                padding: 16,
                background: '#e8f5e9',
                borderRadius: 8,
                marginBottom: 24,
                border: '1px solid #c8e6c9'
              }}>
                <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#2e7d32' }}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Dados confirmados pelo motorista
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                  <div>
                    <span style={{ color: '#666' }}>Passageiros: </span>
                    <strong>{viagem.passageiros_confirmados || viagem.quantidade_passageiros}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Bagagens grandes: </span>
                    <strong>{viagem.bagagens_grandes_confirmadas ?? viagem.bagagens_grandes ?? 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Bagagens pequenas: </span>
                    <strong>{viagem.bagagens_pequenas_confirmadas ?? viagem.bagagens_pequenas ?? 0}</strong>
                  </div>
                  {viagem.horario_saida_real && (
                    <div>
                      <span style={{ color: '#666' }}>Saída real: </span>
                      <strong>{new Date(viagem.horario_saida_real).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                  )}
                  {viagem.horario_chegada_real && (
                    <div>
                      <span style={{ color: '#666' }}>Chegada real: </span>
                      <strong>{new Date(viagem.horario_chegada_real).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline de Timestamps da Viagem */}
            {(viagem.timestamp_iniciou_deslocamento || viagem.timestamp_chegou_local || viagem.timestamp_passageiro_embarcou || viagem.timestamp_viagem_concluida) && (
              <div style={{
                padding: 16,
                background: '#e3f2fd',
                borderRadius: 8,
                marginBottom: 24,
                border: '1px solid #bbdefb'
              }}>
                <div style={{ fontWeight: 600, color: '#1565c0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#1565c0' }}>
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  Timestamps da Viagem
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {viagem.timestamp_iniciou_deslocamento && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#3498db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
                          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Iniciou Deslocamento</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {new Date(viagem.timestamp_iniciou_deslocamento).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  )}
                  {viagem.timestamp_chegou_local && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#9b59b6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Chegou no Local</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {new Date(viagem.timestamp_chegou_local).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  )}
                  {viagem.timestamp_passageiro_embarcou && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#f39c12',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Passageiro Embarcou</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {new Date(viagem.timestamp_passageiro_embarcou).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  )}
                  {viagem.timestamp_viagem_concluida && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#27ae60',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Viagem Concluida</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {new Date(viagem.timestamp_viagem_concluida).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Route */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 20,
              background: 'var(--cinza-claro)',
              borderRadius: 8,
              marginBottom: 24
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Origem</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{viagem.origem}</div>
              </div>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--verde-escuro)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: 'white', strokeWidth: 2, fill: 'none' }}>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Destino</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{viagem.destino}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Passageiro</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--verde-escuro)' }}>{viagem.passageiro_nome}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Telefone</div>
                <div style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {viagem.passageiro_telefone}
                  {viagem.compartilhar_telefone && (
                    <span style={{ 
                      fontSize: 10, 
                      padding: '2px 6px', 
                      background: '#e8f5e9', 
                      color: '#2e7d32', 
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      Compartilhado
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Data</div>
                <div style={{ fontSize: 15 }}>{data}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Horário</div>
                <div style={{ fontSize: 15 }}>{hora}</div>
              </div>
              {viagem.voo_numero && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Voo</div>
                  <div style={{ fontSize: 15 }}>{viagem.voo_numero} ({viagem.voo_companhia})</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Bagagens</div>
                <div style={{ fontSize: 15 }}>
                  {totalBagagens > 0 ? (
                    <>
                      {viagem.bagagens_grandes > 0 && <span>{viagem.bagagens_grandes} grande{viagem.bagagens_grandes > 1 ? 's' : ''}</span>}
                      {viagem.bagagens_grandes > 0 && viagem.bagagens_pequenas > 0 && ' + '}
                      {viagem.bagagens_pequenas > 0 && <span>{viagem.bagagens_pequenas} pequena{viagem.bagagens_pequenas > 1 ? 's' : ''}</span>}
                      <span style={{ color: 'var(--cinza-texto)', marginLeft: 8 }}>({totalBagagens} total)</span>
                    </>
                  ) : (
                    'Não informado'
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Passageiros</div>
                <div style={{ fontSize: 15 }}>{viagem.quantidade_passageiros} pessoa(s)</div>
              </div>
              {viagem.valor && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Valor Fornecedor</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--verde-escuro)' }}>{formatarValor(viagem.valor, viagem.moeda)}</div>
                </div>
              )}
              {viagem.valor_motorista && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Repasse Motorista</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3498db' }}>R$ {viagem.valor_motorista.toFixed(2)}</div>
                </div>
              )}
              {viagem.observacoes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 15 }}>{viagem.observacoes}</div>
                </div>
              )}
            </div>

            {/* Notificar Cliente */}
            {viagem.passageiro_telefone && (
              <div style={{ 
                marginTop: 24, 
                padding: 16, 
                background: '#e3f2fd', 
                borderRadius: 8, 
                border: '1px solid #bbdefb' 
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: '#1565c0' }}>
                  📱 Notificar Cliente
                </div>
                <button
                  onClick={() => {
                    const link = `https://agua-verde-app.vercel.app/acompanhar/${viagem.token_cliente || viagem.id}`
                    
                    let mensagem = `Ola ${viagem.passageiro_nome}!%0A%0A🚗 *Água Verde Turismo*%0A%0A📅 *Data:* ${data}%0A⏰ *Horário:* ${hora}%0A📍 *Origem:* ${viagem.origem}%0A📍 *Destino:* ${viagem.destino}`
                    
                    if (viagem.motoristas) {
                      mensagem += `%0A%0A👤 *Motorista:* ${viagem.motoristas.nome}`
                    }
                    
                    mensagem += `%0A%0A🔗 *Acompanhe sua viagem:*%0A${link}`
                    
                    let telefone = viagem.passageiro_telefone.replace(/\D/g, '')
                    // Se tiver 10 ou 11 dígitos, é número brasileiro sem código do país
                    // Se tiver mais, já tem código do país (ex: +54 Argentina)
                    if (telefone.length <= 11) {
                      telefone = '55' + telefone
                    }
                    console.log('Telefone cliente formatado:', telefone)
                    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: 12,
                    background: '#25d366',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar WhatsApp para Cliente
                </button>

                {viagem.token_cliente && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                    <strong>Link de acompanhamento:</strong>
                    <div style={{ 
                      marginTop: 4, 
                      padding: 8, 
                      background: 'white', 
                      borderRadius: 4, 
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: 11
                    }}>
                      https://agua-verde-app.vercel.app/acompanhar/{viagem.token_cliente}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Motorista */}
          <div className="card-header" style={{ borderTop: '1px solid var(--cinza-medio)' }}>
            <h2 className="card-title">Motorista</h2>
          </div>
          <div className="card-body">
            {viagem.motoristas ? (
  <div>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      background: 'var(--cinza-claro)',
      borderRadius: 8,
      marginBottom: 12
    }}>
      <div className="driver-avatar">{getIniciais(viagem.motoristas.nome)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{viagem.motoristas.nome}</div>
        <div style={{ fontSize: 13, color: 'var(--cinza-texto)' }}>{viagem.motoristas.telefone}</div>
      </div>
    </div>
    <button
      onClick={() => {
       const mensagem = `🚗 *Nova viagem atribuída!*%0A%0A📅 *Data:* ${data} as ${hora}%0A📍 *Origem:* ${viagem.origem}%0A📍 *Destino:* ${viagem.destino}%0A👤 *Passageiro:* ${viagem.passageiro_nome}%0A👥 *Quantidade:* ${viagem.quantidade_passageiros} pessoa(s)%0A🧳 *Bagagens:* ${(viagem.bagagens_grandes || 0)} grande(s) + ${(viagem.bagagens_pequenas || 0)} pequena(s)%0A%0A🔗 Acesse o app: https://agua-verde-app.vercel.app/`
        let telefone = viagem.motoristas.telefone.replace(/\D/g, '')
        // Se tiver 10 ou 11 dígitos, é número brasileiro sem código do país
        // Se tiver 12 ou 13 dígitos e começar com 55, já tem código do país
        if (telefone.length <= 11) {
          telefone = '55' + telefone
        }
        console.log('Telefone formatado:', telefone)
        window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank')
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: 12,
        background: '#25d366',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Notificar Motorista
    </button>
  </div>
) : (
              <form onSubmit={vincularMotorista}>
                <p style={{ marginBottom: 12, color: 'var(--cinza-texto)' }}>Nenhum motorista vinculado</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--cinza-texto)', marginBottom: 4 }}>Motorista</label>
                    <select 
                      className="form-select" 
                      value={vinculacao.motorista_id}
                      onChange={(e) => setVinculacao({ ...vinculacao, motorista_id: e.target.value })}
                    >
                      <option value="">Selecionar motorista...</option>
                      {motoristas.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--cinza-texto)', marginBottom: 4 }}>Valor a pagar ao motorista (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="Ex: 80.00"
                      value={vinculacao.valor_motorista}
                      onChange={(e) => setVinculacao({ ...vinculacao, valor_motorista: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!vinculacao.motorista_id}
                    style={{ opacity: vinculacao.motorista_id ? 1 : 0.6 }}
                  >
                    Vincular Motorista
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Ações de Status */}
          {viagem.status !== 'cancelada' && viagem.status !== 'concluida' && viagem.status !== 'no_show' && (
            <>
              <div className="card-header" style={{ borderTop: '1px solid var(--cinza-medio)' }}>
                <h2 className="card-title">Atualizar Status</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {viagem.status === 'vinculada' && (
                    <button className="btn btn-primary" onClick={() => atualizarStatus('a_caminho')}>
                      A Caminho
                    </button>
                  )}
                  {viagem.status === 'a_caminho' && (
                    <button className="btn btn-primary" onClick={() => atualizarStatus('aguardando_passageiro')}>
                      Aguardando Passageiro
                    </button>
                  )}
                  {(viagem.status === 'aguardando_passageiro' || viagem.status === 'a_caminho') && (
                    <button className="btn btn-primary" onClick={() => atualizarStatus('em_andamento')}>
                      Iniciar Viagem
                    </button>
                  )}
                  {viagem.status === 'em_andamento' && (
                    <button className="btn btn-primary" style={{ background: 'var(--verde-escuro)' }} onClick={() => atualizarStatus('concluida')}>
                      Concluir Viagem
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Histórico</h2>
          </div>
          <div className="card-body">
            <div style={{ position: 'relative' }}>
              {ocorrencias.map((oc, index) => (
                <div key={oc.id} style={{
                  display: 'flex',
                  gap: 16,
                  paddingBottom: index < ocorrencias.length - 1 ? 24 : 0,
                  position: 'relative'
                }}>
                  {index < ocorrencias.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: 15,
                      top: 36,
                      width: 2,
                      height: 'calc(100% - 36px)',
                      background: 'var(--cinza-medio)'
                    }} />
                  )}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: oc.tipo === 'atraso_voo' || oc.tipo === 'atraso_motorista' ? '#e67e22' : oc.tipo === 'no_show' ? '#c62828' : 'var(--verde-claro)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'white', strokeWidth: 2, fill: 'none' }}>
                      {oc.tipo.includes('atraso') ? (
                        <>
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </>
                      ) : oc.tipo === 'no_show' ? (
                        <>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </>
                      ) : (
                        <polyline points="20 6 9 17 4 12"/>
                      )}
                    </svg>
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{getTipoOcorrencia(oc.tipo)}</div>
                    <div style={{ fontSize: 13, color: 'var(--cinza-texto)', marginBottom: 4 }}>{oc.descricao}</div>
                    <div style={{ fontSize: 12, color: 'var(--cinza-texto)' }}>{formatarDataHora(oc.criado_em).relativo}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Occurrence */}
            {!showOcorrencia ? (
              <button 
                onClick={() => setShowOcorrencia(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: 14,
                  border: '2px dashed var(--cinza-medio)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--cinza-texto)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: 20
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Registrar Ocorrência
              </button>
            ) : (
              <form onSubmit={salvarOcorrencia} style={{ marginTop: 20, padding: 16, background: 'var(--cinza-claro)', borderRadius: 8 }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Tipo</label>
                  <select 
                    className="form-select"
                    value={novaOcorrencia.tipo}
                    onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, tipo: e.target.value })}
                  >
                    <option value="atraso_voo">Atraso de voo</option>
                    <option value="atraso_motorista">Atraso do motorista</option>
                    <option value="atraso_passageiro">Atraso do passageiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-textarea"
                    value={novaOcorrencia.descricao}
                    onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, descricao: e.target.value })}
                    placeholder="Descreva a ocorrência..."
                    required
                    style={{ minHeight: 80 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOcorrencia(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salvar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default DetalheViagem
