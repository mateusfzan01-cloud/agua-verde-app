import { useState } from 'react'
import StarRating from './StarRating'
import { supabase } from '../supabaseClient'

/**
 * Componente de avaliação de viagem
 * Permite que o passageiro avalie o motorista após a viagem
 *
 * Props:
 * - viagemId: ID da viagem
 * - motoristaId: ID do motorista
 * - motoristaNome: Nome do motorista (para exibição)
 * - onAvaliacaoEnviada: callback após enviar avaliação
 */
function AvaliacaoViagem({ viagemId, motoristaId, motoristaNome, onAvaliacaoEnviada }) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState(null)

  async function enviarAvaliacao() {
    if (nota === 0) {
      setErro('Por favor, selecione uma nota')
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      const { error } = await supabase
        .from('viagens')
        .update({
          avaliacao_nota: nota,
          avaliacao_comentario: comentario.trim() || null,
          avaliacao_data: new Date().toISOString()
        })
        .eq('id', viagemId)

      if (error) throw error

      setEnviado(true)
      if (onAvaliacaoEnviada) {
        onAvaliacaoEnviada({ nota, comentario })
      }
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err)
      setErro('Erro ao enviar avaliação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Tela de agradecimento após enviar
  if (enviado) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        borderRadius: 16,
        padding: 32,
        textAlign: 'center',
        maxWidth: 400,
        margin: '0 auto'
      }}>
        <div style={{
          width: 80,
          height: 80,
          background: '#4caf50',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>

        <h2 style={{
          fontSize: 24,
          color: '#2e7d32',
          marginBottom: 12,
          fontWeight: 600
        }}>
          Obrigado!
        </h2>

        <p style={{
          fontSize: 16,
          color: '#558b2f',
          marginBottom: 16,
          lineHeight: 1.5
        }}>
          Sua avaliacao foi enviada com sucesso.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 8
        }}>
          <StarRating rating={nota} size="md" />
        </div>

        <p style={{
          fontSize: 14,
          color: '#689f38'
        }}>
          Voce avaliou {motoristaNome} com {nota} {nota === 1 ? 'estrela' : 'estrelas'}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      maxWidth: 400,
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{
        fontSize: 20,
        fontWeight: 600,
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center'
      }}>
        Como foi sua viagem?
      </h3>

      <p style={{
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 24,
        textAlign: 'center'
      }}>
        Avalie o motorista <strong style={{ color: '#2c3e50' }}>{motoristaNome}</strong>
      </p>

      {/* Estrelas de avaliação */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 24
      }}>
        <StarRating
          rating={nota}
          size="lg"
          interactive
          onChange={setNota}
        />
      </div>

      {/* Texto descritivo da nota */}
      {nota > 0 && (
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          color: nota >= 4 ? '#27ae60' : nota >= 3 ? '#f39c12' : '#e74c3c',
          marginBottom: 20,
          fontWeight: 500
        }}>
          {nota === 5 && 'Excelente!'}
          {nota === 4 && 'Muito bom!'}
          {nota === 3 && 'Bom'}
          {nota === 2 && 'Regular'}
          {nota === 1 && 'Ruim'}
        </p>
      )}

      {/* Campo de comentário */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 14,
          color: '#7f8c8d',
          marginBottom: 8
        }}>
          Deixe um comentario (opcional)
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiencia..."
          maxLength={500}
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />
        <div style={{
          textAlign: 'right',
          fontSize: 12,
          color: '#bdc3c7',
          marginTop: 4
        }}>
          {comentario.length}/500
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
          textAlign: 'center'
        }}>
          {erro}
        </div>
      )}

      {/* Botão de enviar */}
      <button
        onClick={enviarAvaliacao}
        disabled={enviando || nota === 0}
        style={{
          width: '100%',
          padding: 16,
          background: nota === 0 ? '#bdc3c7' : enviando ? '#95a5a6' : '#3498db',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: nota === 0 || enviando ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.2s ease'
        }}
      >
        {enviando ? (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                animation: 'spin 1s linear infinite'
              }}
            >
              <circle cx="12" cy="12" r="10" opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
            Enviando...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            Enviar avaliacao
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default AvaliacaoViagem
