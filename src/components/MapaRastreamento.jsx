import { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../supabaseClient'
import { formatarDistancia, calcularDistancia } from '../services/mapboxService'

// Token do Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'

/**
 * Componente de mapa para rastreamento em tempo real
 *
 * @param {Object} props
 * @param {string} props.viagemId - ID da viagem para rastrear
 * @param {string} props.motoristaId - ID do motorista
 * @param {Object} props.destino - Coordenadas do destino {lat, lng, endereco}
 * @param {Object} props.origem - Coordenadas da origem {lat, lng, endereco}
 * @param {number} props.height - Altura do mapa (default: 300)
 * @param {boolean} props.showRoute - Mostrar rota estimada (default: false)
 */
function MapaRastreamento({
  viagemId,
  motoristaId,
  destino,
  origem,
  height = 300,
  showRoute = false
}) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markerRef = useRef(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isOnline, setIsOnline] = useState(false)

  // Calcula distancia ate o destino
  const distanciaAteDestino = useMemo(() => {
    if (!driverLocation || !destino) return null
    return calcularDistancia(
      driverLocation.latitude,
      driverLocation.longitude,
      destino.lat,
      destino.lng
    )
  }, [driverLocation, destino])

  // =====================================================
  // Inicializa o mapa
  // =====================================================
  useEffect(() => {
    if (map.current) return // Ja inicializado

    // Centro inicial (Recife ou origem/destino)
    const initialCenter = origem
      ? [origem.lng, origem.lat]
      : destino
        ? [destino.lng, destino.lat]
        : [-34.8771, -8.0476] // Recife

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 13
    })

    // Adiciona controles
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Marcador do destino (se houver)
    if (destino) {
      new mapboxgl.Marker({ color: '#e74c3c' })
        .setLngLat([destino.lng, destino.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>Destino</strong><br/>
          ${destino.endereco || 'Local de destino'}
        `))
        .addTo(map.current)
    }

    // Marcador da origem (se houver)
    if (origem) {
      new mapboxgl.Marker({ color: '#27ae60' })
        .setLngLat([origem.lng, origem.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>Origem</strong><br/>
          ${origem.endereco || 'Local de partida'}
        `))
        .addTo(map.current)
    }

    return () => {
      map.current?.remove()
    }
  }, [destino, origem])

  // =====================================================
  // Cria/atualiza marcador do motorista
  // =====================================================
  useEffect(() => {
    if (!map.current || !driverLocation) return

    const { latitude, longitude, endereco } = driverLocation

    if (!markerRef.current) {
      // Cria elemento personalizado para o marcador
      const el = document.createElement('div')
      el.className = 'driver-marker'
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #3498db;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
      `

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>Motorista</strong><br/>
          ${endereco || 'Localizacao atual'}
        `))
        .addTo(map.current)
    } else {
      // Atualiza posicao com animacao suave
      markerRef.current.setLngLat([longitude, latitude])
      markerRef.current.getPopup().setHTML(`
        <strong>Motorista</strong><br/>
        ${endereco || 'Localizacao atual'}
      `)
    }

    // Centraliza mapa no motorista
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 1000
    })
  }, [driverLocation])

  // =====================================================
  // Busca localizacao inicial e configura Realtime
  // =====================================================
  useEffect(() => {
    if (!motoristaId) return

    // Busca ultima localizacao conhecida
    async function fetchInitialLocation() {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('motorista_id', motoristaId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setDriverLocation(data)
        setLastUpdate(new Date(data.captured_at))

        // Verifica se esta online (menos de 5 min)
        const diff = Date.now() - new Date(data.captured_at).getTime()
        setIsOnline(diff < 5 * 60 * 1000)
      }
    }

    fetchInitialLocation()

    // Configura subscription Realtime
    const channel = supabase
      .channel(`driver_location_${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `motorista_id=eq.${motoristaId}`
        },
        (payload) => {
          const newLocation = payload.new
          setDriverLocation(newLocation)
          setLastUpdate(new Date(newLocation.captured_at))
          setIsOnline(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [motoristaId])

  // =====================================================
  // Atualiza status online periodicamente
  // =====================================================
  useEffect(() => {
    if (!lastUpdate) return

    const checkOnline = () => {
      const diff = Date.now() - lastUpdate.getTime()
      setIsOnline(diff < 5 * 60 * 1000)
    }

    const interval = setInterval(checkOnline, 30000) // Verifica a cada 30s
    return () => clearInterval(interval)
  }, [lastUpdate])

  // =====================================================
  // Formata tempo desde ultima atualizacao
  // =====================================================
  function formatLastUpdate() {
    if (!lastUpdate) return 'Aguardando...'

    const diff = Date.now() - lastUpdate.getTime()
    const mins = Math.floor(diff / 60000)

    if (mins < 1) return 'Agora'
    if (mins < 60) return `Ha ${mins} min`

    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Ha ${hours}h`

    return lastUpdate.toLocaleDateString('pt-BR')
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Container do mapa */}
      <div
        ref={mapContainer}
        style={{
          height,
          borderRadius: 12,
          overflow: 'hidden'
        }}
      />

      {/* Overlay com informacoes */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'white',
        padding: '8px 12px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13
      }}>
        {/* Indicador de status */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isOnline ? '#27ae60' : '#95a5a6',
          animation: isOnline ? 'pulse 2s infinite' : 'none'
        }} />

        <span style={{ color: '#2c3e50' }}>
          {isOnline ? 'Em movimento' : 'Offline'}
        </span>

        <span style={{ color: '#7f8c8d' }}>
          {formatLastUpdate()}
        </span>
      </div>

      {/* Distancia ate destino */}
      {distanciaAteDestino !== null && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'white',
          padding: '8px 12px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: 13
        }}>
          <span style={{ color: '#7f8c8d' }}>Distancia: </span>
          <strong style={{ color: '#3498db' }}>
            {formatarDistancia(distanciaAteDestino)}
          </strong>
        </div>
      )}

      {/* Endereco atual */}
      {driverLocation?.endereco && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'white',
          padding: '8px 12px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: 12,
          maxWidth: 200,
          color: '#2c3e50'
        }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="#3498db"
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          {driverLocation.endereco}
        </div>
      )}

      {/* Animacao de pulse */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(39, 174, 96, 0); }
          100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
        }
      `}</style>
    </div>
  )
}

export default MapaRastreamento
