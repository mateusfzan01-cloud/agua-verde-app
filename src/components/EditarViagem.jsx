import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function EditarViagem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [motoristas, setMotoristas] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState({
    passageiro_nome: '',
    passageiro_telefone: '',
    passageiro_email: '',
    quantidade_passageiros: 1,
    bagagens_grandes: 0,
    bagagens_pequenas: 0,
    compartilhar_telefone: false,
    origem: '',
    destino: '',
    data: '',
    hora: '',
    voo_numero: '',
    voo_companhia: '',
    motorista_id: '',
    valor: '',
    observacoes: '',
    status: ''
  })

  useEffect(() => {
    fetchViagem()
    fetchMotoristas()
  }, [id])

  async function fetchViagem() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      alert('Erro ao carregar viagem')
      navigate(-1)
      return
    }

    const dataHora = new Date(data.data_hora)
    // Formatar para horário local do Brasil
    const dataStr = dataHora.toLocaleDateString('en-CA') // formato YYYY-MM-DD
    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })

    setForm({
      passageiro_nome: data.passageiro_nome || '',
      passageiro_telefone: data.passageiro_telefone || '',
      passageiro_email: data.passageiro_email || '',
      quantidade_passageiros: data.quantidade_passageiros || 1,
      bagagens_grandes: data.bagagens_grandes || 0,
      bagagens_pequenas: data.bagagens_pequenas || 0,
      compartilhar_telefone: data.compartilhar_telefone || false,
      origem: data.origem || '',
      destino: data.destino || '',
      data: dataStr,
      hora: horaStr,
      voo_numero: data.voo_numero || '',
      voo_companhia: data.voo_companhia || '',
      motorista_id: data.motorista_id || '',
      valor: data.valor || '',
      observacoes: data.observacoes || '',
      status: data.status || ''
    })
    setCarregando(false)
  }

  async function fetchMotoristas() {
    const { data } = await supabase
      .from('motoristas')
      .select('*')
      .eq('ativo', true)
    setMotoristas(data || [])
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)

    // Adiciona timezone de Brasília (-03:00) para salvar corretamente
    const data_hora = `${form.data}T${form.hora}:00-03:00`

    const dados = {
      passageiro_nome: form.passageiro_nome,
      passageiro_telefone: form.passageiro_telefone,
      passageiro_email: form.passageiro_email || null,
      quantidade_passageiros: parseInt(form.quantidade_passageiros) || 1,
      bagagens_grandes: parseInt(form.bagagens_grandes) || 0,
      bagagens_pequenas: parseInt(form.bagagens_pequenas) || 0,
      compartilhar_telefone: form.compartilhar_telefone,
      origem: form.origem,
      destino: form.destino,
      data_hora: data_hora,
      voo_numero: form.voo_numero || null,
      voo_companhia: form.voo_companhia || null,
      motorista_id: form.motorista_id || null,
      valor: form.valor ? parseFloat(form.valor) : null,
      observacoes: form.observacoes || null
    }

    // Atualiza status se vinculou motorista
    if (form.motorista_id && form.status === 'pendente') {
      dados.status = 'vinculada'
    }

    const { error } = await supabase
      .from('viagens')
      .update(dados)
      .eq('id', id)

    if (error) {
      console.error('Erro ao atualizar viagem:', error)
      alert('Erro ao atualizar viagem: ' + error.message)
    } else {
      // Registra ocorrencia de edicao
      await supabase.from('ocorrencias').insert([{
        viagem_id: parseInt(id),
        tipo: 'alteracao_status',
        descricao: 'Viagem editada'
      }])
      navigate(`/viagens/${id}`)
    }

    setSalvando(false)
  }

  const totalBagagens = (parseInt(form.bagagens_grandes) || 0) + (parseInt(form.bagagens_pequenas) || 0)

  if (carregando) {
    return <div className="loading">Carregando...</div>
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
          <h1 className="page-title">Editar Viagem #{id}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          {/* Passageiro */}
          <div className="form-section">
            <h2 className="section-title">Dados do Passageiro</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome do passageiro *</label>
                <input
                  type="text"
                  name="passageiro_nome"
                  className="form-input"
                  placeholder="Ex: Maria Silva"
                  value={form.passageiro_nome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  type="tel"
                  name="passageiro_telefone"
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={form.passageiro_telefone}
                  onChange={handleChange}
                  required
                />
                {/* Checkbox compartilhar telefone */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  marginTop: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--cinza-texto)'
                }}>
                  <input
                    type="checkbox"
                    name="compartilhar_telefone"
                    checked={form.compartilhar_telefone}
                    onChange={handleChange}
                    style={{ 
                      width: 18, 
                      height: 18, 
                      accentColor: 'var(--verde-claro)',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Compartilhar telefone com o motorista</span>
                </label>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantidade de passageiros</label>
                <input
                  type="number"
                  name="quantidade_passageiros"
                  className="form-input"
                  placeholder="1"
                  min="1"
                  value={form.quantidade_passageiros}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="optional">(opcional)</span></label>
                <input
                  type="email"
                  name="passageiro_email"
                  className="form-input"
                  placeholder="email@exemplo.com"
                  value={form.passageiro_email}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Bagagens */}
          <div className="form-section">
            <h2 className="section-title">Bagagens</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bagagens grandes (23kg)</label>
                <input
                  type="number"
                  name="bagagens_grandes"
                  className="form-input"
                  placeholder="0"
                  min="0"
                  value={form.bagagens_grandes}
                  onChange={handleChange}
                />
                <p className="form-hint">Malas de porão, malas grandes</p>
              </div>
              <div className="form-group">
                <label className="form-label">Bagagens pequenas (10kg)</label>
                <input
                  type="number"
                  name="bagagens_pequenas"
                  className="form-input"
                  placeholder="0"
                  min="0"
                  value={form.bagagens_pequenas}
                  onChange={handleChange}
                />
                <p className="form-hint">Mochilas, malas de mão</p>
              </div>
            </div>
            {totalBagagens > 0 && (
              <div style={{
                padding: 12,
                background: 'var(--cinza-claro)',
                borderRadius: 8,
                fontSize: 14,
                color: 'var(--verde-escuro)',
                fontWeight: 500
              }}>
                Total: {totalBagagens} {totalBagagens === 1 ? 'volume' : 'volumes'}
              </div>
            )}
          </div>

          {/* Trajeto */}
          <div className="form-section">
            <h2 className="section-title">Trajeto</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Origem *</label>
                <input
                  type="text"
                  name="origem"
                  className="form-input"
                  placeholder="Ex: Aeroporto Recife"
                  value={form.origem}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Destino *</label>
                <input
                  type="text"
                  name="destino"
                  className="form-input"
                  placeholder="Ex: Porto de Galinhas"
                  value={form.destino}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  name="data"
                  className="form-input"
                  value={form.data}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Horario previsto *</label>
                <input
                  type="time"
                  name="hora"
                  className="form-input"
                  value={form.hora}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Voo */}
          <div className="form-section">
            <h2 className="section-title">Informacoes do Voo <span className="optional" style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Numero do voo</label>
                <input
                  type="text"
                  name="voo_numero"
                  className="form-input"
                  placeholder="Ex: LA3421"
                  value={form.voo_numero}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Companhia aerea</label>
                <select
                  name="voo_companhia"
                  className="form-select"
                  value={form.voo_companhia}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  <option value="LATAM">LATAM</option>
                  <option value="GOL">GOL</option>
                  <option value="Azul">Azul</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>
            </div>
          </div>

          {/* Atribuicao */}
          <div className="form-section">
            <h2 className="section-title">Atribuicao</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Motorista <span className="optional">(opcional)</span></label>
                <select
                  name="motorista_id"
                  className="form-select"
                  value={form.motorista_id}
                  onChange={handleChange}
                >
                  <option value="">Selecionar depois...</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor <span className="optional">(opcional)</span></label>
                <input
                  type="number"
                  name="valor"
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Observacoes */}
          <div className="form-section">
            <h2 className="section-title">Observacoes</h2>
            <div className="form-row single">
              <div className="form-group">
                <label className="form-label">Observacoes <span className="optional">(opcional)</span></label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  placeholder="Informacoes adicionais sobre a viagem..."
                  value={form.observacoes}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {salvando ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

export default EditarViagem
