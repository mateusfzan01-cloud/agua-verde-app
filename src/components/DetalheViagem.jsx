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
  const [linkCopiado, setLinkCopiado] = useState(false)

  useEffect(() => {
    fetchViagem()
    fetchMotoristas()
  }, [id])

  async function fetchViagem() {
    setLoading(true)

    const { data: viagemData, error: viagemError } = await supabase
      .from('viagens')
      .select('*, motoristas(id, nome, telefone, marca_modelo, cor, placa), avaliacoes(*)')
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
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: `Status alterado para: ${formatarStatus(novoStatus)}`
      }])

      // Notificar cliente sobre mudanca de status
      await supabase.from('notificacoes').insert([{
        viagem_id: parseInt(id),
        tipo: 'cliente',
        mensagem: getMessagemStatus(novoStatus)
      }])

      fetchViagem()
    }
  }

  function getMessagemStatus(status) {
    const mensagens = {
      'vinculada': '✓ Sua viagem foi confirmada!',
      'a_caminho': '🚗 O motorista está a caminho!',
      'aguardando_passageiro': '📍 O motorista chegou no local!',
      'em_andamento': '🛣️ Viagem em andamento!',
      'concluida': '✅ Viagem concluída! Obrigado por viajar conosco.',
      'cancelada': '❌ Sua viagem foi cancelada.'
    }
    return mensagens[status] || 'Status atualizado'
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

      // Notificar motorista
      const { data, hora } = formatarDataHora(viagem.data_hora)
      await supabase.from('notificacoes').insert([{
        motorista_id: motoristaId,
        viagem_id: parseInt(id),
        tipo: 'motorista',
        mensagem: `Nova viagem: ${viagem.origem} → ${viagem.destino} em ${data} as ${hora}`
      }])

      // Notificar cliente
      await supabase.from('notificacoes').insert([{
        viagem_id: parseInt(id),
        tipo: 'cliente',
        mensagem: `✓ Motorista ${motorista?.nome} foi designado para sua viagem!`
      }])

      fetchViagem()
    }
  }

  async function marcarComoPago() {
    const { error } = await supabase
      .from('viagens')
      .update({ 
        pago: true,
        data_pagamento: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      alert('Erro ao marcar como pago')
    } else {
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: 'Viagem marcada como PAGA'
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
      alert('Erro ao registrar ocorrencia')
    } else {
      setNovaOcorrencia({ tipo: 'outro', descricao: '' })
      setShowOcorrencia(false)
      fetchViagem()
    }
  }

  function copiarLinkCliente() {
    const link = `${window.location.origin}/acompanhar/${viagem.token_cliente}`
    navigator.clipboard.writeText(link)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  function notificarClienteWhatsApp() {
    const { data, hora } = formatarDataHora(viagem.data_hora)
    const link = `${window.location.origin}/acompanhar/${viagem.token_cliente}`
    
    let mensagem = `🚗 *Água Verde Transfers*%0A%0AOlá ${viagem.passageiro_nome}!%0A%0A📅 *Data:* ${data}%0A⏰ *Horário:* ${hora}%0A📍 *Origem:* ${viagem.origem}%0A📍 *Destino:* ${viagem.destino}`
    
    if (viagem.motoristas) {
      mensagem += `%0A%0A👤 *Motorista:* ${viagem.motoristas.nome}`
      if (viagem.motoristas.marca_modelo) {
        mensagem += `%0A🚗 *Veículo:* ${viagem.motoristas.marca_modelo}`
        if (viagem.motoristas.cor) mensagem += ` - ${viagem.motoristas.cor}`
      }
      if (viagem.motoristas.placa) {
        mensagem += `%0A🔢 *Placa:* ${viagem.motoristas.placa}`
      }
    }
    
    mensagem += `%0A%0A🔗 Acompanhe sua viagem:%0A${link}`
    
    const telefone = viagem.passageiro_telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank')
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

    if (dias > 0) return `Ha ${dias} dia${dias > 1 ? 's' : ''}`
    if (horas > 0) return `Ha ${horas} hora${horas > 1 ? 's' : ''}`
    if (minutos > 0) return `Ha ${minutos} min`
    return 'Agora'
  }

  function formatarStatus(status) {
    const statusMap = {
      'pendente': 'Pendente',
      'vinculada': 'Vinculada',
      'a_caminho': 'A Caminho',
      'aguardando_passageiro': 'Aguardando Passageiro',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluida',
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
      'alteracao_status': 'Alteracao de status',
      'outro': 'Outro'
    }
    return tipos[tipo] || tipo
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!viagem) {
    return <div className="loading">Viagem nao encontrada</div>
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
          <button className="btn btn-secondary" onClick={() => navigate(`/viagens/${id}/editar`)}>
            Editar
          </button>
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
            <h2 className="card-title">Informacoes da Viagem</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`status-badge status-${viagem.status}`}>
                {formatarStatus(viagem.status)}
              </span>
              {viagem.pago && (
                <span style={{
                  background: '#27ae60',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  PAGO
                </span>
              )}
            </div>
          </div>
          <div className="card-body">
            {/* Link do cliente */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: '#e3f2fd',
              borderRadius: 8
            }}>
              <button
                onClick={copiarLinkCliente}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: linkCopiado ? '#27ae60' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {linkCopiado ? '✓ Link Copiado!' : '📋 Copiar Link do Cliente'}
              </button>
              <button
                onClick={notificarClienteWhatsApp}
                style={{
                  padding: '10px 16px',
                  background: '#25d366',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'white' }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar ao Cliente
              </button>
            </div>

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
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Horario</div>
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
                <div style={{ fontSize: 15 }}>{viagem.quantidade_bagagens || 0} volume(s)</div>
              </div>
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 4 }}>Observacoes</div>
                  <div style={{ fontSize: 15 }}>{viagem.observacoes}</div>
                </div>
              )}
            </div>

            {/* Avaliacao do cliente */}
            {viagem.avaliacoes && viagem.avaliacoes.length > 0 && (
              <div style={{
                marginTop: 24,
                padding: 16,
                background: '#fff8e1',
                borderRadius: 8
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cinza-texto)', textTransform: 'uppercase', marginBottom: 8 }}>Avaliacao do Cliente</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} style={{ fontSize: 20, opacity: n <= viagem.avaliacoes[0].nota ? 1 : 0.3 }}>⭐</span>
                  ))}
                  <span style={{ marginLeft: 8, fontWeight: 600 }}>{viagem.avaliacoes[0].nota}/5</span>
                </div>
                {viagem.avaliacoes[0].comentario && (
                  <div style={{ marginTop: 8, fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                    "{viagem.avaliacoes[0].comentario}"
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
                    {viagem.motoristas.marca_modelo && (
                      <div style={{ fontSize: 13, color: 'var(--cinza-texto)', marginTop: 4 }}>
                        {viagem.motoristas.marca_modelo}
                        {viagem.motoristas.cor && ` - ${viagem.motoristas.cor}`}
                        {viagem.motoristas.placa && ` | ${viagem.motoristas.placa}`}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const mensagem = `🚗 *Nova viagem atribuida!*%0A%0A📅 *Data:* ${data} as ${hora}%0A📍 *Origem:* ${viagem.origem}%0A📍 *Destino:* ${viagem.destino}%0A👤 *Passageiro:* ${viagem.passageiro_nome}%0A👥 *Quantidade:* ${viagem.quantidade_passageiros} pessoa(s)%0A🧳 *Bagagens:* ${viagem.quantidade_bagagens || 0}%0A💰 *Valor:* R$ ${viagem.valor ? viagem.valor.toFixed(2) : '0.00'}%0A%0A🔗 Acesse o app: https://agua-verde-app-ib8w.vercel.app/`
                    const telefone = viagem.motoristas.telefone.replace(/\D/g, '')
                    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank')
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
              <div>
                <p style={{ marginBottom: 12, color: 'var(--cinza-texto)' }}>Nenhum motorista vinculado</p>
                <select
                  className="form-select"
                  onChange={(e) => e.target.value && vincularMotorista(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Selecionar motorista...</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {m.marca_modelo && `(${m.marca_modelo})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pagamento */}
          {viagem.status === 'concluida' && !viagem.pago && (
            <>
              <div className="card-header" style={{ borderTop: '1px solid var(--cinza-medio)' }}>
                <h2 className="card-title">Pagamento</h2>
              </div>
              <div className="card-body">
                <button
                  onClick={marcarComoPago}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: 14,
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Marcar como Pago (R$ {viagem.valor ? viagem.valor.toFixed(2) : '0.00'})
                </button>
              </div>
            </>
          )}

          {/* Acoes de Status */}
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
            <h2 className="card-title">Historico</h2>
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
                Registrar Ocorrencia
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
                  <label className="form-label">Descricao</label>
                  <textarea
                    className="form-textarea"
                    value={novaOcorrencia.descricao}
                    onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, descricao: e.target.value })}
                    placeholder="Descreva a ocorrencia..."
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