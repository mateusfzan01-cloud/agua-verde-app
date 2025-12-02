import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export function useAlertas() {
  const [alertas, setAlertas] = useState([])
  const [alertasNaoLidos, setAlertasNaoLidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [contador, setContador] = useState(0)

  const fetchAlertas = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('alertas')
      .select('*, viagens(passageiro_nome, data_hora, origem, destino)')
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar alertas:', error)
    } else {
      setAlertas(data || [])
      const naoLidos = (data || []).filter(a => !a.lido)
      setAlertasNaoLidos(naoLidos)
      setContador(naoLidos.length)
    }

    setLoading(false)
  }, [])

  // Marcar alerta como lido
  const marcarComoLido = useCallback(async (alertaId) => {
    const { error } = await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('id', alertaId)

    if (error) {
      console.error('Erro ao marcar alerta como lido:', error)
      return false
    }

    // Atualizar estado local
    setAlertas(prev => prev.map(a =>
      a.id === alertaId ? { ...a, lido: true } : a
    ))
    setAlertasNaoLidos(prev => prev.filter(a => a.id !== alertaId))
    setContador(prev => Math.max(0, prev - 1))

    return true
  }, [])

  // Marcar todos como lidos
  const marcarTodosComoLidos = useCallback(async () => {
    const idsNaoLidos = alertasNaoLidos.map(a => a.id)

    if (idsNaoLidos.length === 0) return true

    const { error } = await supabase
      .from('alertas')
      .update({ lido: true })
      .in('id', idsNaoLidos)

    if (error) {
      console.error('Erro ao marcar todos alertas como lidos:', error)
      return false
    }

    // Atualizar estado local
    setAlertas(prev => prev.map(a => ({ ...a, lido: true })))
    setAlertasNaoLidos([])
    setContador(0)

    return true
  }, [alertasNaoLidos])

  // Buscar alertas ao montar
  useEffect(() => {
    fetchAlertas()
  }, [fetchAlertas])

  // Configurar realtime subscription para novos alertas
  useEffect(() => {
    const channel = supabase
      .channel('alertas-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertas'
        },
        (payload) => {
          const novoAlerta = payload.new
          setAlertas(prev => [novoAlerta, ...prev])
          if (!novoAlerta.lido) {
            setAlertasNaoLidos(prev => [novoAlerta, ...prev])
            setContador(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alertas'
        },
        (payload) => {
          const alertaAtualizado = payload.new
          setAlertas(prev => prev.map(a =>
            a.id === alertaAtualizado.id ? alertaAtualizado : a
          ))
          if (alertaAtualizado.lido) {
            setAlertasNaoLidos(prev => prev.filter(a => a.id !== alertaAtualizado.id))
            setContador(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    alertas,
    alertasNaoLidos,
    loading,
    contador,
    fetchAlertas,
    marcarComoLido,
    marcarTodosComoLidos
  }
}

export default useAlertas
