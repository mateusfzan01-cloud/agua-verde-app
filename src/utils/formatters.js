/**
 * Funcoes utilitarias de formatacao
 * Centralizadas para evitar duplicacao de codigo
 */

export function getIniciais(nome) {
  if (!nome) return '??'
  return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

export function formatarStatus(status) {
  const statusMap = {
    'pendente': 'Pendente',
    'vinculada': 'Vinculada',
    'a_caminho': 'A Caminho',
    'aguardando_passageiro': 'Aguardando',
    'em_andamento': 'Em Andamento',
    'concluida': 'Concluida',
    'cancelada': 'Cancelada',
    'no_show': 'No-Show'
  }
  return statusMap[status] || status
}

export function formatarData(dataHora) {
  return new Date(dataHora).toLocaleDateString('pt-BR')
}

export function formatarHora(dataHora) {
  return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarDataHora(dataHora) {
  const data = new Date(dataHora)
  return {
    data: data.toLocaleDateString('pt-BR'),
    hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    relativo: formatarTempo(data)
  }
}

export function formatarValor(valor, moeda) {
  const simbolos = {
    'BRL': 'R$',
    'USD': 'US$',
    'EUR': 'EUR'
  }
  const simbolo = simbolos[moeda] || moeda || 'R$'
  return `${simbolo} ${parseFloat(valor || 0).toFixed(2)}`
}

export function formatarMoeda(valor) {
  return formatarValor(valor, 'BRL')
}

export function formatarTempo(data) {
  const agora = new Date()
  const diff = agora - new Date(data)
  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (dias > 0) return `Ha ${dias} dia${dias > 1 ? 's' : ''}`
  if (horas > 0) return `Ha ${horas} hora${horas > 1 ? 's' : ''}`
  if (minutos > 0) return `Ha ${minutos} min`
  return 'Agora'
}

export function getTipoOcorrencia(tipo) {
  const tipos = {
    'atraso_voo': 'Atraso de voo',
    'atraso_motorista': 'Atraso do motorista',
    'atraso_passageiro': 'Atraso do passageiro',
    'cancelamento': 'Cancelamento',
    'alteracao_status': 'Alteracao de status',
    'no_show': 'No-Show',
    'outro': 'Outro'
  }
  return tipos[tipo] || tipo
}
