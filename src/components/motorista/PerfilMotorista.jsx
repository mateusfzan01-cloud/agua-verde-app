import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function PerfilMotorista({ perfil, user, logout, voltar, getIniciais }) {
  const [nome, setNome] = useState(perfil?.nome || '')
  const [novaSenha, setNovaSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(perfil?.foto_url || '')
  const [uploadando, setUploadando] = useState(false)

  // Ref para o input de foto (fix mobile upload)
  const fotoInputRef = useRef(null)

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

    // Também atualizar na tabela motoristas
    if (perfil?.motorista_id) {
      await supabase
        .from('motoristas')
        .update({ foto_url: novaUrl })
        .eq('id', perfil.motorista_id)
    }

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
        {/* Avatar com upload - CORRIGIDO: usando ref + click programático para compatibilidade mobile */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {/* Input escondido com ref (fora do elemento clicável para compatibilidade Android) */}
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFotoUpload}
            style={{ display: 'none' }}
          />

          {/* Div clicável que aciona o input via ref */}
          <div
            onClick={() => fotoInputRef.current?.click()}
            style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
          >
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
          </div>

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

export default PerfilMotorista
