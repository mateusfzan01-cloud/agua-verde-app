import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Motoristas() {
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
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
                    fontWeight: 500
                  }}
                >
                  Editar
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
                    color: motorista.ativo ? '#c62828' : '#2e7d32'
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
    </>
  )
}

export default Motoristas
