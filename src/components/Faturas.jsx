import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { formatarMoeda } from '../utils/formatters'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Dados da empresa Água Verde
const EMPRESA = {
  nome: 'Água Verde – Viagens & Receptivos',
  endereco: 'Rua Jonatas de Vasconcelos, 788',
  cidade: 'Boa Viagem - Pernambuco - Brasil',
  telefone: '(81) 3033-0245',
  cnpj: '17.427.292/0001-46',
  inscricaoEstadual: 'Isento'
}

function Faturas() {
  const { perfil } = useAuth()
  const [loading, setLoading] = useState(true)
  const [fornecedores, setFornecedores] = useState([])
  const [faturas, setFaturas] = useState([])

  // Estados para gerar nova fatura
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [viagensBuscadas, setViagensBuscadas] = useState([])
  const [viagensSelecionadas, setViagensSelecionadas] = useState({})
  const [buscandoViagens, setBuscandoViagens] = useState(false)
  const [numeroReferencia, setNumeroReferencia] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [gerandoFatura, setGerandoFatura] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)

    // Carregar fornecedores ativos
    const { data: fornecedoresData } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    setFornecedores(fornecedoresData || [])

    // Carregar faturas existentes
    const { data: faturasData } = await supabase
      .from('faturas')
      .select('*, fornecedor:fornecedores(nome, moeda_padrao)')
      .order('criado_em', { ascending: false })

    setFaturas(faturasData || [])
    setLoading(false)
  }

  // Quando seleciona fornecedor, auto-preenche data de vencimento
  function handleFornecedorChange(fornecedorId) {
    setFornecedorSelecionado(fornecedorId)
    setViagensBuscadas([])
    setViagensSelecionadas({})

    if (fornecedorId) {
      const fornecedor = fornecedores.find(f => f.id === fornecedorId)
      if (fornecedor) {
        const hoje = new Date()
        const vencimento = new Date(hoje)
        vencimento.setDate(hoje.getDate() + (fornecedor.prazo_pagamento_dias || 30))
        setDataVencimento(vencimento.toISOString().split('T')[0])
      }
    }
  }

  async function buscarViagens() {
    if (!fornecedorSelecionado || !periodoInicio || !periodoFim) {
      alert('Selecione o fornecedor e o período')
      return
    }

    setBuscandoViagens(true)

    const { data, error } = await supabase
      .from('viagens')
      .select('*, motorista:motoristas(nome)')
      .eq('fornecedor_id', fornecedorSelecionado)
      .eq('status_faturamento', 'pendente')
      .gte('data_hora', periodoInicio)
      .lte('data_hora', periodoFim + 'T23:59:59')
      .is('deleted_at', null)
      .order('data_hora', { ascending: true })

    if (error) {
      console.error('Erro ao buscar viagens:', error)
      alert('Erro ao buscar viagens')
    } else {
      setViagensBuscadas(data || [])
      // Selecionar todas por padrão
      const selecionadas = {}
      data?.forEach(v => {
        selecionadas[v.id] = true
      })
      setViagensSelecionadas(selecionadas)
    }

    setBuscandoViagens(false)
  }

  function toggleViagem(viagemId) {
    setViagensSelecionadas(prev => ({
      ...prev,
      [viagemId]: !prev[viagemId]
    }))
  }

  function selecionarTodasViagens() {
    const selecionadas = {}
    viagensBuscadas.forEach(v => {
      selecionadas[v.id] = true
    })
    setViagensSelecionadas(selecionadas)
  }

  function desselecionarTodasViagens() {
    setViagensSelecionadas({})
  }

  // Viagens selecionadas e cálculos
  function getViagensSelecionadas() {
    return viagensBuscadas.filter(v => viagensSelecionadas[v.id])
  }

  function calcularTotal() {
    return getViagensSelecionadas().reduce((acc, v) => {
      // Viagens canceladas não contam no valor
      if (v.status === 'cancelada') return acc
      return acc + (parseFloat(v.valor) || 0)
    }, 0)
  }

  // Gerar PDF
  function gerarPDF(fatura = null, viagens = null) {
    const fornecedor = fornecedores.find(f => f.id === (fatura?.fornecedor_id || fornecedorSelecionado))
    if (!fornecedor) return

    const viagensParaPDF = viagens || getViagensSelecionadas()
    const valorTotal = fatura?.valor_total || calcularTotal()
    const moeda = fornecedor.moeda_padrao || 'BRL'

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(EMPRESA.nome, 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(EMPRESA.endereco, 14, 27)
    doc.text(EMPRESA.cidade, 14, 32)
    doc.text(EMPRESA.telefone, 14, 37)
    doc.text(`CNPJ: ${EMPRESA.cnpj}`, 14, 42)
    doc.text(`Inscrição Estadual: ${EMPRESA.inscricaoEstadual}`, 14, 47)

    // Dados da fatura (lado direito)
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const vencimento = fatura?.data_vencimento
      ? new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')
      : (dataVencimento ? new Date(dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-')

    doc.setFont('helvetica', 'bold')
    doc.text(`Data: ${dataAtual}`, pageWidth - 60, 20)
    doc.text(`FATURA`, pageWidth - 60, 27)
    if (numeroReferencia || fatura?.observacoes) {
      doc.text(`REF: ${fatura?.observacoes || numeroReferencia}`, pageWidth - 60, 34)
    }
    doc.text(`Vencimento: ${vencimento}`, pageWidth - 60, 41)

    // Dados do fornecedor
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('FATURAR PARA:', pageWidth - 60, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(fornecedor.nome_legal || fornecedor.nome, pageWidth - 60, 62)
    if (fornecedor.identificador_fiscal) {
      doc.text(fornecedor.identificador_fiscal, pageWidth - 60, 69)
    }
    if (fornecedor.endereco) {
      const enderecoLines = doc.splitTextToSize(fornecedor.endereco, 55)
      doc.text(enderecoLines, pageWidth - 60, 76)
    }

    // Tabela de viagens
    let tableColumns, tableData

    if (fornecedor.nome.toLowerCase().includes('ineed')) {
      // Layout iNeedTours
      tableColumns = ['#', 'Nº Reserva', 'Passageiro', 'Data', 'Pax', 'Origem', 'Destino', 'Status', 'Valor']
      tableData = viagensParaPDF.map((v, idx) => {
        const isCancelada = v.status === 'cancelada'
        return [
          idx + 1,
          v.numero_reserva || '-',
          v.passageiro_nome || '-',
          new Date(v.data_hora).toLocaleDateString('pt-BR'),
          v.quantidade_passageiros || 1,
          v.origem || '-',
          v.destino || '-',
          isCancelada ? '✗' : '✓',
          isCancelada ? 'R$ 0,00' : formatarMoeda(v.valor)
        ]
      })
    } else {
      // Layout FoxTransfer
      tableColumns = ['Nº Reserva', 'Nome', 'Pax', 'Origem', 'Destino', 'Hora', 'Status', 'Valor']
      tableData = viagensParaPDF.map(v => {
        const isCancelada = v.status === 'cancelada'
        return [
          v.numero_reserva || '-',
          v.passageiro_nome || '-',
          v.quantidade_passageiros || 1,
          v.origem || '-',
          v.destino || '-',
          new Date(v.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isCancelada ? 'Cancelado' : 'Confirmado',
          isCancelada ? 'R$ 0,00' : formatarMoeda(v.valor)
        ]
      })
    }

    autoTable(doc, {
      startY: 95,
      head: [tableColumns],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [39, 174, 96],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        7: { halign: 'center' },
        8: { halign: 'right' }
      },
      didParseCell: function(data) {
        // Colorir status
        if (data.column.index === (fornecedor.nome.toLowerCase().includes('ineed') ? 7 : 6)) {
          if (data.cell.raw === '✗' || data.cell.raw === 'Cancelado') {
            data.cell.styles.textColor = [192, 57, 43]
          } else if (data.cell.raw === '✓' || data.cell.raw === 'Confirmado') {
            data.cell.styles.textColor = [39, 174, 96]
          }
        }
      }
    })

    // Footer com total
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')

    const simbolos = { 'BRL': 'R$', 'USD': 'US$', 'EUR': '€' }
    const simbolo = simbolos[moeda] || moeda
    doc.text(`TOTAL: ${simbolo} ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 60, finalY)

    // Quantidade de viagens
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${viagensParaPDF.length} viagem(s)`, pageWidth - 60, finalY + 7)

    return doc
  }

  function visualizarPDF() {
    const doc = gerarPDF()
    if (doc) {
      doc.output('dataurlnewwindow')
    }
  }

  async function criarFatura() {
    const viagensSel = getViagensSelecionadas()

    if (viagensSel.length === 0) {
      alert('Selecione pelo menos uma viagem')
      return
    }

    if (!confirm(`Gerar fatura com ${viagensSel.length} viagens?\nValor total: ${formatarMoeda(calcularTotal())}`)) {
      return
    }

    setGerandoFatura(true)

    try {
      const fornecedor = fornecedores.find(f => f.id === fornecedorSelecionado)
      const valorTotal = calcularTotal()

      // 1. Criar a fatura
      const { data: faturaData, error: faturaError } = await supabase
        .from('faturas')
        .insert({
          fornecedor_id: fornecedorSelecionado,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          valor_total: valorTotal,
          moeda: fornecedor?.moeda_padrao || 'BRL',
          status: 'pendente',
          data_vencimento: dataVencimento || null,
          observacoes: numeroReferencia || null
        })
        .select()
        .single()

      if (faturaError) throw faturaError

      // 2. Criar vínculos fatura_viagens
      const faturaViagens = viagensSel.map(v => ({
        fatura_id: faturaData.id,
        viagem_id: v.id,
        valor_faturado: v.status === 'cancelada' ? 0 : (parseFloat(v.valor) || 0)
      }))

      const { error: vincError } = await supabase
        .from('fatura_viagens')
        .insert(faturaViagens)

      if (vincError) throw vincError

      // 3. Atualizar status_faturamento das viagens
      const viagemIds = viagensSel.map(v => v.id)
      const { error: updateError } = await supabase
        .from('viagens')
        .update({ status_faturamento: 'faturado' })
        .in('id', viagemIds)

      if (updateError) throw updateError

      // 4. Gerar e baixar PDF
      const doc = gerarPDF(faturaData, viagensSel)
      if (doc) {
        doc.save(`fatura-${faturaData.id.substring(0, 8)}.pdf`)
      }

      alert('Fatura gerada com sucesso!')

      // Limpar formulário e recarregar
      setViagensBuscadas([])
      setViagensSelecionadas({})
      setNumeroReferencia('')
      carregarDados()

    } catch (error) {
      console.error('Erro ao criar fatura:', error)
      alert('Erro ao criar fatura: ' + error.message)
    }

    setGerandoFatura(false)
  }

  async function marcarFaturaComoPaga(faturaId) {
    if (!confirm('Marcar esta fatura como paga?')) return

    const { error } = await supabase
      .from('faturas')
      .update({
        status: 'paga',
        data_pagamento: new Date().toISOString()
      })
      .eq('id', faturaId)

    if (error) {
      alert('Erro ao atualizar fatura')
    } else {
      carregarDados()
    }
  }

  async function verPDFFatura(faturaId) {
    // Buscar dados da fatura e viagens
    const { data: fatura } = await supabase
      .from('faturas')
      .select('*')
      .eq('id', faturaId)
      .single()

    const { data: faturaViagens } = await supabase
      .from('fatura_viagens')
      .select('viagem_id, valor_faturado')
      .eq('fatura_id', faturaId)

    const viagemIds = faturaViagens?.map(fv => fv.viagem_id) || []

    const { data: viagens } = await supabase
      .from('viagens')
      .select('*')
      .in('id', viagemIds)

    if (fatura && viagens) {
      const doc = gerarPDF(fatura, viagens)
      if (doc) {
        doc.output('dataurlnewwindow')
      }
    }
  }

  function getStatusFatura(fatura) {
    if (fatura.status === 'paga') {
      return { icon: '✅', label: 'Paga', color: '#27ae60' }
    }
    if (fatura.data_vencimento) {
      const vencimento = new Date(fatura.data_vencimento)
      const hoje = new Date()
      if (vencimento < hoje) {
        return { icon: '⚠️', label: 'Vencida', color: '#e74c3c' }
      }
    }
    return { icon: '⏳', label: 'Aguardando', color: '#f39c12' }
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
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>📄 Faturas para Fornecedores</h1>

      {/* Seção: Gerar Nova Fatura */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Gerar Nova Fatura</h2>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
              Fornecedor
            </label>
            <select
              value={fornecedorSelecionado}
              onChange={(e) => handleFornecedorChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                background: 'white'
              }}
            >
              <option value="">Selecione...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
              Data Início
            </label>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
              Data Fim
            </label>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={buscarViagens}
              disabled={buscandoViagens || !fornecedorSelecionado}
              style={{
                padding: '10px 20px',
                background: buscandoViagens ? '#ccc' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: buscandoViagens ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {buscandoViagens ? 'Buscando...' : 'Buscar Viagens'}
            </button>
          </div>
        </div>

        {/* Lista de viagens encontradas */}
        {viagensBuscadas.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: 8
            }}>
              <span style={{ fontWeight: 500 }}>
                {viagensBuscadas.length} viagem(s) encontrada(s)
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={selecionarTodasViagens}
                  style={{
                    padding: '6px 12px',
                    background: '#e8f5e9',
                    color: '#27ae60',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Selecionar todas
                </button>
                <button
                  onClick={desselecionarTodasViagens}
                  style={{
                    padding: '6px 12px',
                    background: '#ffebee',
                    color: '#e74c3c',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 20 }}>
              {viagensBuscadas.map(v => {
                const isCancelada = v.status === 'cancelada'
                return (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderBottom: '1px solid #eee',
                      background: viagensSelecionadas[v.id] ? '#f0f9ff' : 'white',
                      opacity: isCancelada ? 0.7 : 1
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={viagensSelecionadas[v.id] || false}
                      onChange={() => toggleViagem(v.id)}
                      style={{ width: 18, height: 18 }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500 }}>{v.passageiro_nome}</span>
                        {isCancelada && (
                          <span style={{
                            background: '#ffebee',
                            color: '#c62828',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500
                          }}>
                            ✗ CANCELADA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>
                        {new Date(v.data_hora).toLocaleDateString('pt-BR')} •{' '}
                        {v.origem} → {v.destino}
                        {v.numero_reserva && <span> • Reserva: {v.numero_reserva}</span>}
                      </div>
                    </div>

                    <div style={{
                      fontWeight: 600,
                      color: isCancelada ? '#999' : '#27ae60',
                      textDecoration: isCancelada ? 'line-through' : 'none'
                    }}>
                      {isCancelada ? 'R$ 0,00' : formatarMoeda(v.valor)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dados adicionais e ações */}
            <div style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              padding: 16,
              background: '#f8f9fa',
              borderRadius: 8
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                  Nº Referência (opcional)
                </label>
                <input
                  type="text"
                  value={numeroReferencia}
                  onChange={(e) => setNumeroReferencia(e.target.value)}
                  placeholder="Ex: INV-2024-001"
                  style={{ padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14, width: 180 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                  Data Vencimento
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                  {getViagensSelecionadas().length} viagem(s) selecionada(s)
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>
                  {formatarMoeda(calcularTotal())}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={visualizarPDF}
                  disabled={getViagensSelecionadas().length === 0}
                  style={{
                    padding: '12px 20px',
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: 8,
                    cursor: getViagensSelecionadas().length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 500
                  }}
                >
                  Visualizar PDF
                </button>

                <button
                  onClick={criarFatura}
                  disabled={gerandoFatura || getViagensSelecionadas().length === 0}
                  style={{
                    padding: '12px 20px',
                    background: gerandoFatura || getViagensSelecionadas().length === 0 ? '#ccc' : '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: gerandoFatura || getViagensSelecionadas().length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  {gerandoFatura ? 'Gerando...' : 'Gerar Fatura'}
                </button>
              </div>
            </div>
          </>
        )}

        {viagensBuscadas.length === 0 && fornecedorSelecionado && periodoInicio && periodoFim && !buscandoViagens && (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            Clique em "Buscar Viagens" para carregar as viagens do período
          </div>
        )}
      </div>

      {/* Seção: Faturas Emitidas */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Faturas Emitidas</h2>

        {faturas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            Nenhuma fatura emitida ainda
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Fornecedor
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Período
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Valor
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Vencimento
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {faturas.map(fatura => {
                  const status = getStatusFatura(fatura)
                  const simbolos = { 'BRL': 'R$', 'USD': 'US$', 'EUR': '€' }
                  return (
                    <tr key={fatura.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{fatura.fornecedor?.nome || '-'}</div>
                        {fatura.observacoes && (
                          <div style={{ fontSize: 12, color: '#666' }}>Ref: {fatura.observacoes}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>
                        {new Date(fatura.periodo_inicio).toLocaleDateString('pt-BR')} -{' '}
                        {new Date(fatura.periodo_fim).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#27ae60' }}>
                        {simbolos[fatura.moeda] || fatura.moeda} {parseFloat(fatura.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14 }}>
                        {fatura.data_vencimento
                          ? new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 500,
                          background: status.color + '20',
                          color: status.color
                        }}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            onClick={() => verPDFFatura(fatura.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#f0f0f0',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13
                            }}
                          >
                            Ver PDF
                          </button>
                          {fatura.status !== 'paga' && (
                            <button
                              onClick={() => marcarFaturaComoPaga(fatura.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#e8f5e9',
                                color: '#27ae60',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 500
                              }}
                            >
                              Marcar paga
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Faturas
