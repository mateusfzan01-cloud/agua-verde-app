import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      await login(email, senha)
    } catch (error) {
      console.error('Erro no login:', error)
      if (error.message.includes('Invalid login')) {
        setErro('Email ou senha incorretos')
      } else {
        setErro('Erro ao fazer login. Tente novamente.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <svg viewBox="0 0 180 60" className="login-logo">
            <polygon points="30,10 50,50 30,40" fill="#4cb963"/>
            <polygon points="30,10 10,50 30,40" fill="#1a5c38"/>
            <text x="60" y="32" fill="#1a5c38" fontSize="18" fontWeight="bold" fontFamily="Inter, sans-serif">
              ÁGUA <tspan fill="#4cb963">VERDE</tspan>
            </text>
            <text x="60" y="46" fill="#666" fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="1">
              VIAGENS &amp; RECEPTIVOS
            </text>
          </svg>
          <h1>Entrar no Sistema</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {erro && (
            <div className="login-erro">
              {erro}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
