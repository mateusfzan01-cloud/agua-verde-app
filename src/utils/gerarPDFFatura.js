import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Gera PDF de fatura no padrão FoxTransfer
 */
export function gerarPDFFatura(fatura, fornecedor, viagens) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  // HEADER - Dados da Água Verde (esquerda)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('AGUA VERDE', margin, 15)
  doc.setFontSize(10)
  doc.text('VIAGENS & RECEPTIVOS', margin, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Rua Jonatas de Vasconcelos, 788 - Boa Viagem - Pernambuco - Brasil', margin, 26)
  doc.text('(81) 3033-0245', margin, 30)
  doc.text('CNPJ: 17.427.292/0001-46', margin, 34)
  doc.text('Inscrição Estadual: Isento', margin, 38)

  // HEADER - Dados do Fornecedor (direita)
  const rightCol = pageWidth - margin
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const nomeFornecedor = fornecedor.nome_legal || fornecedor.nome
  doc.text(nomeFornecedor, rightCol, 15, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (fornecedor.identificador_fiscal) {
    doc.text(fornecedor.identificador_fiscal, rightCol, 20, { align: 'right' })
  }
  if (fornecedor.endereco) {
    doc.text(fornecedor.endereco, rightCol, 25, { align: 'right' })
  }

  // INFO DA FATURA
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const infoX = pageWidth - 80
  doc.text(`Data: ${formatarData(new Date())}`, infoX, 35)
  doc.text(`FATURA N ${fatura.numero || fatura.id}`, infoX, 41)
  if (fatura.data_vencimento) {
    doc.text(`VENCIMENTO: ${formatarData(fatura.data_vencimento)}`, infoX, 47)
  }

  // LINHA SEPARADORA
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, 52, pageWidth - margin, 52)

  // COLUNAS E DADOS DA TABELA
  const colunas = getColunasPorFornecedor(fornecedor.nome)
  const dadosTabela = viagens.map(v => {
    const isCancelado = ['cancelada', 'no_show'].includes(v.status)
    const valor = isCancelado ? 'R$ 0,00' : formatarMoeda(v.valor, v.moeda)
    const status = getStatusTexto(v.status)

    if (fornecedor.nome === 'FoxTransfer') {
      return [
        v.numero_reserva || '-',
        v.passageiro_nome || '-',
        v.quantidade_passageiros || 1,
        v.origem || '-',
        v.destino || '-',
        formatarDataHora(v.criado_em || v.created_at),
        v.voo_numero ? formatarDataHora(v.data_hora) : '-',
        formatarDataHora(v.data_hora),
        status,
        v.tipo_veiculo || 'Private Transfer',
        valor
      ]
    } else {
      return [
        v.numero_reserva || '-',
        v.passageiro_nome || '-',
        formatarData(v.data_hora),
        v.quantidade_passageiros || 1,
        v.tipo_veiculo || 'Transfer',
        v.origem || '-',
        v.destino || '-',
        status,
        valor
      ]
    }
  })

  // GERAR TABELA
  autoTable(doc, {
    startY: 56,
    head: [colunas],
    body: dadosTabela,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', halign: 'left' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
    columnStyles: getColumnStyles(fornecedor.nome),
    didParseCell: function(data) {
      if (data.section === 'body') {
        const statusColIndex = fornecedor.nome === 'FoxTransfer' ? 8 : 7
        const statusValue = data.row.raw[statusColIndex]
        if (statusValue && statusValue.toLowerCase().includes('cancelado')) {
          data.cell.styles.textColor = [200, 50, 50]
        }
      }
    },
    margin: { left: margin, right: margin }
  })

  // TOTAL
  const finalY = doc.lastAutoTable.finalY + 5
  const total = viagens
    .filter(v => !['cancelada', 'no_show'].includes(v.status))
    .reduce((sum, v) => sum + (v.valor || 0), 0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL: ${formatarMoeda(total, 'BRL')}`, pageWidth - margin, finalY, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${viagens.length} viagem(s)`, pageWidth - margin, finalY + 5, { align: 'right' })

  // PAGINACAO
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`${i}`, pageWidth / 2, pageHeight - 5, { align: 'center' })
  }

  return doc
}

function getColunasPorFornecedor(nomeFornecedor) {
  if (nomeFornecedor === 'FoxTransfer') {
    return ['N Reserva', 'Nome', 'Pax', 'Local de saida', 'Destino', 'Hora reserva', 'Hora voo', 'Hora encontro', 'Status', 'Tipo', 'Valor']
  }
  return ['N Reserva', 'Nome de Pax', 'Data Servico', 'N Pax', 'Veiculo', 'Local de Saida', 'Destino', 'Status', 'Valor']
}

function getColumnStyles(nomeFornecedor) {
  if (nomeFornecedor === 'FoxTransfer') {
    return {
      0: { cellWidth: 18 }, 1: { cellWidth: 35 }, 2: { cellWidth: 10 },
      3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 22 },
      6: { cellWidth: 22 }, 7: { cellWidth: 22 }, 8: { cellWidth: 25 },
      9: { cellWidth: 25 }, 10: { cellWidth: 20, halign: 'right' }
    }
  }
  return {
    0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 2: { cellWidth: 25 },
    3: { cellWidth: 15 }, 4: { cellWidth: 25 }, 5: { cellWidth: 40 },
    6: { cellWidth: 40 }, 7: { cellWidth: 25 }, 8: { cellWidth: 25, halign: 'right' }
  }
}

function getStatusTexto(status) {
  const mapa = {
    'pendente': 'Pendente', 'vinculada': 'Confirmado', 'a_caminho': 'Confirmado',
    'aguardando_passageiro': 'Confirmado', 'em_andamento': 'Confirmado',
    'concluida': 'Confirmado', 'cancelada': 'Cancelado', 'no_show': 'Cancelado'
  }
  return mapa[status] || 'Confirmado'
}

function formatarData(data) {
  if (!data) return '-'
  return new Date(data).toLocaleDateString('pt-BR')
}

function formatarDataHora(data) {
  if (!data) return '-'
  const d = new Date(data)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatarMoeda(valor, moeda = 'BRL') {
  if (valor === null || valor === undefined) return 'R$ 0,00'
  const simbolos = { 'BRL': 'R$', 'USD': 'US$', 'EUR': '€' }
  return `${simbolos[moeda] || 'R$'} ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function baixarPDFFatura(fatura, fornecedor, viagens) {
  const doc = gerarPDFFatura(fatura, fornecedor, viagens)
  doc.save(`Fatura_${fatura.numero || fatura.id}_${fornecedor.nome}.pdf`)
}

export function visualizarPDFFatura(fatura, fornecedor, viagens) {
  const doc = gerarPDFFatura(fatura, fornecedor, viagens)
  window.open(URL.createObjectURL(doc.output('blob')), '_blank')
}
