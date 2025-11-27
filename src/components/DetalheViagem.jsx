import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function DetalheViagem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [viagem, setViagem] = useState(null)
  const [ocorrencias, setOcorrencias] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOcorrencia, setShowOcorrencia] = useState(false)
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: 'outro', descricao: '' })

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

  async function vincularMotorista(motoristaId) {
    const { error } = await supabase
      .from('viagens')
      .update({ 
        motorista_id: motoristaId,
        status: 'vinculada'
      })
      .eq('id', id)

    if (error) {
      alert('Erro ao vincular motorista')
    } else {
      const motorista = motoristas.find(m => m.id === motoristaId)
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: `Motorista vinculado: ${motorista?.nome}`
      }])
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
      'cancelada': 'Cancelada'
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
      'outro': 'Outro'
    }
    return tipos[tipo] || tipo
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!viagem) {
    return <div className="loading">Viagem não encontrada</div>
  }

  const { data, hora } = formatarDataHora(viagem.data_hora)

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
        <div style={{ display: 'flex', gap: 12 }}>
          {viagem.status !== 'cancelada' && viagem.status !== 'concluida' && (
            <button className="btn btn-danger" onClick={() => atualizarStatus('cancelada')}>
              Cancelar
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
                <div style={{ fontSize: 15 }}>{viagem.passageiro_telefone}</div>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Passageiros</div>
                <div style={{ fontSize: 15 }}>{viagem.quantidade_passageiros} pessoa(s)</div>
              </div>
              {viagem.valor && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Valor</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--verde-escuro)' }}>R$ {viagem.valor.toFixed(2)}</div>
                </div>
              )}
              {viagem.observacoes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 15 }}>{viagem.observacoes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Motorista */}
          <div className="card-header" style={{ borderTop: '1px solid var(--cinza-medio)' }}>
            <h2 className="card-title">Motorista</h2>
          </div>
          <div className="card-body">
            {viagem.motoristas ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: 'var(--cinza-claro)',
                borderRadius: 8
              }}>
                <div className="driver-avatar">{getIniciais(viagem.motoristas.nome)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{viagem.motoristas.nome}</div>
                  <div style={{ fontSize: 13, color: 'var(--cinza-texto)' }}>{viagem.motoristas.telefone}</div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 12, color: 'var(--cinza-texto)' }}>Nenhum motorista vinculado</p>
                <select 
                  className="form-select" 
                  onChange={(e) => e.target.value && vincularMotorista(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Selecionar motorista...</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Ações de Status */}
          {viagem.status !== 'cancelada' && viagem.status !== 'concluida' && (
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
                    background: oc.tipo === 'atraso_voo' || oc.tipo === 'atraso_motorista' ? '#e67e22' : 'var(--verde-claro)',
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
