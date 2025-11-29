import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

function MotoristaApp() {
  const { perfil, logout, user } = useAuth()
  const [viagens, setViagens] = useState([])
  const [viagensMes, setViagensMes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [modalOcorrencia, setModalOcorrencia] = useState(null)
  const [textoOcorrencia, setTextoOcorrencia] = useState('')
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
  const [visualizacao, setVisualizacao] = useState('dia')
  
  // Modal de confirmação ao finalizar
  const [modalConfirmacao, setModalConfirmacao] = useState(null)
  const [dadosConfirmacao, setDadosConfirmacao] = useState({
    passageiros: 0,
    bagagens_grandes: 0,
    bagagens_pequenas: 0,
    horario_saida: '',
    horario_chegada: ''
  })
  
  // Modal de No-Show
  const [modalNoShow, setModalNoShow] = useState(null)
  const [noShowFoto, setNoShowFoto] = useState(null)
  const [noShowPreview, setNoShowPreview] = useState(null)
  const [noShowLocation, setNoShowLocation] = useState(null)
  const [noShowEndereco, setNoShowEndereco] = useState('')
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false)
  const [enviandoNoShow, setEnviandoNoShow] = useState(false)
  const fileInputRef = useRef(null)
  
  // Dropdown de notificações
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [viagensNaoLidas, setViagensNaoLidas] = useState([])

  useEffect(() => {
    if (perfil?.motorista_id) {
      carregarViagensNaoLidas()
    }
  }, [perfil])

  useEffect(() => {
    if (perfil?.motorista_id) {
      if (visualizacao === 'dia') {
        carregarViagensDia()
      } else {
        carregarViagensMes()
      }
    }
  }, [perfil, dataAtual, visualizacao])

  async function carregarViagensNaoLidas() {
    // Buscar viagens pendentes/vinculadas que ainda não foram "lidas" pelo motorista
    // Considera viagens futuras ou do dia atual
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .in('status', ['vinculada', 'pendente'])
      .gte('data_hora', hoje.toISOString())
      .is('notificacao_lida', null)
      .order('data_hora', { ascending: true })
      .limit(10)

    if (!error) {
      setViagensNaoLidas(data || [])
    }
  }

  async function marcarComoLida(viagemId) {
    const { error } = await supabase
      .from('viagens')
      .update({ notificacao_lida: true })
      .eq('id', viagemId)

    if (!error) {
      setViagensNaoLidas(prev => prev.filter(v => v.id !== viagemId))
    }
  }

  async function marcarTodasComoLidas() {
    const ids = viagensNaoLidas.map(v => v.id)
    if (ids.length === 0) return

    const { error } = await supabase
      .from('viagens')
      .update({ notificacao_lida: true })
      .in('id', ids)

    if (!error) {
      setViagensNaoLidas([])
      setDropdownAberto(false)
    }
  }

  async function carregarViagensDia() {
    setCarregando(true)
    
    const inicioLocal = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 0, 0, 0)
    const fimLocal = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 23, 59, 59)
    
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .gte('data_hora', inicioLocal.toISOString())
      .lte('data_hora', fimLocal.toISOString())
      .order('data_hora', { ascending: true })

    if (!error) {
      setViagens(data || [])
    }
    setCarregando(false)
  }

  async function carregarViagensMes() {
    setCarregando(true)
    const ano = dataAtual.getFullYear()
    const mes = dataAtual.getMonth()
    
    const inicioMes = new Date(ano, mes, 1, 0, 0, 0)
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59)
    
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('motorista_id', perfil.motorista_id)
      .gte('data_hora', inicioMes.toISOString())
      .lte('data_hora', fimMes.toISOString())
      .order('data_hora', { ascending: true })

    if (!error) {
      setViagensMes(data || [])
    }
    setCarregando(false)
  }

  async function atualizarStatus(viagemId, novoStatus) {
    const { error } = await supabase
      .from('viagens')
      .update({ status: novoStatus })
      .eq('id', viagemId)

    if (!error) {
      carregarViagensDia()
    }
  }

  // Função para abrir modal de confirmação antes de concluir
  function abrirModalConfirmacao(viagem) {
    setDadosConfirmacao({
      passageiros: viagem.quantidade_passageiros || 1,
      bagagens_grandes: viagem.bagagens_grandes || 0,
      bagagens_pequenas: viagem.bagagens_pequenas || 0,
      horario_saida: '',
      horario_chegada: new Date().toTimeString().substring(0, 5)
    })
    setModalConfirmacao(viagem)
  }

  // Função para confirmar e concluir viagem
  async function confirmarEConcluir() {
    if (!modalConfirmacao) return

    const agora = new Date()
    const dataBase = new Date(modalConfirmacao.data_hora)
    
    let horarioSaida = null
    if (dadosConfirmacao.horario_saida) {
      const [h, m] = dadosConfirmacao.horario_saida.split(':')
      horarioSaida = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), parseInt(h), parseInt(m))
    }

    let horarioChegada = null
    if (dadosConfirmacao.horario_chegada) {
      const [h, m] = dadosConfirmacao.horario_chegada.split(':')
      horarioChegada = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), parseInt(h), parseInt(m))
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'concluida',
        dados_confirmados: true,
        passageiros_confirmados: parseInt(dadosConfirmacao.passageiros),
        bagagens_grandes_confirmadas: parseInt(dadosConfirmacao.bagagens_grandes),
        bagagens_pequenas_confirmadas: parseInt(dadosConfirmacao.bagagens_pequenas),
        horario_saida_real: horarioSaida?.toISOString() || null,
        horario_chegada_real: horarioChegada?.toISOString() || null
      })
      .eq('id', modalConfirmacao.id)

    if (!error) {
      await supabase.from('ocorrencias').insert([{
        viagem_id: modalConfirmacao.id,
        tipo: 'alteracao_status',
        descricao: `Viagem concluída. Passageiros: ${dadosConfirmacao.passageiros}, Bagagens: ${dadosConfirmacao.bagagens_grandes}G + ${dadosConfirmacao.bagagens_pequenas}P`,
        registrado_por: perfil.nome
      }])
      setModalConfirmacao(null)
      carregarViagensDia()
    } else {
      alert('Erro ao concluir viagem')
    }
  }

  // Função para abrir modal de No-Show
  function abrirModalNoShow(viagem) {
    setModalNoShow(viagem)
    setNoShowFoto(null)
    setNoShowPreview(null)
    setNoShowLocation(null)
    setNoShowEndereco('')
  }

  // Função para obter localização
  async function obterLocalizacao() {
    setObtendoLocalizacao(true)
    
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador')
      setObtendoLocalizacao(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setNoShowLocation({ latitude, longitude })
        
        // Tentar obter endereço via API de geocoding reverso (usando OpenStreetMap Nominatim - gratuito)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'AguaVerdeApp' } }
          )
          const data = await response.json()
          if (data.display_name) {
            setNoShowEndereco(data.display_name)
          }
        } catch (e) {
          console.log('Erro ao obter endereço:', e)
          setNoShowEndereco(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        }
        
        setObtendoLocalizacao(false)
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        alert('Não foi possível obter a localização. Verifique as permissões.')
        setObtendoLocalizacao(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Função para selecionar foto
  function handleFotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem')
      return
    }

    setNoShowFoto(file)
    
    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setNoShowPreview(e.target?.result)
    reader.readAsDataURL(file)

    // Obter localização automaticamente ao selecionar foto
    if (!noShowLocation) {
      obterLocalizacao()
    }
  }

  // Função para registrar No-Show
  async function registrarNoShow() {
    if (!modalNoShow || !noShowFoto) {
      alert('Tire uma foto para registrar o no-show')
      return
    }

    setEnviandoNoShow(true)

    try {
      // Upload da foto
      const timestamp = new Date().toISOString()
      const fileName = `noshow-${modalNoShow.id}-${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from('noshow-fotos')
        .upload(fileName, noShowFoto, { 
          contentType: noShowFoto.type,
          upsert: true 
        })

      if (uploadError) {
        console.error('Erro upload:', uploadError)
        alert('Erro ao enviar foto: ' + uploadError.message)
        setEnviandoNoShow(false)
        return
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('noshow-fotos')
        .getPublicUrl(fileName)

      // Atualizar viagem
      const { error: updateError } = await supabase
        .from('viagens')
        .update({
          status: 'no_show',
          no_show: true,
          no_show_foto_url: urlData.publicUrl,
          no_show_timestamp: timestamp,
          no_show_latitude: noShowLocation?.latitude || null,
          no_show_longitude: noShowLocation?.longitude || null,
          no_show_endereco: noShowEndereco || null
        })
        .eq('id', modalNoShow.id)

      if (updateError) {
        console.error('Erro update:', updateError)
        alert('Erro ao atualizar viagem: ' + updateError.message)
        setEnviandoNoShow(false)
        return
      }

      // Registrar ocorrência
      await supabase.from('ocorrencias').insert([{
        viagem_id: modalNoShow.id,
        tipo: 'no_show',
        descricao: `Passageiro não compareceu. Local: ${noShowEndereco || 'Não informado'}`,
        registrado_por: perfil.nome
      }])

      setModalNoShow(null)
      setNoShowFoto(null)
      setNoShowPreview(null)
      setNoShowLocation(null)
      setNoShowEndereco('')
      carregarViagensDia()
      alert('No-show registrado com sucesso!')

    } catch (e) {
      console.error('Erro:', e)
      alert('Erro ao registrar no-show')
    }

    setEnviandoNoShow(false)
  }

  async function registrarOcorrencia() {
    if (!textoOcorrencia.trim()) return

    const { error } = await supabase
      .from('ocorrencias')
      .insert({
        viagem_id: modalOcorrencia,
        descricao: textoOcorrencia,
        tipo: 'outro',
        registrado_por: perfil.nome
      })

    if (!error) {
      setModalOcorrencia(null)
      setTextoOcorrencia('')
      alert('Ocorrencia registrada!')
    }
  }

  function navegarData(dias) {
    const novaData = new Date(dataAtual)
    novaData.setDate(novaData.getDate() + dias)
    setDataAtual(novaData)
  }

  function navegarMes(meses) {
    const novaData = new Date(dataAtual)
    novaData.setMonth(novaData.getMonth() + meses)
    setDataAtual(novaData)
  }

  function selecionarDia(dia) {
    const novaData = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia)
    setDataAtual(novaData)
    setVisualizacao('dia')
  }

  function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatarMes(data) {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  function formatarHora(dataHora) {
    return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getBotaoAcao(viagem) {
    switch (viagem.status) {
      case 'vinculada':
        return { texto: 'Iniciar Deslocamento', proximo: 'a_caminho', cor: '#3498db' }
      case 'a_caminho':
        return { texto: 'Cheguei no Local', proximo: 'aguardando_passageiro', cor: '#9b59b6' }
      case 'aguardando_passageiro':
        return { texto: 'Iniciar Viagem', proximo: 'em_andamento', cor: '#f39c12' }
      case 'em_andamento':
        return { texto: 'Concluir Viagem', proximo: 'concluida', cor: '#27ae60', abreModal: true }
      default:
        return null
    }
  }

  function getStatusLabel(status) {
    const labels = {
      vinculada: 'Aguardando',
      a_caminho: 'A caminho',
      aguardando_passageiro: 'No local',
      em_andamento: 'Em andamento',
      concluida: 'Concluida',
      cancelada: 'Cancelada',
      no_show: 'No-Show'
    }
    return labels[status] || status
  }

  function getIniciais(nome) {
    return nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'
  }

  function contarViagensDia(dia) {
    const dataStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return viagensMes.filter(v => v.data_hora.startsWith(dataStr)).length
  }

  const viagemAtual = viagens.find(v => ['a_caminho', 'aguardando_passageiro', 'em_andamento'].includes(v.status))
  const proximasViagens = viagens.filter(v => v.status === 'vinculada')
  const viagensConcluidas = viagens.filter(v => v.status === 'concluida' || v.status === 'no_show')

  if (mostrarPerfil) {
    return <PerfilMotorista perfil={perfil} user={user} logout={logout} voltar={() => setMostrarPerfil(false)} getIniciais={getIniciais} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <img src="/logo-agua-verde.jpg" alt="Agua Verde" style={{ height: '40px' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sino de notificacao com dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              style={{
                position: 'relative',
                background: dropdownAberto ? '#e8f5e9' : '#f0f0f0',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: '#333' }}>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              {viagensNaoLidas.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#e74c3c',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {viagensNaoLidas.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {dropdownAberto && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Notificações</span>
                  {viagensNaoLidas.length > 0 && (
                    <button
                      onClick={marcarTodasComoLidas}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#27ae60',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {viagensNaoLidas.length === 0 ? (
                  <div style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#999'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                    <div>Nenhuma notificação pendente</div>
                  </div>
                ) : (
                  viagensNaoLidas.map(viagem => (
                    <div
                      key={viagem.id}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f5f5f5',
                        background: '#fffef5'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ 
                          fontWeight: 600, 
                          fontSize: '14px',
                          color: '#27ae60'
                        }}>
                          Nova viagem
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(viagem.data_hora).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <strong>{new Date(viagem.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                        {' - '}{viagem.passageiro_nome}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        {viagem.origem} → {viagem.destino}
                      </div>

                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                        {viagem.quantidade_passageiros} passageiro{viagem.quantidade_passageiros > 1 ? 's' : ''}
                        {(viagem.bagagens_grandes > 0 || viagem.bagagens_pequenas > 0) && (
                          <span> • {viagem.bagagens_grandes || 0}G + {viagem.bagagens_pequenas || 0}P bagagens</span>
                        )}
                      </div>

                      <button
                        onClick={() => marcarComoLida(viagem.id)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          color: '#555'
                        }}
                      >
                        ✓ Marcar como lida
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => setMostrarPerfil(true)}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getIniciais(perfil?.nome)}
          </button>
        </div>
      </div>

      {/* Toggle Dia/Mes */}
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={() => setVisualizacao('dia')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            background: visualizacao === 'dia' ? '#27ae60' : '#f0f0f0',
            color: visualizacao === 'dia' ? 'white' : '#333',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Dia
        </button>
        <button
          onClick={() => setVisualizacao('mes')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            background: visualizacao === 'mes' ? '#27ae60' : '#f0f0f0',
            color: visualizacao === 'mes' ? 'white' : '#333',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Mes
        </button>
      </div>

      {visualizacao === 'mes' ? (
        <CalendarioMensal 
          dataAtual={dataAtual}
          navegarMes={navegarMes}
          formatarMes={formatarMes}
          contarViagensDia={contarViagensDia}
          selecionarDia={selecionarDia}
          carregando={carregando}
        />
      ) : (
        <>
          {/* Navegacao de Data */}
          <div style={{
            background: 'white',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee'
          }}>
            <button onClick={() => navegarData(-1)} style={{
              background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
            }}>{'<'}</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{formatarData(dataAtual)}</div>
            </div>
            <button onClick={() => navegarData(1)} style={{
              background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
            }}>{'>'}</button>
          </div>

          {/* Resumo */}
          <div style={{ display: 'flex', gap: '12px', padding: '16px 20px' }}>
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#27ae60' }}>{viagens.length}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
            </div>
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3498db' }}>{viagensConcluidas.length}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Concluidas</div>
            </div>
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f39c12' }}>{proximasViagens.length}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pendentes</div>
            </div>
          </div>

          {/* Conteudo */}
          <div style={{ padding: '0 20px 20px' }}>
            {carregando ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando...</div>
            ) : (
              <>
                {viagemAtual && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                      Viagem Atual
                    </h3>
                    <ViagemCard 
                      viagem={viagemAtual} 
                      formatarHora={formatarHora}
                      getStatusLabel={getStatusLabel}
                      getBotaoAcao={getBotaoAcao}
                      atualizarStatus={atualizarStatus}
                      setModalOcorrencia={setModalOcorrencia}
                      abrirModalConfirmacao={abrirModalConfirmacao}
                      abrirModalNoShow={abrirModalNoShow}
                      destaque
                    />
                  </div>
                )}

                {proximasViagens.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                      Proximas Viagens
                    </h3>
                    {proximasViagens.map(viagem => (
                      <ViagemCard 
                        key={viagem.id}
                        viagem={viagem}
                        formatarHora={formatarHora}
                        getStatusLabel={getStatusLabel}
                        getBotaoAcao={getBotaoAcao}
                        atualizarStatus={atualizarStatus}
                        setModalOcorrencia={setModalOcorrencia}
                        abrirModalConfirmacao={abrirModalConfirmacao}
                        abrirModalNoShow={abrirModalNoShow}
                      />
                    ))}
                  </div>
                )}

                {viagensConcluidas.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                      Finalizadas
                    </h3>
                    {viagensConcluidas.map(viagem => (
                      <ViagemCard 
                        key={viagem.id}
                        viagem={viagem}
                        formatarHora={formatarHora}
                        getStatusLabel={getStatusLabel}
                        getBotaoAcao={getBotaoAcao}
                        atualizarStatus={atualizarStatus}
                        setModalOcorrencia={setModalOcorrencia}
                        abrirModalConfirmacao={abrirModalConfirmacao}
                        abrirModalNoShow={abrirModalNoShow}
                      />
                    ))}
                  </div>
                )}

                {viagens.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666', background: 'white', borderRadius: '12px', marginTop: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                    <div>Nenhuma viagem para este dia</div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal Ocorrencia */}
      {modalOcorrencia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px' }}>Registrar Ocorrencia</h3>
            <textarea
              value={textoOcorrencia}
              onChange={(e) => setTextoOcorrencia(e.target.value)}
              placeholder="Descreva a ocorrencia..."
              style={{
                width: '100%', minHeight: '120px', padding: '12px', border: '2px solid #e0e0e0',
                borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setModalOcorrencia(null)} style={{
                flex: 1, padding: '12px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Cancelar
              </button>
              <button onClick={registrarOcorrencia} style={{
                flex: 1, padding: '12px', background: '#e74c3c', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
              }}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Dados */}
      {modalConfirmacao && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Confirmar dados da viagem</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666' }}>
              Verifique e ajuste os dados se necessário
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                Passageiros
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number"
                  value={dadosConfirmacao.passageiros}
                  onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, passageiros: e.target.value })}
                  min="1"
                  style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                />
                <button 
                  onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, passageiros: modalConfirmacao.quantidade_passageiros })}
                  style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Original: {modalConfirmacao.quantidade_passageiros}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                Bagagens grandes (23kg)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number"
                  value={dadosConfirmacao.bagagens_grandes}
                  onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_grandes: e.target.value })}
                  min="0"
                  style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                />
                <button 
                  onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_grandes: modalConfirmacao.bagagens_grandes || 0 })}
                  style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Original: {modalConfirmacao.bagagens_grandes || 0}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                Bagagens pequenas (10kg)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number"
                  value={dadosConfirmacao.bagagens_pequenas}
                  onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_pequenas: e.target.value })}
                  min="0"
                  style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                />
                <button 
                  onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_pequenas: modalConfirmacao.bagagens_pequenas || 0 })}
                  style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Original: {modalConfirmacao.bagagens_pequenas || 0}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                Horário de saída (opcional)
              </label>
              <input
                type="time"
                value={dadosConfirmacao.horario_saida}
                onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, horario_saida: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                Horário de chegada
              </label>
              <input
                type="time"
                value={dadosConfirmacao.horario_chegada}
                onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, horario_chegada: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalConfirmacao(null)} style={{
                flex: 1, padding: '14px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px'
              }}>
                Cancelar
              </button>
              <button onClick={confirmarEConcluir} style={{
                flex: 1, padding: '14px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px'
              }}>
                Confirmar e Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal No-Show */}
      {modalNoShow && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#c62828' }}>
              Registrar No-Show
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666' }}>
              Passageiro: <strong>{modalNoShow.passageiro_nome}</strong>
            </p>

            {/* Área de foto */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                Foto do local (obrigatória)
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoSelect}
                style={{ display: 'none' }}
              />

              {noShowPreview ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={noShowPreview} 
                    alt="Preview" 
                    style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }}
                  />
                  <button
                    onClick={() => {
                      setNoShowFoto(null)
                      setNoShowPreview(null)
                    }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.6)', color: 'white',
                      border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                      cursor: 'pointer', fontSize: '18px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '40px 20px',
                    border: '2px dashed #ccc', borderRadius: '8px',
                    background: '#f9f9f9', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', fill: '#999' }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#666' }}>Tirar foto ou selecionar da galeria</span>
                </button>
              )}
            </div>

            {/* Localização */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                Localização
              </label>
              
              {noShowLocation ? (
                <div style={{ padding: '12px', background: '#e8f5e9', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#2e7d32' }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span style={{ color: '#2e7d32', fontWeight: 500 }}>Localização obtida</span>
                  </div>
                  {noShowEndereco && (
                    <div style={{ color: '#666', marginTop: '4px' }}>{noShowEndereco}</div>
                  )}
                </div>
              ) : (
                <button
                  onClick={obterLocalizacao}
                  disabled={obtendoLocalizacao}
                  style={{
                    width: '100%', padding: '12px',
                    background: obtendoLocalizacao ? '#ccc' : '#3498db',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: obtendoLocalizacao ? 'not-allowed' : 'pointer',
                    fontWeight: 500, fontSize: '14px'
                  }}
                >
                  {obtendoLocalizacao ? 'Obtendo localização...' : 'Obter minha localização'}
                </button>
              )}
            </div>

            {/* Info do timestamp */}
            <div style={{ 
              padding: '12px', 
              background: '#fff3e0', 
              borderRadius: '8px', 
              fontSize: '13px',
              marginBottom: '20px',
              color: '#e65100'
            }}>
              <strong>Atenção:</strong> A data, hora e localização serão registradas automaticamente para comprovar sua presença no local.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalNoShow(null)} style={{
                flex: 1, padding: '14px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px'
              }}>
                Cancelar
              </button>
              <button 
                onClick={registrarNoShow} 
                disabled={!noShowFoto || enviandoNoShow}
                style={{
                  flex: 1, padding: '14px', 
                  background: (!noShowFoto || enviandoNoShow) ? '#ccc' : '#c62828', 
                  color: 'white',
                  border: 'none', borderRadius: '8px', 
                  cursor: (!noShowFoto || enviandoNoShow) ? 'not-allowed' : 'pointer', 
                  fontWeight: 600, fontSize: '15px'
                }}
              >
                {enviandoNoShow ? 'Enviando...' : 'Registrar No-Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarioMensal({ dataAtual, navegarMes, formatarMes, contarViagensDia, selecionarDia, carregando }) {
  const ano = dataAtual.getFullYear()
  const mes = dataAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const hoje = new Date()

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  const dias = []
  for (let i = 0; i < primeiroDia; i++) {
    dias.push(null)
  }
  for (let i = 1; i <= diasNoMes; i++) {
    dias.push(i)
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => navegarMes(-1)} style={{
            background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
          }}>{'<'}</button>
          <div style={{ fontWeight: 600, fontSize: '18px', textTransform: 'capitalize' }}>{formatarMes(dataAtual)}</div>
          <button onClick={() => navegarMes(1)} style={{
            background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
          }}>{'>'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {diasSemana.map(dia => (
            <div key={dia} style={{ textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 600, padding: '8px 0' }}>
              {dia}
            </div>
          ))}
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {dias.map((dia, index) => {
              if (!dia) {
                return <div key={index} />
              }

              const qtdViagens = contarViagensDia(dia)
              const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano

              return (
                <button
                  key={index}
                  onClick={() => selecionarDia(dia)}
                  style={{
                    aspectRatio: '1',
                    border: ehHoje ? '2px solid #27ae60' : 'none',
                    borderRadius: '8px',
                    background: qtdViagens > 0 ? '#e8f5e9' : '#f8f8f8',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: ehHoje ? 700 : 400, color: ehHoje ? '#27ae60' : '#333' }}>
                    {dia}
                  </span>
                  {qtdViagens > 0 && (
                    <span style={{
                      fontSize: '10px',
                      background: '#27ae60',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontWeight: 600
                    }}>
                      {qtdViagens}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '12px', color: '#666' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#e8f5e9', borderRadius: '4px' }} />
          <span>Com viagens</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', border: '2px solid #27ae60', borderRadius: '4px' }} />
          <span>Hoje</span>
        </div>
      </div>
    </div>
  )
}

function PerfilMotorista({ perfil, user, logout, voltar, getIniciais }) {
  const [nome, setNome] = useState(perfil?.nome || '')
  const [novaSenha, setNovaSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(perfil?.foto_url || '')
  const [uploadando, setUploadando] = useState(false)

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMensagem('Selecione uma imagem')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMensagem('Imagem deve ter no maximo 2MB')
      return
    }

    setUploadando(true)
    setMensagem('')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setMensagem('Erro ao enviar foto')
      setUploadando(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const novaUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('perfis')
      .update({ foto_url: novaUrl })
      .eq('id', user.id)

    if (updateError) {
      setMensagem('Erro ao salvar foto')
    } else {
      setFotoUrl(novaUrl)
      setMensagem('Foto atualizada!')
    }

    setUploadando(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  async function salvarNome() {
    setSalvando(true)
    const { error } = await supabase
      .from('perfis')
      .update({ nome })
      .eq('id', user.id)

    if (error) {
      setMensagem('Erro ao salvar nome')
    } else {
      setMensagem('Nome atualizado!')
    }
    setSalvando(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  async function alterarSenha() {
    if (novaSenha.length < 6) {
      setMensagem('Senha deve ter no minimo 6 caracteres')
      return
    }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    if (error) {
      setMensagem('Erro ao alterar senha')
    } else {
      setMensagem('Senha alterada com sucesso!')
      setNovaSenha('')
    }
    setSalvando(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
      <div style={{
        background: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <button onClick={voltar} style={{
          background: '#f0f0f0',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 500
        }}>
          ← Voltar
        </button>
        <span style={{ fontWeight: 600 }}>Meu Perfil</span>
        <div style={{ width: '80px' }}></div>
      </div>

      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {/* Avatar com upload */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <label style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoUpload}
              style={{ display: 'none' }}
            />
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Avatar"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #27ae60'
                }}
              />
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                fontSize: '36px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getIniciais(perfil?.nome)}
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              background: '#27ae60',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'white' }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </label>
          {uploadando && <div style={{ marginTop: '8px', color: '#666' }}>Enviando...</div>}
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', marginTop: '8px' }}>
            Toque para alterar foto
          </div>
        </div>

        {mensagem && (
          <div style={{
            background: mensagem.includes('Erro') ? '#fee' : '#d4edda',
            color: mensagem.includes('Erro') ? '#c00' : '#155724',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {mensagem}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Dados Pessoais</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333', fontSize: '14px' }}>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', background: '#f5f5f5', color: '#666' }}
            />
          </div>

          <button onClick={salvarNome} disabled={salvando} style={{
            width: '100%', padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer'
          }}>
            {salvando ? 'Salvando...' : 'Salvar Nome'}
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Alterar Senha</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333', fontSize: '14px' }}>Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Minimo 6 caracteres"
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <button onClick={alterarSenha} disabled={salvando || !novaSenha} style={{
            width: '100%', padding: '12px', background: novaSenha ? '#3498db' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: novaSenha ? 'pointer' : 'not-allowed'
          }}>
            {salvando ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>

        <button onClick={logout} style={{
          width: '100%', padding: '14px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer'
        }}>
          Sair da Conta
        </button>
      </div>
    </div>
  )
}

function ViagemCard({ viagem, formatarHora, getStatusLabel, getBotaoAcao, atualizarStatus, setModalOcorrencia, abrirModalConfirmacao, abrirModalNoShow, destaque }) {
  const botao = getBotaoAcao(viagem)
  const totalBagagens = (viagem.bagagens_grandes || 0) + (viagem.bagagens_pequenas || 0)

  // Verificar se deve mostrar telefone
  const mostrarTelefone = viagem.compartilhar_telefone === true

  return (
    <div style={{
      background: viagem.status === 'no_show' ? '#fff5f5' : 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: destaque ? '2px solid #27ae60' : viagem.status === 'no_show' ? '1px solid #ffcdd2' : 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '18px' }}>{formatarHora(viagem.data_hora)}</div>
          <div style={{
            display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
            background: viagem.status === 'concluida' ? '#d4edda' : viagem.status === 'no_show' ? '#ffebee' : '#fff3cd',
            color: viagem.status === 'concluida' ? '#155724' : viagem.status === 'no_show' ? '#c62828' : '#856404'
          }}>
            {getStatusLabel(viagem.status)}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#666' }}>
          <div>{viagem.quantidade_passageiros} passageiro{viagem.quantidade_passageiros > 1 ? 's' : ''}</div>
          <div>
            {totalBagagens > 0 ? (
              <span>{viagem.bagagens_grandes || 0}G + {viagem.bagagens_pequenas || 0}P</span>
            ) : (
              <span>Sem bagagens</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ color: '#27ae60', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.origem}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ color: '#e74c3c', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.destino}</span>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        <strong>Passageiro:</strong> {viagem.passageiro_nome}
      </div>

      {viagem.voo_numero && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', padding: '8px', background: '#f8f9fa', borderRadius: '6px' }}>
          Voo: {viagem.voo_numero} {viagem.voo_companhia && `(${viagem.voo_companhia})`}
        </div>
      )}

      {viagem.observacoes && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', padding: '8px', background: '#fff8e6', borderRadius: '6px' }}>
          <strong>Obs:</strong> {viagem.observacoes}
        </div>
      )}

      {/* No-Show info */}
      {viagem.status === 'no_show' && viagem.no_show_timestamp && (
        <div style={{ 
          fontSize: '12px', 
          color: '#c62828', 
          marginBottom: '12px', 
          padding: '8px', 
          background: '#ffebee', 
          borderRadius: '6px' 
        }}>
          <strong>No-show registrado:</strong> {new Date(viagem.no_show_timestamp).toLocaleString('pt-BR')}
          {viagem.no_show_endereco && <div style={{ marginTop: '4px' }}>Local: {viagem.no_show_endereco}</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {botao && (
          <button
            onClick={() => {
              if (botao.abreModal) {
                abrirModalConfirmacao(viagem)
              } else {
                atualizarStatus(viagem.id, botao.proximo)
              }
            }}
            style={{
              flex: 1, padding: '12px', background: botao.cor, color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', minWidth: '140px'
            }}
          >
            {botao.texto}
          </button>
        )}

        {/* Botões de telefone - só aparecem se compartilhar_telefone for true */}
        {mostrarTelefone && viagem.passageiro_telefone && (
          <>
            <a href={`tel:${viagem.passageiro_telefone}`} style={{
              padding: '10px 14px', background: '#f0f0f0', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: '#333' }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </a>
            <a href={`https://wa.me/55${viagem.passageiro_telefone.replace(/\D/g, '')}`} style={{
              padding: '10px 14px', background: '#25d366', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: 'white' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </>
        )}

        {/* Botão de ocorrência - sempre visível */}
        <button onClick={() => setModalOcorrencia(viagem.id)} style={{
          padding: '12px 16px', background: '#fee', color: '#c00', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
        }}>
          ⚠️
        </button>

        {/* Botão No-Show - aparece quando está aguardando passageiro */}
        {viagem.status === 'aguardando_passageiro' && (
          <button onClick={() => abrirModalNoShow(viagem)} style={{
            padding: '12px 16px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
          }}>
            No-Show
          </button>
        )}
      </div>
    </div>
  )
}

export default MotoristaApp
