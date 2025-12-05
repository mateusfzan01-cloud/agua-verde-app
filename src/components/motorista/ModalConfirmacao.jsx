import { useState, memo } from 'react'
import { supabase } from '../../supabaseClient'

const ModalConfirmacao = memo(function ModalConfirmacao({ viagem, perfilNome, onClose, onSucesso }) {
  const [dadosConfirmacao, setDadosConfirmacao] = useState({
    passageiros: viagem.quantidade_passageiros || 1,
    bagagens_grandes: viagem.bagagens_grandes || 0,
    bagagens_pequenas: viagem.bagagens_pequenas || 0,
    horario_saida: '',
    horario_chegada: new Date().toTimeString().substring(0, 5)
  })

  async function confirmarEConcluir() {
    const agora = new Date()
    const dataBase = new Date(viagem.data_hora)

    let horarioSaida = null
    if (dadosConfirmacao.horario_saida) {
      const [h, m] = dadosConfirmacao.horario_saida.split(':')
      horarioSaida = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), parseInt(h), parseInt(m))
    }

    let horarioChegada = null
    if (dadosConfirmacao.horario_chegada) {
      const [h, m] = dadosConfirmacao.horario_chegada.split(':')
      horarioChegada = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), parseInt(h), parseInt(m))
    }

    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'concluida',
        dados_confirmados: true,
        passageiros_confirmados: parseInt(dadosConfirmacao.passageiros),
        bagagens_grandes_confirmadas: parseInt(dadosConfirmacao.bagagens_grandes),
        bagagens_pequenas_confirmadas: parseInt(dadosConfirmacao.bagagens_pequenas),
        horario_saida_real: horarioSaida?.toISOString() || null,
        horario_chegada_real: horarioChegada?.toISOString() || null,
        timestamp_viagem_concluida: agora.toISOString()
      })
      .eq('id', viagem.id)

    if (!error) {
      await supabase.from('ocorrencias').insert([{
        viagem_id: viagem.id,
        tipo: 'alteracao_status',
        descricao: `Viagem concluída. Passageiros: ${dadosConfirmacao.passageiros}, Bagagens: ${dadosConfirmacao.bagagens_grandes}G + ${dadosConfirmacao.bagagens_pequenas}P`,
        registrado_por: perfilNome
      }])
      onClose()
      if (onSucesso) onSucesso()
    } else {
      alert('Erro ao concluir viagem')
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 1000
    }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Confirmar dados da viagem</h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666' }}>
          Verifique e ajuste os dados se necessário
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Passageiros
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={dadosConfirmacao.passageiros}
              onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, passageiros: e.target.value })}
              min="1"
              style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
            />
            <button
              onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, passageiros: viagem.quantidade_passageiros })}
              style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              Original: {viagem.quantidade_passageiros}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Bagagens grandes (23kg)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={dadosConfirmacao.bagagens_grandes}
              onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_grandes: e.target.value })}
              min="0"
              style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
            />
            <button
              onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_grandes: viagem.bagagens_grandes || 0 })}
              style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              Original: {viagem.bagagens_grandes || 0}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Bagagens pequenas (10kg)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={dadosConfirmacao.bagagens_pequenas}
              onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_pequenas: e.target.value })}
              min="0"
              style={{ flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
            />
            <button
              onClick={() => setDadosConfirmacao({ ...dadosConfirmacao, bagagens_pequenas: viagem.bagagens_pequenas || 0 })}
              style={{ padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              Original: {viagem.bagagens_pequenas || 0}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Horário de saída (opcional)
          </label>
          <input
            type="time"
            value={dadosConfirmacao.horario_saida}
            onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, horario_saida: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
            Horário de chegada
          </label>
          <input
            type="time"
            value={dadosConfirmacao.horario_chegada}
            onChange={(e) => setDadosConfirmacao({ ...dadosConfirmacao, horario_chegada: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '14px', background: '#f0f0f0', border: 'none',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px'
          }}>
            Cancelar
          </button>
          <button onClick={confirmarEConcluir} style={{
            flex: 1, padding: '14px', background: '#27ae60', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px'
          }}>
            Confirmar e Concluir
          </button>
        </div>
      </div>
    </div>
  )
})

export default ModalConfirmacao
