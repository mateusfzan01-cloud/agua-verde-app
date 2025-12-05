import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function ModalNoShow({ viagem, perfilNome, onClose, onSucesso }) {
  const [noShowFoto, setNoShowFoto] = useState(null)
  const [noShowPreview, setNoShowPreview] = useState(null)
  const [noShowLocation, setNoShowLocation] = useState(null)
  const [noShowEndereco, setNoShowEndereco] = useState('')
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false)
  const [enviandoNoShow, setEnviandoNoShow] = useState(false)
  const fileInputRef = useRef(null)

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

  function handleFotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem')
      return
    }

    setNoShowFoto(file)

    const reader = new FileReader()
    reader.onload = (e) => setNoShowPreview(e.target?.result)
    reader.readAsDataURL(file)

    if (!noShowLocation) {
      obterLocalizacao()
    }
  }

  async function registrarNoShow() {
    if (!noShowFoto) {
      alert('Tire uma foto para registrar o no-show')
      return
    }

    setEnviandoNoShow(true)

    try {
      const timestamp = new Date().toISOString()
      const fileName = `noshow-${viagem.id}-${Date.now()}.jpg`

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

      const { data: urlData } = supabase.storage
        .from('noshow-fotos')
        .getPublicUrl(fileName)

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
        .eq('id', viagem.id)

      if (updateError) {
        console.error('Erro update:', updateError)
        alert('Erro ao atualizar viagem: ' + updateError.message)
        setEnviandoNoShow(false)
        return
      }

      await supabase.from('ocorrencias').insert([{
        viagem_id: viagem.id,
        tipo: 'no_show',
        descricao: `Passageiro não compareceu. Local: ${noShowEndereco || 'Não informado'}`,
        registrado_por: perfilNome
      }])

      onClose()
      alert('No-show registrado com sucesso!')
      if (onSucesso) onSucesso()

    } catch (e) {
      console.error('Erro:', e)
      alert('Erro ao registrar no-show')
    }

    setEnviandoNoShow(false)
  }

  return (
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
          Passageiro: <strong>{viagem.passageiro_nome}</strong>
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
          <button onClick={onClose} style={{
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
  )
}

export default ModalNoShow
