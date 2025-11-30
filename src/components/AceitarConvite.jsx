import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function AceitarConvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [convite, setConvite] = useState(null)
  const [motorista, setMotorista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [criandoConta, setCriandoConta] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    verificarConvite()
  }, [token])

  async function verificarConvite() {
    setLoading(true)

    // Buscar convite pelo token
    const { data: conviteData, error: conviteError } = await supabase
      .from('motorista_convites')
      .select('*, motoristas(*)')
      .eq('token', token)
      .single()

    if (conviteError || !conviteData) {
      setErro('Convite nao encontrado ou invalido.')
      setLoading(false)
      return
    }

    // Verificar se ja foi usado
    if (conviteData.status === 'aceito') {
      setErro('Este convite ja foi utilizado.')
      setLoading(false)
      return
    }

    // Verificar se expirou
    if (new Date(conviteData.expira_em) < new Date()) {
      setErro('Este convite expirou. Solicite um novo convite ao administrador.')
      setLoading(false)
      return
    }

    setConvite(conviteData)
    setMotorista(conviteData.motoristas)
    setLoading(false)
  }

  async function criarConta(e) {
    e.preventDefault()

    if (senha.length < 6) {
      setErro('A senha deve ter no minimo 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas nao conferem.')
      return
    }

    setCriandoConta(true)
    setErro('')

    try {
      // 1. Criar usuario no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: convite.email,
        password: senha
      })

      if (authError) {
        throw new Error(authError.message)
      }

      // 2. Criar perfil do motorista
      const { error: perfilError } = await supabase
        .from('perfis')
        .insert([{
          id: authData.user.id,
          nome: motorista.nome,
          tipo: 'motorista',
          motorista_id: motorista.id,
          foto_url: motorista.foto_url
        }])

      if (perfilError) {
        console.error('Erro ao criar perfil:', perfilError)
        // Nao e fatal, o perfil pode ser criado depois
      }

      // 3. Atualizar status do convite
      await supabase
        .from('motorista_convites')
        .update({
          status: 'aceito',
          aceito_em: new Date().toISOString()
        })
        .eq('id', convite.id)

      // 4. Atualizar email do motorista se necessario
      if (!motorista.email || motorista.email !== convite.email) {
        await supabase
          .from('motoristas')
          .update({ email: convite.email })
          .eq('id', motorista.id)
      }

      setSucesso(true)
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      setErro(error.message || 'Erro ao criar conta. Tente novamente.')
    }

    setCriandoConta(false)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <p>Verificando convite...</p>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#27ae60',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 40, height: 40, fill: 'white' }}>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 16px', color: '#27ae60' }}>Conta Criada!</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Sua conta foi criada com sucesso. Verifique seu email para confirmar o cadastro.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: 14,
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Ir para o App
          </button>
        </div>
      </div>
    )
  }

  if (erro && !convite) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#e74c3c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 40, height: 40, fill: 'white' }}>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 16px', color: '#e74c3c' }}>Convite Invalido</h2>
          <p style={{ color: '#666' }}>{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        maxWidth: 450,
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          background: '#27ae60',
          padding: 24,
          textAlign: 'center',
          color: 'white'
        }}>
          <img
            src="/logo-agua-verde.jpg"
            alt="Agua Verde"
            style={{ height: 50, marginBottom: 12, borderRadius: 8 }}
          />
          <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Bem-vindo, {motorista?.nome}!</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            Crie sua senha para acessar o app
          </p>
        </div>

        {/* Form */}
        <form onSubmit={criarConta} style={{ padding: 24 }}>
          {erro && (
            <div style={{
              padding: 12,
              background: '#fee',
              borderRadius: 8,
              marginBottom: 20,
              color: '#c00',
              fontSize: 14
            }}>
              {erro}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Email
            </label>
            <input
              type="email"
              value={convite?.email || ''}
              disabled
              style={{
                width: '100%',
                padding: 14,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 16,
                background: '#f5f5f5',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Criar Senha *
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Minimo 6 caracteres"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: 14,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Confirmar Senha *
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: 14,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={criandoConta}
            style={{
              width: '100%',
              padding: 16,
              background: criandoConta ? '#ccc' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: criandoConta ? 'not-allowed' : 'pointer'
            }}
          >
            {criandoConta ? 'Criando conta...' : 'Criar Minha Conta'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #eee',
          textAlign: 'center',
          fontSize: 13,
          color: '#666'
        }}>
          Ao criar sua conta, voce concorda com os termos de uso do app.
        </div>
      </div>
    </div>
  )
}

export default AceitarConvite
