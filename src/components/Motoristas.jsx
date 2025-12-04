import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function Motoristas() {
  const { user } = useAuth()
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null)
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    marca_modelo: '',
    cor: '',
    placa: ''
  })

  // Estado para modal de convite
  const [modalConvite, setModalConvite] = useState(null)
  const [emailConvite, setEmailConvite] = useState('')
  const [linkConvite, setLinkConvite] = useState('')
  const [gerandoConvite, setGerandoConvite] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    fetchMotoristas()
  }, [])

  async function fetchMotoristas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .order('nome')
    
    if (!error) {
      setMotoristas(data || [])
    }
    setLoading(false)
  }

  function abrirModal(motorista = null) {
    if (motorista) {
      setMotoristaSelecionado(motorista)
      setForm({
        nome: motorista.nome || '',
        telefone: motorista.telefone || '',
        email: motorista.email || '',
        marca_modelo: motorista.marca_modelo || '',
        cor: motorista.cor || '',
        placa: motorista.placa || ''
      })
    } else {
      setMotoristaSelecionado(null)
      setForm({
        nome: '',
        telefone: '',
        email: '',
        marca_modelo: '',
        cor: '',
        placa: ''
      })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setMotoristaSelecionado(null)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function salvarMotorista(e) {
    e.preventDefault()
    
    if (motoristaSelecionado) {
      const { error } = await supabase
        .from('motoristas')
        .update(form)
        .eq('id', motoristaSelecionado.id)
      
      if (error) {
        alert('Erro ao atualizar motorista')
        return
      }
    } else {
      const { error } = await supabase
        .from('motoristas')
        .insert([{ ...form, ativo: true }])
      
      if (error) {
        alert('Erro ao criar motorista')
        return
      }
    }
    
    fecharModal()
    fetchMotoristas()
  }

  async function toggleAtivo(motorista) {
    const { error } = await supabase
      .from('motoristas')
      .update({ ativo: !motorista.ativo })
      .eq('id', motorista.id)

    if (!error) {
      fetchMotoristas()
    }
  }

  function abrirModalConvite(motorista) {
    setModalConvite(motorista)
    setEmailConvite(motorista.email || '')
    setLinkConvite('')
    setCopiado(false)
  }

  function fecharModalConvite() {
    setModalConvite(null)
    setEmailConvite('')
    setLinkConvite('')
    setCopiado(false)
  }

  async function gerarConvite() {
    if (!emailConvite || !emailConvite.includes('@')) {
      alert('Informe um email valido')
      return
    }

    setGerandoConvite(true)

    try {
      // Gerar token unico
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Criar convite no banco
      const { data, error } = await supabase
        .from('motorista_convites')
        .insert([{
          motorista_id: modalConvite.id,
          email: emailConvite,
          token: token,
          criado_por: user?.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar convite:', error)
        alert('Erro ao gerar convite. Verifique se a tabela motorista_convites existe.')
        setGerandoConvite(false)
        return
      }

      // Gerar link
      const baseUrl = window.location.origin
      const link = `${baseUrl}/convite/${token}`
      setLinkConvite(link)
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao gerar convite')
    }

    setGerandoConvite(false)
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkConvite)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function enviarWhatsApp() {
    const mensagem = `Olá, ${modalConvite.nome}!\n\nVocê foi convidado a fazer parte da equipe Água Verde Turismo.\n\nClique no link abaixo para criar sua conta:\n${linkConvite}\n\nEste link expira em 7 dias.`
    const telefone = modalConvite.telefone?.replace(/\D/g, '')
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  function getIniciais(nome) {
    return nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="page-title">Motoristas</h1>
          <span style={{ color: 'var(--cinza-texto)', fontSize: 14 }}>
            {motoristas.length} cadastrado{motoristas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          + Novo Motorista
        </button>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: 16 
      }}>
        {motoristas.map(motorista => (
          <div 
            key={motorista.id} 
            style={{
              background: 'white',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              opacity: motorista.ativo ? 1 : 0.6
            }}
          >
            {/* Header do Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: motorista.ativo ? 'var(--verde-escuro)' : '#666',
              color: 'white'
            }}>
              {motorista.foto_url ? (
                <img 
                  src={motorista.foto_url} 
                  alt={motorista.nome}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 600
                }}>
                  {getIniciais(motorista.nome)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{motorista.nome}</div>
                <div style={{ 
                  fontSize: 11, 
                  opacity: 0.9,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  {motorista.ativo ? 'Ativo' : 'Inativo'}
                </div>
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div style={{ padding: 16 }}>
              {/* Telefone */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'var(--cinza-texto)', strokeWidth: 2, fill: 'none', flexShrink: 0 }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span style={{ fontSize: 14 }}>{motorista.telefone}</span>
              </div>

              {/* Email */}
              {motorista.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'var(--cinza-texto)', strokeWidth: 2, fill: 'none', flexShrink: 0 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 14, color: 'var(--cinza-texto)' }}>{motorista.email}</span>
                </div>
              )}

              {/* Veículo */}
              {(motorista.marca_modelo || motorista.placa) && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 12, 
                  background: '#f8f9fa', 
                  borderRadius: 8 
                }}>
                  <div style={{ 
                    fontSize: 11, 
                    color: 'var(--cinza-texto)', 
                    textTransform: 'uppercase', 
                    marginBottom: 6,
                    fontWeight: 600
                  }}>
                    Veículo
                  </div>
                  {motorista.marca_modelo && (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {motorista.marca_modelo}
                      {motorista.cor && <span style={{ color: 'var(--cinza-texto)' }}> - {motorista.cor}</span>}
                    </div>
                  )}
                  {motorista.placa && (
                    <div style={{ 
                      display: 'inline-block',
                      marginTop: 6,
                      padding: '4px 10px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      fontSize: 13
                    }}>
                      {motorista.placa}
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => abrirModal(motorista)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: 80
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => abrirModalConvite(motorista)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#e3f2fd',
                    border: '1px solid #bbdefb',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1565c0',
                    minWidth: 80
                  }}
                >
                  Convidar
                </button>
                <button
                  onClick={() => toggleAtivo(motorista)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: motorista.ativo ? '#fff5f5' : '#f0fff4',
                    border: `1px solid ${motorista.ativo ? '#ffcdd2' : '#c8e6c9'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: motorista.ativo ? '#c62828' : '#2e7d32',
                    minWidth: 80
                  }}
                >
                  {motorista.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {motoristas.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          color: 'var(--cinza-texto)',
          background: 'white',
          borderRadius: 12,
          marginTop: 20
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Nenhum motorista cadastrado</div>
          <div>Clique em "Novo Motorista" para começar</div>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                {motoristaSelecionado ? 'Editar Motorista' : 'Novo Motorista'}
              </h2>
              <button 
                onClick={fecharModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarMotorista} style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Nome *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  required
                  placeholder="(81) 99999-9999"
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ 
                padding: 16, 
                background: '#f8f9fa', 
                borderRadius: 8, 
                marginBottom: 20 
              }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 16,
                  color: 'var(--verde-escuro)'
                }}>
                  🚗 Dados do Veículo
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                    Marca / Modelo
                  </label>
                  <input
                    type="text"
                    name="marca_modelo"
                    value={form.marca_modelo}
                    onChange={handleChange}
                    placeholder="Ex: Toyota Corolla 2022"
                    style={{
                      width: '100%',
                      padding: 12,
                      border: '2px solid #e0e0e0',
                      borderRadius: 8,
                      fontSize: 16,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                      Cor
                    </label>
                    <input
                      type="text"
                      name="cor"
                      value={form.cor}
                      onChange={handleChange}
                      placeholder="Ex: Prata"
                      style={{
                        width: '100%',
                        padding: 12,
                        border: '2px solid #e0e0e0',
                        borderRadius: 8,
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                      Placa
                    </label>
                    <input
                      type="text"
                      name="placa"
                      value={form.placa}
                      onChange={handleChange}
                      placeholder="ABC1D23"
                      style={{
                        width: '100%',
                        padding: 12,
                        border: '2px solid #e0e0e0',
                        borderRadius: 8,
                        fontSize: 16,
                        boxSizing: 'border-box',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={fecharModal}
                  style={{
                    flex: 1,
                    padding: 14,
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 14,
                    background: 'var(--verde-escuro)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Convite */}
      {modalConvite && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 450,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Convidar Motorista
              </h2>
              <button
                onClick={fecharModalConvite}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                x
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
                padding: 16,
                background: '#f8f9fa',
                borderRadius: 8
              }}>
                {modalConvite.foto_url ? (
                  <img
                    src={modalConvite.foto_url}
                    alt={modalConvite.nome}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--verde-escuro)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 600
                  }}>
                    {getIniciais(modalConvite.nome)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{modalConvite.nome}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{modalConvite.telefone}</div>
                </div>
              </div>

              {!linkConvite ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                      Email do motorista *
                    </label>
                    <input
                      type="email"
                      value={emailConvite}
                      onChange={(e) => setEmailConvite(e.target.value)}
                      placeholder="email@exemplo.com"
                      style={{
                        width: '100%',
                        padding: 14,
                        border: '2px solid #e0e0e0',
                        borderRadius: 8,
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                      Este email sera usado para login do motorista no app
                    </p>
                  </div>

                  <button
                    onClick={gerarConvite}
                    disabled={gerandoConvite || !emailConvite}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: gerandoConvite || !emailConvite ? '#ccc' : 'var(--verde-escuro)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: gerandoConvite || !emailConvite ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {gerandoConvite ? 'Gerando...' : 'Gerar Link de Convite'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    padding: 16,
                    background: '#e8f5e9',
                    borderRadius: 8,
                    marginBottom: 16
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      color: '#2e7d32',
                      fontWeight: 600
                    }}>
                      <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#2e7d32' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      Link gerado com sucesso!
                    </div>
                    <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                      Este link expira em 7 dias
                    </p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                      Link de convite
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: 8
                    }}>
                      <input
                        type="text"
                        value={linkConvite}
                        readOnly
                        style={{
                          flex: 1,
                          padding: 12,
                          border: '2px solid #e0e0e0',
                          borderRadius: 8,
                          fontSize: 13,
                          background: '#f5f5f5'
                        }}
                      />
                      <button
                        onClick={copiarLink}
                        style={{
                          padding: '12px 16px',
                          background: copiado ? '#27ae60' : '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {modalConvite.telefone && (
                    <button
                      onClick={enviarWhatsApp}
                      style={{
                        width: '100%',
                        padding: 14,
                        background: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Enviar via WhatsApp
                    </button>
                  )}

                  <button
                    onClick={fecharModalConvite}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#f0f0f0',
                      color: '#333',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 12
                    }}
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Motoristas
