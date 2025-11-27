import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPerfil(userId) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*, motoristas(*)')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao buscar perfil:', error)
    } else {
      setPerfil(data)
    }
    setLoading(false)
  }

  async function login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })
    
    if (error) throw error
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function criarUsuario(email, senha, nome, tipo, motoristaId = null) {
    // Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha
    })

    if (authError) throw authError

    // Criar perfil
    const { error: perfilError } = await supabase
      .from('perfis')
      .insert([{
        id: authData.user.id,
        nome,
        tipo,
        motorista_id: motoristaId
      }])

    if (perfilError) throw perfilError

    return authData
  }

  const value = {
    user,
    perfil,
    loading,
    login,
    logout,
    criarUsuario,
    isAdmin: perfil?.tipo === 'admin',
    isGerente: perfil?.tipo === 'gerente',
    isMotorista: perfil?.tipo === 'motorista'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
