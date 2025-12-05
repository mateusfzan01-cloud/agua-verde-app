import { memo } from 'react'

const CalendarioMensal = memo(function CalendarioMensal({ dataAtual, navegarMes, formatarMes, contarViagensDia, selecionarDia, carregando }) {
  const ano = dataAtual.getFullYear()
  const mes = dataAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const hoje = new Date()

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  const dias = []
  for (let i = 0; i < primeiroDia; i++) {
    dias.push(null)
  }
  for (let i = 1; i <= diasNoMes; i++) {
    dias.push(i)
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => navegarMes(-1)} style={{
            background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
          }}>{'<'}</button>
          <div style={{ fontWeight: 600, fontSize: '18px', textTransform: 'capitalize' }}>{formatarMes(dataAtual)}</div>
          <button onClick={() => navegarMes(1)} style={{
            background: '#f0f0f0', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px'
          }}>{'>'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {diasSemana.map(dia => (
            <div key={dia} style={{ textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 600, padding: '8px 0' }}>
              {dia}
            </div>
          ))}
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {dias.map((dia, index) => {
              if (!dia) {
                return <div key={index} />
              }

              const qtdViagens = contarViagensDia(dia)
              const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano

              return (
                <button
                  key={index}
                  onClick={() => selecionarDia(dia)}
                  style={{
                    aspectRatio: '1',
                    border: ehHoje ? '2px solid #27ae60' : 'none',
                    borderRadius: '8px',
                    background: qtdViagens > 0 ? '#e8f5e9' : '#f8f8f8',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: ehHoje ? 700 : 400, color: ehHoje ? '#27ae60' : '#333' }}>
                    {dia}
                  </span>
                  {qtdViagens > 0 && (
                    <span style={{
                      fontSize: '10px',
                      background: '#27ae60',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontWeight: 600
                    }}>
                      {qtdViagens}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '12px', color: '#666' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#e8f5e9', borderRadius: '4px' }} />
          <span>Com viagens</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', border: '2px solid #27ae60', borderRadius: '4px' }} />
          <span>Hoje</span>
        </div>
      </div>
    </div>
  )
})

export default CalendarioMensal
