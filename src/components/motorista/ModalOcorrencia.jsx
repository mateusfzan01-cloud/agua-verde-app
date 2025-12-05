import { useState, memo } from 'react'
import { supabase } from '../../supabaseClient'

const ModalOcorrencia = memo(function ModalOcorrencia({ viagemId, perfilNome, onClose, onSucesso }) {
  const [tipoOcorrencia, setTipoOcorrencia] = useState('outro')
  const [textoOcorrencia, setTextoOcorrencia] = useState('')

  async function registrarOcorrencia() {
    if (!textoOcorrencia.trim()) return

    const { error } = await supabase
      .from('ocorrencias')
      .insert({
        viagem_id: viagemId,
        descricao: textoOcorrencia,
        tipo: tipoOcorrencia,
        registrado_por: perfilNome
      })

    if (!error) {
      onClose()
      alert('Ocorrencia registrada!')
      if (onSucesso) onSucesso()
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 1000
    }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
        <h3 style={{ margin: '0 0 16px' }}>Registrar Ocorrencia</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Tipo
          </label>
          <select
            value={tipoOcorrencia}
            onChange={(e) => setTipoOcorrencia(e.target.value)}
            style={{
              width: '100%', padding: '12px', border: '2px solid #e0e0e0',
              borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box',
              background: 'white'
            }}
          >
            <option value="atraso_voo">Atraso de voo</option>
            <option value="atraso_motorista">Atraso do motorista</option>
            <option value="atraso_passageiro">Atraso do passageiro</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Descricao
          </label>
          <textarea
            value={textoOcorrencia}
            onChange={(e) => setTextoOcorrencia(e.target.value)}
            placeholder="Descreva a ocorrencia..."
            style={{
              width: '100%', minHeight: '120px', padding: '12px', border: '2px solid #e0e0e0',
              borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', background: '#f0f0f0', border: 'none',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 500
          }}>
            Cancelar
          </button>
          <button onClick={registrarOcorrencia} style={{
            flex: 1, padding: '12px', background: '#e74c3c', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
          }}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
})

export default ModalOcorrencia
