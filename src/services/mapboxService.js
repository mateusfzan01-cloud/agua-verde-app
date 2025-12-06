/**
 * Servico de integracao com Mapbox
 * Fornece geocoding reverso, mapas estaticos e calculos de distancia
 */

// Token do Mapbox - em producao, usar variavel de ambiente
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'

/**
 * Retorna o token do Mapbox configurado nas variaveis de ambiente
 * @returns {string} Token do Mapbox
 */
export function getMapboxToken() {
  return MAPBOX_TOKEN
}

// Cache de geocoding para reduzir chamadas a API
// Chave: lat_lng com 4 decimais, Valor: endereco
const geocodeCache = new Map()

// Precisao do cache (4 decimais = ~11 metros)
const CACHE_PRECISION = 4

/**
 * Gera chave de cache baseada em coordenadas
 * Arredonda para CACHE_PRECISION decimais
 */
function getCacheKey(lat, lng) {
  const latRounded = lat.toFixed(CACHE_PRECISION)
  const lngRounded = lng.toFixed(CACHE_PRECISION)
  return `${latRounded}_${lngRounded}`
}

/**
 * Realiza geocoding reverso (coordenadas -> endereco)
 * Com cache para reduzir chamadas a API (~70% reducao)
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} Endereco formatado ou null
 */
export async function reverseGeocode(lat, lng) {
  // Verifica cache primeiro
  const cacheKey = getCacheKey(lat, lng)
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${MAPBOX_TOKEN}&` +
      `language=pt-BR&` +
      `types=address,poi&` +
      `limit=1`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('Erro no geocoding:', response.status)
      return null
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      // Formata endereco de forma concisa
      const endereco = formatarEndereco(feature)

      // Salva no cache
      geocodeCache.set(cacheKey, endereco)

      return endereco
    }

    return null
  } catch (error) {
    console.error('Erro ao fazer geocoding reverso:', error)
    return null
  }
}

/**
 * Formata endereco do Mapbox de forma concisa
 */
function formatarEndereco(feature) {
  // place_name ja vem formatado, mas muito longo
  // Exemplo: "Rua das Flores, 123, Centro, Recife, PE, Brasil"

  const context = feature.context || []
  const parts = []

  // Nome do local (rua ou POI)
  if (feature.text) {
    parts.push(feature.text)
  }

  // Numero (se houver)
  if (feature.address) {
    parts[0] = `${parts[0]}, ${feature.address}`
  }

  // Bairro
  const neighborhood = context.find(c => c.id.startsWith('neighborhood'))
  if (neighborhood) {
    parts.push(neighborhood.text)
  }

  // Cidade
  const place = context.find(c => c.id.startsWith('place'))
  if (place) {
    parts.push(place.text)
  }

  return parts.join(' - ') || feature.place_name
}

/**
 * Gera URL de mapa estatico do Mapbox
 * Util para compartilhar via WhatsApp
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} options - Opcoes do mapa
 * @returns {string} URL do mapa estatico
 */
export function gerarMapaEstatico(lat, lng, options = {}) {
  const {
    width = 400,
    height = 300,
    zoom = 15,
    marker = true,
    style = 'streets-v12'
  } = options

  let url = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/`

  // Adiciona marcador se solicitado
  if (marker) {
    url += `pin-s+3498db(${lng},${lat})/`
  }

  // Coordenadas centrais, zoom e tamanho
  url += `${lng},${lat},${zoom}/${width}x${height}@2x`

  // Token de acesso
  url += `?access_token=${MAPBOX_TOKEN}`

  return url
}

/**
 * Calcula distancia entre dois pontos usando formula de Haversine
 *
 * @param {number} lat1 - Latitude ponto 1
 * @param {number} lng1 - Longitude ponto 1
 * @param {number} lat2 - Latitude ponto 2
 * @param {number} lng2 - Longitude ponto 2
 * @returns {number} Distancia em kilometros
 */
export function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371 // Raio da Terra em km

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Converte graus para radianos
 */
function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Formata distancia de forma legivel
 *
 * @param {number} km - Distancia em kilometros
 * @returns {string} Distancia formatada
 */
export function formatarDistancia(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Gera link do Google Maps para navegacao
 *
 * @param {number} lat - Latitude destino
 * @param {number} lng - Longitude destino
 * @returns {string} URL do Google Maps
 */
export function gerarLinkNavegacao(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/**
 * Gera link do WhatsApp com localizacao
 *
 * @param {string} telefone - Numero de telefone
 * @param {string} mensagem - Mensagem com link do mapa
 * @returns {string} URL do WhatsApp
 */
export function gerarLinkWhatsApp(telefone, mensagem) {
  const numeroLimpo = telefone.replace(/\D/g, '')
  const mensagemEncoded = encodeURIComponent(mensagem)
  return `https://wa.me/${numeroLimpo}?text=${mensagemEncoded}`
}

/**
 * Limpa o cache de geocoding
 * Util para liberar memoria em sessoes longas
 */
export function limparCache() {
  geocodeCache.clear()
}

/**
 * Retorna estatisticas do cache
 */
export function getCacheStats() {
  return {
    size: geocodeCache.size,
    keys: Array.from(geocodeCache.keys())
  }
}

export default {
  getMapboxToken,
  reverseGeocode,
  gerarMapaEstatico,
  calcularDistancia,
  formatarDistancia,
  gerarLinkNavegacao,
  gerarLinkWhatsApp,
  limparCache,
  getCacheStats
}
