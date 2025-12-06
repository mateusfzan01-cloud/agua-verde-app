// src/components/MapaMotoristas.jsx

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../supabaseClient'
import { getMapboxToken } from '../services/mapboxService'

// Configurar token
const token = getMapboxToken()
if (token && token !== 'YOUR_MAPBOX_TOKEN') {
  mapboxgl.accessToken = token
}

/**
 * Mapa mostrando todos os motoristas com viagens ativas
 * @param {Array} viagensAtivas - Viagens com status a_caminho, aguardando_passageiro ou em_andamento
 * @param {string} height - Altura do mapa
 */
export default function MapaMotoristas({ viagensAtivas = [], height = '350px' }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const subscriptionRef = useRef(null)
  const [motoristasLocalizacao, setMotoristasLocalizacao] = useState({})
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(null)

  // Centro padrao: Recife
  const defaultCenter = [-34.8813, -8.0476]

  // Lista de motorista_ids unicos das viagens ativas
  const motoristaIds = useMemo(() => {
    return [...new Set(viagensAtivas.map(v => v.motorista_id).filter(Boolean))]
  }, [viagensAtivas])

  // Funcao para sanitizar texto (evitar XSS)
  const sanitizeText = useCallback((text) => {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }, [])

  // ══════════════════════════════════════════════════════════
  // INICIALIZAR MAPA
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    const mapboxToken = getMapboxToken()
    if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN' || mapRef.current) return

    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: 11
      })

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      mapRef.current.on('load', () => {
        setMapLoaded(true)
      })

      mapRef.current.on('error', (e) => {
        console.error('Erro no Mapbox:', e)
        setMapError('Erro ao carregar o mapa')
      })
    } catch (err) {
      console.error('Erro ao inicializar Mapbox:', err)
      setMapError('Erro ao inicializar o mapa')
    }

    return () => {
      // Cleanup completo
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()

      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      setMapLoaded(false)
    }
  }, [])

  // ══════════════════════════════════════════════════════════
  // BUSCAR LOCALIZACOES INICIAIS
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    // Tratar caso de array vazio
    if (motoristaIds.length === 0) {
      setMotoristasLocalizacao({})
      return
    }

    async function fetchLocalizacoes() {
      // Usar a view que ja retorna a ultima localizacao de cada motorista
      const { data, error } = await supabase
        .from('ultima_localizacao_motoristas')
        .select('*')
        .in('motorista_id', motoristaIds)

      if (error) {
        console.error('Erro ao buscar localizacoes:', error)
        return
      }

      const localizacoes = {}
      data?.forEach(loc => {
        localizacoes[loc.motorista_id] = loc
      })

      setMotoristasLocalizacao(localizacoes)
    }

    fetchLocalizacoes()
  }, [motoristaIds])

  // ══════════════════════════════════════════════════════════
  // SUBSCRIPTION REALTIME PARA NOVAS LOCALIZACOES
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    // Limpar subscription anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }

    // Nao criar subscription se nao ha motoristas para monitorar
    if (motoristaIds.length === 0) return

    const channel = supabase
      .channel('dashboard-motoristas-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations'
        },
        (payload) => {
          const novaLoc = payload.new
          // Verificar se e de um motorista que estamos monitorando
          if (motoristaIds.includes(novaLoc.motorista_id)) {
            setMotoristasLocalizacao(prev => ({
              ...prev,
              [novaLoc.motorista_id]: novaLoc
            }))
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [motoristaIds])

  // ══════════════════════════════════════════════════════════
  // ATUALIZAR MARCADORES NO MAPA
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const bounds = new mapboxgl.LngLatBounds()
    let hasValidBounds = false

    // IDs de motoristas ativos para esta atualizacao
    const activeMotoristaIds = new Set(motoristaIds)

    // Remover marcadores de motoristas que nao estao mais ativos
    markersRef.current.forEach((marker, motoristaId) => {
      if (!activeMotoristaIds.has(motoristaId)) {
        marker.remove()
        markersRef.current.delete(motoristaId)
      }
    })

    // Atualizar/criar marcadores
    viagensAtivas.forEach(viagem => {
      if (!viagem.motorista_id || !viagem.motoristas) return

      const localizacao = motoristasLocalizacao[viagem.motorista_id]
      if (!localizacao) return

      const { latitude, longitude } = localizacao
      const motoristaId = viagem.motorista_id

      // Determinar cor baseada no status
      const statusColors = {
        'a_caminho': '#3498db',      // Azul
        'aguardando_passageiro': '#f39c12', // Laranja
        'em_andamento': '#27ae60'    // Verde
      }
      const corStatus = statusColors[viagem.status] || '#1a472a'

      // Criar ou atualizar marcador
      if (markersRef.current.has(motoristaId)) {
        // Atualizar posicao existente com animacao suave
        markersRef.current.get(motoristaId).setLngLat([longitude, latitude])

        // Atualizar popup
        const popup = markersRef.current.get(motoristaId).getPopup()
        if (popup) {
          popup.setHTML(gerarPopupHTML(viagem, localizacao))
        }
      } else {
        // Criar novo marcador
        const el = document.createElement('div')
        el.className = 'motorista-marker-dashboard'
        el.style.cssText = `
          width: 40px;
          height: 40px;
          background: ${corStatus};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        `
        el.innerHTML = '🚗'
        el.title = sanitizeText(viagem.motoristas.nome)

        // Efeito hover
        el.onmouseenter = () => el.style.transform = 'scale(1.1)'
        el.onmouseleave = () => el.style.transform = 'scale(1)'

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(gerarPopupHTML(viagem, localizacao))

        const marker = new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(mapRef.current)

        markersRef.current.set(motoristaId, marker)
      }

      bounds.extend([longitude, latitude])
      hasValidBounds = true
    })

    // Ajustar visualizacao para mostrar todos os marcadores
    if (hasValidBounds && markersRef.current.size > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 14,
        duration: 1000
      })
    }
  }, [mapLoaded, viagensAtivas, motoristasLocalizacao, motoristaIds, sanitizeText])

  // Gerar HTML do popup (com sanitizacao para evitar XSS)
  function gerarPopupHTML(viagem, localizacao) {
    const statusLabels = {
      'a_caminho': '🚗 A caminho',
      'aguardando_passageiro': '📍 Aguardando',
      'em_andamento': '🛣️ Em viagem'
    }

    // Sanitizar todos os textos dinamicos
    const nomeMotorista = sanitizeText(viagem.motoristas?.nome || 'Motorista')
    const passageiroNome = sanitizeText(viagem.passageiro_nome || '-')
    const destino = sanitizeText(viagem.destino || '-')

    // O campo de timestamp e captured_at (conforme migration)
    const timestamp = localizacao.captured_at
    const horaAtualizada = timestamp
      ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '--:--'

    return `
      <div style="padding: 10px; min-width: 180px; font-family: 'Inter', sans-serif;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #1a472a;">
          ${nomeMotorista}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
          ${statusLabels[viagem.status] || viagem.status}
        </div>
        <div style="font-size: 12px; color: #333; border-top: 1px solid #eee; padding-top: 8px;">
          <div style="margin-bottom: 4px;">
            <strong>Passageiro:</strong> ${passageiroNome}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Destino:</strong> ${destino}
          </div>
          ${localizacao.speed ? `
            <div style="margin-bottom: 4px;">
              <strong>Velocidade:</strong> ${Math.round(localizacao.speed * 3.6)} km/h
            </div>
          ` : ''}
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 8px; text-align: right;">
          Atualizado: ${horaAtualizada}
        </div>
      </div>
    `
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  const mapboxToken = getMapboxToken()

  // Se nao ha token do Mapbox
  if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN') {
    return (
      <div style={{
        height,
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        color: '#666',
        fontSize: '14px'
      }}>
        ⚠️ Configure VITE_MAPBOX_TOKEN para visualizar o mapa
      </div>
    )
  }

  // Se houve erro ao carregar o mapa
  if (mapError) {
    return (
      <div style={{
        height,
        background: '#fff5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        color: '#c00',
        gap: '8px'
      }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <span style={{ fontSize: '14px' }}>{mapError}</span>
      </div>
    )
  }

  // Se nao ha viagens ativas
  if (viagensAtivas.length === 0) {
    return (
      <div style={{
        height,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        color: '#666',
        gap: '12px'
      }}>
        <span style={{ fontSize: '48px', opacity: 0.5 }}>🚗</span>
        <span style={{ fontSize: '14px' }}>Nenhum motorista em viagem no momento</span>
      </div>
    )
  }

  const motoristasRastreados = Object.keys(motoristasLocalizacao).length

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapContainer}
        style={{
          height,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />

      {/* Legenda com status */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        fontSize: '11px'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '6px' }}>
          {motoristasRastreados} motorista(s) rastreado(s)
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: '#3498db', borderRadius: '50%', display: 'inline-block' }}></span>
            <span>A caminho</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: '#f39c12', borderRadius: '50%', display: 'inline-block' }}></span>
            <span>Aguardando</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: '#27ae60', borderRadius: '50%', display: 'inline-block' }}></span>
            <span>Em viagem</span>
          </div>
        </div>
      </div>

      {/* Botao refresh */}
      <button
        onClick={() => window.location.reload()}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title="Atualizar mapa"
      >
        🔄 Atualizar
      </button>
    </div>
  )
}
