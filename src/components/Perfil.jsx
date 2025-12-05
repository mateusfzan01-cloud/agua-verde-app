import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getIniciais } from '../utils/formatters'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

function Perfil() {
  const navigate = useNavigate()
  const { perfil, user, logout } = useAuth()
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: perfil?.nome || ''
  })
  const [senhaForm, setSenhaForm] = useState({
    novaSenha: '',
    confirmarSenha: ''
  })
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })

  async function handleSalvarPerfil(e) {
    e.preventDefault()
    setSalvando(true)
    setMensagem({ tipo: '', texto: '' })

    const { error } = await supabase
      .from('perfis')
      .update({ nome: form.nome })
      .eq('id', user.id)

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + error.message })
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' })
      setEditando(false)
      // Recarregar a página para atualizar o perfil no contexto
      setTimeout(() => window.location.reload(), 1000)
    }

    setSalvando(false)
  }

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setMensagem({ tipo: '', texto: '' })

    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem' })
      return
    }

    if (senhaForm.novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }

    setSalvando(true)

    const { error } = await supabase.auth.updateUser({
      password: senhaForm.novaSenha
    })

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao alterar senha: ' + error.message })
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' })
      setSenhaForm({ novaSenha: '', confirmarSenha: '' })
    }

    setSalvando(false)
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="page-title">Minha Conta</h1>
        </div>
      </header>

      <div style={{ maxWidth: 600 }}>
        {mensagem.texto && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            background: mensagem.tipo === 'erro' ? '#ffebee' : '#e8f5e9',
            color: mensagem.tipo === 'erro' ? '#c62828' : '#2e7d32',
            fontSize: 14
          }}>
            {mensagem.texto}
          </div>
        )}

        {/* Dados do Perfil */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">Dados do Perfil</h2>
            {!editando && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 16px' }}
                onClick={() => setEditando(true)}
              >
                Editar
              </button>
            )}
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--verde-escuro)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700
              }}>
                {getIniciais(perfil?.nome)}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{perfil?.nome}</div>
                <div style={{ color: 'var(--cinza-texto)' }}>
                  {perfil?.tipo === 'admin' ? 'Administrador' : perfil?.tipo === 'gerente' ? 'Gerente' : 'Motorista'}
                </div>
              </div>
            </div>

            {editando ? (
              <form onSubmit={handleSalvarPerfil}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={user?.email || ''}
                    disabled
                    style={{ background: 'var(--cinza-claro)', color: 'var(--cinza-texto)' }}
                  />
                  <p className="form-hint">O email não pode ser alterado</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-texto)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Email</div>
                  <div>{user?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-texto)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Tipo de Conta</div>
                  <div>{perfil?.tipo === 'admin' ? 'Administrador' : perfil?.tipo === 'gerente' ? 'Gerente' : 'Motorista'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alterar Senha */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">Alterar Senha</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleAlterarSenha}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Nova senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={senhaForm.novaSenha}
                  onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Confirmar nova senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={senhaForm.confirmarSenha}
                  onChange={(e) => setSenhaForm({ ...senhaForm, confirmarSenha: e.target.value })}
                  placeholder="Digite a senha novamente"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={salvando || !senhaForm.novaSenha}>
                {salvando ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>

        {/* Sair */}
        <div className="card">
          <div className="card-body">
            <button 
              className="btn btn-danger" 
              onClick={logout}
              style={{ width: '100%' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Perfil