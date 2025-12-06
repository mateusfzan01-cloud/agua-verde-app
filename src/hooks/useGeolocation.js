import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { reverseGeocode } from '../services/mapboxService'

/**
 * Hook para gerenciar geolocalizacao do motorista
 * Inclui rastreamento continuo, cache, offline queue e controle de multiplas abas
 *
 * @param {Object} options - Opcoes de configuracao
 * @param {string} options.motoristaId - ID do motorista
 * @param {string} options.viagemId - ID da viagem atual (opcional)
 * @param {number} options.intervalo - Intervalo de captura em ms (default: 60000)
 * @param {boolean} options.autoStart - Iniciar automaticamente (default: false)
 */
export function useGeolocation({
  motoristaId,
  viagemId = null,
  intervalo = 60000,
  autoStart = false
}) {
  // Estados
  const [location, setLocation] = useState(null)
  const [endereco, setEndereco] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isLeader, setIsLeader] = useState(false)

  // Refs para evitar stale closures
  const intervalRef = useRef(null)
  const watchIdRef = useRef(null)
  const pendingLocationsRef = useRef([])
  const channelRef = useRef(null)
  const motoristaIdRef = useRef(motoristaId)
  const viagemIdRef = useRef(viagemId)

  // Atualiza refs quando props mudam
  useEffect(() => {
    motoristaIdRef.current = motoristaId
  }, [motoristaId])

  useEffect(() => {
    viagemIdRef.current = viagemId
  }, [viagemId])

  // =====================================================
  // BroadcastChannel para controle de multiplas abas
  // =====================================================
  useEffect(() => {
    if (!motoristaId) return

    const channelName = `geolocation_${motoristaId}`
    const channel = new BroadcastChannel(channelName)
    channelRef.current = channel

    // Tenta se tornar lider
    const tryBecomeLeader = () => {
      channel.postMessage({ type: 'LEADER_CHECK' })
      // Se ninguem responder em 500ms, assume lideranca
      setTimeout(() => {
        if (!isLeader) {
          setIsLeader(true)
          channel.postMessage({ type: 'LEADER_ANNOUNCE' })
        }
      }, 500)
    }

    channel.onmessage = (event) => {
      const { type, location: sharedLocation } = event.data

      switch (type) {
        case 'LEADER_CHECK':
          if (isLeader) {
            channel.postMessage({ type: 'LEADER_EXISTS' })
          }
          break

        case 'LEADER_EXISTS':
          setIsLeader(false)
          break

        case 'LEADER_ANNOUNCE':
          setIsLeader(false)
          break

        case 'LOCATION_UPDATE':
          // Abas nao-lider recebem updates do lider
          if (!isLeader && sharedLocation) {
            setLocation(sharedLocation)
            setEndereco(sharedLocation.endereco)
          }
          break
      }
    }

    tryBecomeLeader()

    // Quando a aba fecha, outra assume
    const handleUnload = () => {
      if (isLeader) {
        channel.postMessage({ type: 'LEADER_LEAVING' })
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      channel.close()
    }
  }, [motoristaId, isLeader])

  // =====================================================
  // Funcao para processar fila offline
  // =====================================================
  const processOfflineQueue = useCallback(async () => {
    if (pendingLocationsRef.current.length === 0) return

    const pending = [...pendingLocationsRef.current]
    pendingLocationsRef.current = []

    for (const loc of pending) {
      try {
        await supabase.from('driver_locations').insert(loc)
      } catch (err) {
        // Se falhar, coloca de volta na fila
        pendingLocationsRef.current.push(loc)
      }
    }
  }, [])

  // Tenta processar fila quando volta online
  useEffect(() => {
    const handleOnline = () => {
      processOfflineQueue()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [processOfflineQueue])

  // =====================================================
  // Captura e envia localizacao
  // =====================================================
  const captureAndSend = useCallback(async (position) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords

    // Atualiza estado local
    const newLocation = {
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      timestamp: new Date().toISOString()
    }
    setLocation(newLocation)

    // Faz geocoding reverso
    const enderecoReverso = await reverseGeocode(latitude, longitude)
    setEndereco(enderecoReverso)
    newLocation.endereco = enderecoReverso

    // Compartilha com outras abas
    if (channelRef.current && isLeader) {
      channelRef.current.postMessage({
        type: 'LOCATION_UPDATE',
        location: newLocation
      })
    }

    // Prepara dados para Supabase
    const locationData = {
      motorista_id: motoristaIdRef.current,
      viagem_id: viagemIdRef.current,
      latitude,
      longitude,
      endereco: enderecoReverso,
      accuracy,
      speed,
      heading,
      captured_at: newLocation.timestamp,
      metadata: {
        userAgent: navigator.userAgent,
        online: navigator.onLine
      }
    }

    // Envia para Supabase ou adiciona na fila offline
    if (navigator.onLine) {
      try {
        const { error: insertError } = await supabase
          .from('driver_locations')
          .insert(locationData)

        if (insertError) throw insertError

        // Processa fila pendente se houver
        await processOfflineQueue()
      } catch (err) {
        console.error('Erro ao salvar localizacao:', err)
        pendingLocationsRef.current.push(locationData)
      }
    } else {
      // Offline - adiciona na fila
      pendingLocationsRef.current.push(locationData)
    }

    return newLocation
  }, [isLeader, processOfflineQueue])

  // =====================================================
  // Captura unica de localizacao
  // =====================================================
  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocalizacao nao suportada')
      return null
    }

    setLoading(true)
    setError(null)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const result = await captureAndSend(position)
          setLoading(false)
          resolve(result)
        },
        (err) => {
          let mensagem = 'Erro ao obter localizacao'
          switch (err.code) {
            case err.PERMISSION_DENIED:
              mensagem = 'Permissao de localizacao negada'
              break
            case err.POSITION_UNAVAILABLE:
              mensagem = 'Localizacao indisponivel'
              break
            case err.TIMEOUT:
              mensagem = 'Tempo esgotado ao obter localizacao'
              break
          }
          setError(mensagem)
          setLoading(false)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      )
    })
  }, [captureAndSend])

  // =====================================================
  // Inicia rastreamento continuo
  // =====================================================
  const startTracking = useCallback(() => {
    // Apenas o lider faz tracking
    if (!isLeader) {
      console.log('Nao eh lider, ignorando startTracking')
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocalizacao nao suportada')
      return
    }

    setIsTracking(true)
    setError(null)

    // Captura imediata
    captureLocation()

    // Configura intervalo de captura
    intervalRef.current = setInterval(() => {
      captureLocation()
    }, intervalo)

    // Watch position para atualizacoes em tempo real (opcional)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Apenas atualiza estado local, nao envia ao servidor
        // O envio eh controlado pelo intervalo
        const { latitude, longitude, accuracy, speed, heading } = position.coords
        setLocation({
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          timestamp: new Date().toISOString()
        })
      },
      (err) => {
        console.warn('Erro no watchPosition:', err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000
      }
    )
  }, [isLeader, captureLocation, intervalo])

  // =====================================================
  // Para rastreamento
  // =====================================================
  const stopTracking = useCallback(() => {
    setIsTracking(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // =====================================================
  // Atualiza localizacao na viagem (inicio ou fim)
  // =====================================================
  const updateViagemLocation = useCallback(async (tipo, viagemIdParam) => {
    const loc = await captureLocation()
    if (!loc) return null

    const updateData = tipo === 'inicio'
      ? {
          local_inicio_lat: loc.latitude,
          local_inicio_lng: loc.longitude,
          local_inicio_endereco: loc.endereco,
          local_inicio_timestamp: loc.timestamp
        }
      : {
          local_fim_lat: loc.latitude,
          local_fim_lng: loc.longitude,
          local_fim_endereco: loc.endereco,
          local_fim_timestamp: loc.timestamp
        }

    const { error: updateError } = await supabase
      .from('viagens')
      .update(updateData)
      .eq('id', viagemIdParam || viagemIdRef.current)

    if (updateError) {
      console.error('Erro ao atualizar viagem:', updateError)
      throw updateError
    }

    return loc
  }, [captureLocation])

  // =====================================================
  // Auto-start se configurado
  // =====================================================
  useEffect(() => {
    if (autoStart && isLeader && motoristaId) {
      startTracking()
    }
    return () => {
      stopTracking()
    }
  }, [autoStart, isLeader, motoristaId, startTracking, stopTracking])

  // =====================================================
  // Cleanup ao desmontar
  // =====================================================
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    // Estado atual
    location,
    endereco,
    loading,
    error,
    isTracking,
    isLeader,

    // Acoes
    captureLocation,
    startTracking,
    stopTracking,
    updateViagemLocation,

    // Info adicional
    pendingCount: pendingLocationsRef.current.length,
    hasGeolocation: !!navigator.geolocation
  }
}

export default useGeolocation
