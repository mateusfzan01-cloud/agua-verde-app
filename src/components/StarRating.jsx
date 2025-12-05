import { useState } from 'react'

/**
 * Componente reutilizável de estrelas de avaliação
 *
 * Props:
 * - rating: número (0-5)
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - showValue: boolean - mostrar valor numérico ao lado
 * - interactive: boolean - permite clicar para mudar nota
 * - onChange: (nota) => void - callback quando muda nota
 * - count: número - quantidade de avaliações (opcional)
 */
function StarRating({
  rating = 0,
  size = 'md',
  showValue = false,
  interactive = false,
  onChange,
  count = null
}) {
  const [hoverRating, setHoverRating] = useState(0)

  // Tamanhos das estrelas
  const sizes = {
    sm: { star: 16, gap: 2, fontSize: 12 },
    md: { star: 24, gap: 4, fontSize: 14 },
    lg: { star: 44, gap: 6, fontSize: 18 }
  }

  const { star: starSize, gap, fontSize } = sizes[size] || sizes.md

  // Cores
  const colors = {
    filled: '#f1c40f',    // Amarelo
    empty: '#ddd',        // Cinza claro
    hover: '#f39c12'      // Amarelo mais escuro no hover
  }

  function handleClick(nota) {
    if (interactive && onChange) {
      onChange(nota)
    }
  }

  function handleMouseEnter(nota) {
    if (interactive) {
      setHoverRating(nota)
    }
  }

  function handleMouseLeave() {
    if (interactive) {
      setHoverRating(0)
    }
  }

  // Determinar qual rating mostrar (hover ou atual)
  const displayRating = hoverRating || rating

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: gap * 2
    }}>
      <div style={{
        display: 'flex',
        gap: gap,
        cursor: interactive ? 'pointer' : 'default'
      }}>
        {[1, 2, 3, 4, 5].map((nota) => {
          const isFilled = nota <= displayRating
          const isHovering = interactive && hoverRating >= nota

          return (
            <svg
              key={nota}
              viewBox="0 0 24 24"
              width={starSize}
              height={starSize}
              onClick={() => handleClick(nota)}
              onMouseEnter={() => handleMouseEnter(nota)}
              onMouseLeave={handleMouseLeave}
              style={{
                fill: isFilled ? (isHovering ? colors.hover : colors.filled) : colors.empty,
                transition: 'fill 0.15s ease, transform 0.15s ease',
                transform: isHovering ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )
        })}
      </div>

      {showValue && rating > 0 && (
        <span style={{
          fontSize,
          fontWeight: 600,
          color: '#2c3e50'
        }}>
          {rating.toFixed(1)}
        </span>
      )}

      {count !== null && (
        <span style={{
          fontSize: fontSize - 2,
          color: '#7f8c8d'
        }}>
          ({count} {count === 1 ? 'avaliacao' : 'avaliacoes'})
        </span>
      )}
    </div>
  )
}

export default StarRating
