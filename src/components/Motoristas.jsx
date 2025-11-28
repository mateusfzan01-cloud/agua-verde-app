import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Motoristas() {
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
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

  function handleChange(e) {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  function abrirModal(motorista = null) {
    if (motorista) {
      setEditando(motorista.id)
      setForm({
        nome: motorista.nome || '',
        telefone: motorista.telefone || '',
        email: motorista.email || '',
        marca_modelo: motorista.marca_modelo || '',
        cor: motorista.cor || '',
        placa: motorista.placa || ''
      })
    } else {
      setEditando(null)
      setForm({
        nome: '',
        telefone: '',
        email: '',
        marca_modelo: '',
        cor: '',
        placa: ''
      })
    }
    setShowModal(true)
  }

  async function salvarMotorista(e) {
    e.preventDefault()

    const dados = {
      nome: form.nome,
      telefone: form.telefone,
      email: form.email || null,
      marca_modelo: form.marca_modelo || null,
      cor: form.cor || null,
      placa: form.placa ? form.placa.toUpperCase() : null
    }

    if (editando) {
      const { error } = await supabase
        .from('motoristas')
        .update(dados)
        .eq('id', editando)

      if (error) {
        alert('Erro ao atualizar motorista')
        return
      }
    } else {
      const { error } = await supabase
        .from('motoristas')
        .insert([{ ...dados, ativo: true }])

      if (error) {
        alert('Erro ao criar motorista')
        return
      }
    }

    setShowModal(false)
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
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="page-title">Motoristas</h1>
          <span className="page-subtitle">{motoristas.length} cadastrados</span>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Motorista
        </button>
      </header>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="motoristas-grid">
          {motoristas.map(motorista => (
            <div key={motorista.id} className={`motorista-card ${!motorista.ativo ? 'inativo' : ''}`}>
              <div className="motorista-header">
                <div className="driver-avatar">{getIniciais(motorista.nome)}</div>
                <div className="motorista-info">
                  <h3>{motorista.nome}</h3>
                  <span className={`status-badge ${motorista.ativo ? 'status-ativo' : 'status-inativo'}`}>
                    {motorista.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              
              <div className="motorista-details">
                <div className="detail-item">
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>{motorista.telefone}</span>
                </div>
                {motorista.email && (
                  <div className="detail-item">
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{motorista.email}</span>
                  </div>
                )}
                {motorista.marca_modelo && (
                  <div className="detail-item">
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                    <span>{motorista.marca_modelo} {motorista.cor && `- ${motorista.cor}`}</span>
                  </div>
                )}
                {motorista.placa && (
                  <div className="detail-item">
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                      <rect x="3" y="6" width="18" height="12" rx="2"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>{motorista.placa}</span>
                  </div>
                )}
              </div>

              <div className="motorista-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => abrirModal(motorista)}>
                  Editar
                </button>
                <button 
                  className={`btn btn-sm ${motorista.ativo ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleAtivo(motorista)}
                >
                  {motorista.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Motorista' : 'Novo Motorista'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={salvarMotorista}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    name="nome"
                    className="form-input"
                    value={form.nome}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={form.telefone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Marca/Modelo do Veiculo</label>
                  <input
                    type="text"
                    name="marca_modelo"
                    className="form-input"
                    placeholder="Ex: Fiat Toro"
                    value={form.marca_modelo}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cor</label>
                    <input
                      type="text"
                      name="cor"
                      className="form-input"
                      placeholder="Ex: Preta"
                      value={form.cor}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placa</label>
                    <input
                      type="text"
                      name="placa"
                      className="form-input"
                      placeholder="Ex: ABC1D23"
                      value={form.placa}
                      onChange={handleChange}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editando ? 'Salvar' : 'Criar'}
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