import { memo } from 'react'

const ViagemCard = memo(function ViagemCard({ viagem, formatarHora, getStatusLabel, getBotaoAcao, atualizarStatus, setModalOcorrencia, abrirModalConfirmacao, abrirModalNoShow, destaque }) {
  const botao = getBotaoAcao(viagem)
  const totalBagagens = (viagem.bagagens_grandes || 0) + (viagem.bagagens_pequenas || 0)

  // Verificar se deve mostrar telefone
  const mostrarTelefone = viagem.compartilhar_telefone === true

  return (
    <div style={{
      background: viagem.status === 'no_show' ? '#fff5f5' : 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: destaque ? '2px solid #27ae60' : viagem.status === 'no_show' ? '1px solid #ffcdd2' : 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '18px' }}>{formatarHora(viagem.data_hora)}</div>
          <div style={{
            display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
            background: viagem.status === 'concluida' ? '#d4edda' : viagem.status === 'no_show' ? '#ffebee' : '#fff3cd',
            color: viagem.status === 'concluida' ? '#155724' : viagem.status === 'no_show' ? '#c62828' : '#856404'
          }}>
            {getStatusLabel(viagem.status)}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#666' }}>
          <div>{viagem.quantidade_passageiros} passageiro{viagem.quantidade_passageiros > 1 ? 's' : ''}</div>
          <div>
            {totalBagagens > 0 ? (
              <span>{viagem.bagagens_grandes || 0}G + {viagem.bagagens_pequenas || 0}P</span>
            ) : (
              <span>Sem bagagens</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ color: '#27ae60', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.origem}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ color: '#e74c3c', marginRight: '8px', fontWeight: 'bold' }}>●</span>
          <span>{viagem.destino}</span>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        <strong>Passageiro:</strong> {viagem.passageiro_nome}
      </div>

      {viagem.voo_numero && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', padding: '8px', background: '#f8f9fa', borderRadius: '6px' }}>
          Voo: {viagem.voo_numero} {viagem.voo_companhia && `(${viagem.voo_companhia})`}
        </div>
      )}

      {viagem.observacoes && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', padding: '8px', background: '#fff8e6', borderRadius: '6px' }}>
          <strong>Obs:</strong> {viagem.observacoes}
        </div>
      )}

      {/* Valor do motorista */}
      {viagem.valor_motorista && (
        <div style={{
          fontSize: '14px',
          marginBottom: '12px',
          padding: '10px 12px',
          background: '#e8f5e9',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#2e7d32', fontWeight: 500 }}>Valor desta corrida:</span>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#27ae60' }}>
            R$ {viagem.valor_motorista.toFixed(2)}
          </span>
        </div>
      )}

      {/* No-Show info */}
      {viagem.status === 'no_show' && viagem.no_show_timestamp && (
        <div style={{
          fontSize: '12px',
          color: '#c62828',
          marginBottom: '12px',
          padding: '8px',
          background: '#ffebee',
          borderRadius: '6px'
        }}>
          <strong>No-show registrado:</strong> {new Date(viagem.no_show_timestamp).toLocaleString('pt-BR')}
          {viagem.no_show_endereco && <div style={{ marginTop: '4px' }}>Local: {viagem.no_show_endereco}</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {botao && (
          <button
            onClick={() => {
              if (botao.abreModal) {
                abrirModalConfirmacao(viagem)
              } else {
                atualizarStatus(viagem.id, botao.proximo)
              }
            }}
            style={{
              flex: 1, padding: '12px', background: botao.cor, color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', minWidth: '140px'
            }}
          >
            {botao.texto}
          </button>
        )}

        {/* Botões de telefone - só aparecem se compartilhar_telefone for true */}
        {mostrarTelefone && viagem.passageiro_telefone && (
          <>
            <a href={`tel:${viagem.passageiro_telefone}`} style={{
              padding: '10px 14px', background: '#f0f0f0', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: '#333' }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </a>
            <a href={`https://wa.me/55${viagem.passageiro_telefone.replace(/\D/g, '')}`} style={{
              padding: '10px 14px', background: '#25d366', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: 'white' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </>
        )}

        {/* Botão de ocorrência - sempre visível */}
        <button onClick={() => setModalOcorrencia(viagem.id)} style={{
          padding: '12px 16px', background: '#fee', color: '#c00', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
        }}>
          ⚠️
        </button>

        {/* Botão No-Show - aparece quando está aguardando passageiro */}
        {viagem.status === 'aguardando_passageiro' && (
          <button onClick={() => abrirModalNoShow(viagem)} style={{
            padding: '12px 16px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
          }}>
            No-Show
          </button>
        )}
      </div>
    </div>
  )
})

export default ViagemCard
