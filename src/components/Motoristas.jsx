import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Motoristas() {
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' })

  useEffect(() => {
    fetchMotoristas()
  }, [])

  async function fetchMotoristas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .order('nome')

    if (error) {
      console.error('Erro ao buscar motoristas:', error)
    } else {
      setMotoristas(data || [])
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (editando) {
      const { error } = await supabase
        .from('motoristas')
        .update(form)
        .eq('id', editando)

      if (error) {
        alert('Erro ao atualizar motorista')
      }
    } else {
      const { error } = await supabase
        .from('motoristas')
        .insert([form])

      if (error) {
        alert('Erro ao criar motorista: ' + error.message)
      }
    }

    setForm({ nome: '', telefone: '', email: '' })
    setShowForm(false)
    setEditando(null)
    fetchMotoristas()
  }

  function handleEditar(motorista) {
    setForm({ nome: motorista.nome, telefone: motorista.telefone, email: motorista.email || '' })
    setEditando(motorista.id)
    setShowForm(true)
  }

  async function handleToggleAtivo(motorista) {
    const { error } = await supabase
      .from('motoristas')
      .update({ ativo: !motorista.ativo })
      .eq('id', motorista.id)

    if (error) {
      alert('Erro ao atualizar motorista')
    } else {
      fetchMotoristas()
    }
  }

  function getIniciais(nome) {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  function cancelarForm() {
    setForm({ nome: '', telefone: '', email: '' })
    setShowForm(false)
    setEditando(null)
  }

  return (
    <>
      <header className="header">
        <h1 className="page-title">Motoristas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Motorista
        </button>
      </header>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 480
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--verde-escuro)' }}>
              {editando ? 'Editar Motorista' : 'Novo Motorista'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Nome *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Telefone *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Email <span className="optional">(opcional)</span></label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={cancelarForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editando ? 'Salvar' : 'Criar Motorista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{motoristas.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Ativos</div>
          <div className="stat-value">{motoristas.filter(m => m.ativo).length}</div>
        </div>
        <div className="stat-card alert">
          <div className="stat-label">Inativos</div>
          <div className="stat-value">{motoristas.filter(m => !m.ativo).length}</div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : motoristas.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--cinza-texto)' }}>
            Nenhum motorista cadastrado
          </div>
        ) : (
          <table className="trips-table">
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {motoristas.map((motorista) => (
                <tr key={motorista.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="driver-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                        {getIniciais(motorista.nome)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{motorista.nome}</span>
                    </div>
                  </td>
                  <td>{motorista.telefone}</td>
                  <td>{motorista.email || '—'}</td>
                  <td>
                    <span className={`status-badge ${motorista.ativo ? 'status-concluida' : 'status-cancelada'}`}>
                      {motorista.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 16px' }}
                        onClick={() => handleEditar(motorista)}
                      >
                        Editar
                      </button>
                      <button 
                        className={`btn ${motorista.ativo ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '8px 16px' }}
                        onClick={() => handleToggleAtivo(motorista)}
                      >
                        {motorista.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export default Motoristas
