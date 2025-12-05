import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { formatarMoeda, getIniciais } from '../utils/formatters'

function PagamentosMotoristas() {
  const { perfil } = useAuth()
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)
  const [selecionados, setSelecionados] = useState({})
  const [modalViagens, setModalViagens] = useState(null)

  // Filtro de período - padrão: última semana (segunda a domingo)
  const [periodo, setPeriodo] = useState(() => {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    // Voltar para segunda-feira passada
    const segundaPassada = new Date(hoje)
    segundaPassada.setDate(hoje.getDate() - diaSemana - 6)
    segundaPassada.setHours(0, 0, 0, 0)
    // Domingo passado
    const domingoPassado = new Date(segundaPassada)
    domingoPassado.setDate(segundaPassada.getDate() + 6)
    domingoPassado.setHours(23, 59, 59, 999)

    return {
      inicio: segundaPassada.toISOString().split('T')[0],
      fim: domingoPassado.toISOString().split('T')[0]
    }
  })

  // Carregar dados apenas no mount inicial
  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)

    // Carregar viagens concluídas com pagamento pendente no período
    const { data: viagensData } = await supabase
      .from('viagens')
      .select('*, motorista:motoristas(*)')
      .eq('status', 'concluida')
      .eq('status_pagamento_motorista', 'pendente')
      .not('motorista_id', 'is', null)
      .gte('data_hora', periodo.inicio)
      .lte('data_hora', periodo.fim + 'T23:59:59')
      .is('deleted_at', null)
      .order('data_hora', { ascending: false })

    setViagens(viagensData || [])
    setLoading(false)
  }

  // Agrupar viagens por motorista
  const viagensPorMotorista = useMemo(() => {
    const grupos = {}

    viagens.forEach(v => {
      if (!v.motorista_id) return

      if (!grupos[v.motorista_id]) {
        grupos[v.motorista_id] = {
          motorista: v.motorista,
          viagens: [],
          valorTotal: 0,
          viagensSemValor: 0
        }
      }

      grupos[v.motorista_id].viagens.push(v)
      grupos[v.motorista_id].valorTotal += parseFloat(v.valor_motorista) || 0

      if (!v.valor_motorista) {
        grupos[v.motorista_id].viagensSemValor++
      }
    })

    return grupos
  }, [viagens])

  // Separar por tipo de pagamento
  const { pagamentoNoDia, pagamentoSemanal, totalSemValor } = useMemo(() => {
    const noDia = []
    const semanal = []
    let semValor = 0

    Object.values(viagensPorMotorista).forEach(grupo => {
      if (grupo.motorista?.pagamento_no_dia) {
        noDia.push(grupo)
      } else {
        semanal.push(grupo)
      }
      semValor += grupo.viagensSemValor
    })

    return {
      pagamentoNoDia: noDia,
      pagamentoSemanal: semanal,
      totalSemValor: semValor
    }
  }, [viagensPorMotorista])

  // Calcular total selecionado
  const totalSelecionado = useMemo(() => {
    let total = 0
    let quantidade = 0

    Object.entries(selecionados).forEach(([motoristaId, selecionado]) => {
      if (selecionado && viagensPorMotorista[motoristaId]) {
        total += viagensPorMotorista[motoristaId].valorTotal
        quantidade++
      }
    })

    return { total, quantidade }
  }, [selecionados, viagensPorMotorista])

  async function marcarComoPago(motoristaId) {
    const grupo = viagensPorMotorista[motoristaId]
    if (!grupo || grupo.viagens.length === 0) return

    // Verificar se há viagens sem valor
    if (grupo.viagensSemValor > 0) {
      alert(`Este motorista tem ${grupo.viagensSemValor} viagem(s) sem valor definido. Defina o valor antes de marcar como pago.`)
      return
    }

    if (!confirm(`Confirmar pagamento de ${formatarMoeda(grupo.valorTotal)} para ${grupo.motorista.nome}?`)) {
      return
    }

    setProcessando(motoristaId)

    try {
      const viagemIds = grupo.viagens.map(v => v.id)

      const { data, error } = await supabase.rpc('marcar_viagens_como_pagas', {
        p_motorista_id: motoristaId,
        p_viagem_ids: viagemIds,
        p_periodo_inicio: periodo.inicio,
        p_periodo_fim: periodo.fim
      })

      if (error) throw error

      alert(`Pagamento registrado!\nValor: ${formatarMoeda(data.valor_total)}\nViagens: ${data.quantidade_viagens}`)
      carregarDados()

    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      alert('Erro ao registrar pagamento: ' + error.message)
    }

    setProcessando(null)
  }

  async function pagarSelecionados() {
    const motoristasParaPagar = Object.entries(selecionados)
      .filter(([, sel]) => sel)
      .map(([id]) => id)

    if (motoristasParaPagar.length === 0) {
      alert('Selecione pelo menos um motorista')
      return
    }

    // Verificar viagens sem valor
    let temSemValor = false
    motoristasParaPagar.forEach(id => {
      if (viagensPorMotorista[id]?.viagensSemValor > 0) {
        temSemValor = true
      }
    })

    if (temSemValor) {
      alert('Alguns motoristas selecionados têm viagens sem valor definido. Corrija antes de prosseguir.')
      return
    }

    if (!confirm(`Confirmar pagamento de ${formatarMoeda(totalSelecionado.total)} para ${totalSelecionado.quantidade} motorista(s)?`)) {
      return
    }

    setProcessando('batch')

    try {
      for (const motoristaId of motoristasParaPagar) {
        const grupo = viagensPorMotorista[motoristaId]
        const viagemIds = grupo.viagens.map(v => v.id)

        await supabase.rpc('marcar_viagens_como_pagas', {
          p_motorista_id: motoristaId,
          p_viagem_ids: viagemIds,
          p_periodo_inicio: periodo.inicio,
          p_periodo_fim: periodo.fim
        })
      }

      alert('Pagamentos registrados com sucesso!')
      setSelecionados({})
      carregarDados()

    } catch (error) {
      console.error('Erro ao pagar em lote:', error)
      alert('Erro ao registrar pagamentos: ' + error.message)
    }

    setProcessando(null)
  }

  function abrirWhatsApp(motorista, valorTotal) {
    const telefone = motorista.telefone?.replace(/\D/g, '')
    if (!telefone) {
      alert('Motorista sem telefone cadastrado')
      return
    }

    const mensagem = `Olá ${motorista.nome}! 💰\n\nPagamento referente às viagens do período ${periodo.inicio} a ${periodo.fim}:\n\n*Valor: ${formatarMoeda(valorTotal)}*\n\n${motorista.chave_pix ? `Chave PIX: ${motorista.chave_pix}` : ''}\n\nÁgua Verde Transfers 🚗`

    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  function toggleSelecao(motoristaId) {
    setSelecionados(prev => ({
      ...prev,
      [motoristaId]: !prev[motoristaId]
    }))
  }

  function selecionarTodos(lista) {
    const novaSel = { ...selecionados }
    lista.forEach(g => {
      novaSel[g.motorista.id] = true
    })
    setSelecionados(novaSel)
  }

  function CardMotorista({ grupo, showCheckbox = false }) {
    const { motorista, viagens: viagensGrupo, valorTotal, viagensSemValor } = grupo
    const isProcessando = processando === motorista.id || processando === 'batch'

    return (
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: viagensSemValor > 0 ? '2px solid #f39c12' : '1px solid #eee'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selecionados[motorista.id] || false}
              onChange={() => toggleSelecao(motorista.id)}
              style={{ width: 20, height: 20 }}
            />
          )}

          {/* Avatar */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#27ae60',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 16,
            overflow: 'hidden'
          }}>
            {motorista.foto_url ? (
              <img src={motorista.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getIniciais(motorista.nome)
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{motorista.nome}</div>
            <div style={{ fontSize: 14, color: '#666' }}>
              {viagensGrupo.length} viagem{viagensGrupo.length !== 1 ? 's' : ''} •
              <span style={{ fontWeight: 600, color: '#27ae60', marginLeft: 4 }}>
                {formatarMoeda(valorTotal)}
              </span>
            </div>
            {motorista.chave_pix && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                PIX: {motorista.chave_pix}
              </div>
            )}
          </div>

          {/* Alerta sem valor */}
          {viagensSemValor > 0 && (
            <div style={{
              background: '#fff3e0',
              color: '#e65100',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500
            }}>
              {viagensSemValor} sem valor
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setModalViagens(grupo)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            Ver viagens
          </button>

          <button
            onClick={() => abrirWhatsApp(motorista, valorTotal)}
            style={{
              padding: '10px 12px',
              background: '#25d366',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            WhatsApp
          </button>

          <button
            onClick={() => marcarComoPago(motorista.id)}
            disabled={isProcessando || viagensSemValor > 0}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: isProcessando || viagensSemValor > 0 ? '#ccc' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: isProcessando || viagensSemValor > 0 ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            {isProcessando ? 'Processando...' : 'Marcar pago'}
          </button>
        </div>
      </div>
    )
  }

  // Verificação de acesso admin
  if (perfil?.tipo !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Acesso restrito</h2>
        <p>Apenas administradores podem acessar esta página.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>💰 Pagamentos a Motoristas</h1>

      {/* Filtro de período */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>De</label>
          <input
            type="date"
            value={periodo.inicio}
            onChange={(e) => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Até</label>
          <input
            type="date"
            value={periodo.fim}
            onChange={(e) => setPeriodo(p => ({ ...p, fim: e.target.value }))}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
          />
        </div>
        <button
          onClick={carregarDados}
          style={{
            padding: '8px 16px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            alignSelf: 'flex-end'
          }}
        >
          Filtrar
        </button>
      </div>

      {/* Alerta viagens sem valor */}
      {totalSemValor > 0 && (
        <div style={{
          background: '#fff3e0',
          border: '1px solid #ffcc80',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <strong style={{ color: '#e65100' }}>Atenção!</strong>
            <p style={{ margin: '4px 0 0', color: '#666' }}>
              {totalSemValor} viagem(s) concluída(s) estão sem valor_motorista definido.
              Edite as viagens para definir o valor antes de marcar como pago.
            </p>
          </div>
        </div>
      )}

      {/* Seção: Pagamento no Dia */}
      {pagamentoNoDia.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#e74c3c', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
              URGENTE
            </span>
            Pagamento no Dia
          </h2>
          {pagamentoNoDia.map(grupo => (
            <CardMotorista key={grupo.motorista.id} grupo={grupo} />
          ))}
        </div>
      )}

      {/* Seção: Pagamento Semanal */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Pagamento Semanal</h2>
          {pagamentoSemanal.length > 0 && (
            <button
              onClick={() => selecionarTodos(pagamentoSemanal)}
              style={{
                padding: '6px 12px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Selecionar todos
            </button>
          )}
        </div>

        {pagamentoSemanal.length === 0 && pagamentoNoDia.length === 0 ? (
          <div style={{
            background: '#f9f9f9',
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            color: '#666'
          }}>
            Nenhum pagamento pendente no período selecionado.
          </div>
        ) : pagamentoSemanal.length === 0 ? null : (
          pagamentoSemanal.map(grupo => (
            <CardMotorista key={grupo.motorista.id} grupo={grupo} showCheckbox />
          ))
        )}

        {/* Barra de ações em lote */}
        {totalSelecionado.quantidade > 0 && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '1px solid #ddd',
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontWeight: 500 }}>
              {totalSelecionado.quantidade} selecionado(s):
              <strong style={{ color: '#27ae60', marginLeft: 8 }}>
                {formatarMoeda(totalSelecionado.total)}
              </strong>
            </span>
            <button
              onClick={pagarSelecionados}
              disabled={processando === 'batch'}
              style={{
                padding: '12px 24px',
                background: processando === 'batch' ? '#ccc' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: processando === 'batch' ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {processando === 'batch' ? 'Processando...' : 'Pagar Selecionados'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de viagens */}
      {modalViagens && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 500,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Viagens de {modalViagens.motorista.nome}</h3>
              <button
                onClick={() => setModalViagens(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong>Total: {formatarMoeda(modalViagens.valorTotal)}</strong>
              <span style={{ color: '#666', marginLeft: 8 }}>
                ({modalViagens.viagens.length} viagens)
              </span>
            </div>

            {modalViagens.viagens.map(v => (
              <div key={v.id} style={{
                padding: 12,
                borderBottom: '1px solid #eee',
                fontSize: 14
              }}>
                <div style={{ fontWeight: 500 }}>{v.passageiro_nome}</div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  {new Date(v.data_hora).toLocaleDateString('pt-BR')} • {v.origem} → {v.destino}
                </div>
                <div style={{
                  color: v.valor_motorista ? '#27ae60' : '#e74c3c',
                  fontWeight: 500,
                  marginTop: 4
                }}>
                  {v.valor_motorista ? formatarMoeda(v.valor_motorista) : 'Sem valor definido'}
                </div>
              </div>
            ))}

            <button
              onClick={() => setModalViagens(null)}
              style={{
                width: '100%',
                padding: 12,
                background: '#f0f0f0',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                marginTop: 16,
                fontWeight: 500
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PagamentosMotoristas
