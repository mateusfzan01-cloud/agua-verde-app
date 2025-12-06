import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@aguaverdeturismo.com.br'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OcorrenciaPayload {
  type: 'INSERT'
  table: 'ocorrencias'
  record: {
    id: number
    viagem_id: number
    tipo: string
    descricao: string
    registrado_por: string
    criado_em: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: OcorrenciaPayload = await req.json()
    const { record } = payload

    // Ignorar alteracoes de status automaticas - so notificar ocorrencias manuais
    if (record.tipo === 'alteracao_status') {
      return new Response(JSON.stringify({ message: 'Alteracao de status ignorada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Buscar dados da viagem
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: viagem, error: viagemError } = await supabase
      .from('viagens')
      .select('*, motoristas(nome, telefone)')
      .eq('id', record.viagem_id)
      .single()

    if (viagemError || !viagem) {
      console.error('Erro ao buscar viagem:', viagemError)
      return new Response(JSON.stringify({ error: 'Viagem nao encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Formatar data da viagem
    const dataViagem = new Date(viagem.data_hora)
    const dataFormatada = dataViagem.toLocaleDateString('pt-BR')
    const horaFormatada = dataViagem.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // Mapear tipos de ocorrencia
    const tiposOcorrencia: Record<string, string> = {
      'atraso_voo': 'Atraso de Voo',
      'atraso_motorista': 'Atraso do Motorista',
      'atraso_passageiro': 'Atraso do Passageiro',
      'cancelamento': 'Cancelamento',
      'no_show': 'No-Show',
      'outro': 'Outro'
    }

    const tipoFormatado = tiposOcorrencia[record.tipo] || record.tipo

    // Enviar email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Agua Verde Turismo <noreply@aguaverde.tur.br>',
        to: [ADMIN_EMAIL],
        subject: `[OCORRENCIA] ${tipoFormatado} - Viagem #${viagem.id}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .alert { background: #fee; border-left: 4px solid #c00; padding: 15px; margin-bottom: 20px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .info-item { padding: 10px; background: white; border-radius: 4px; }
              .label { font-size: 12px; color: #666; text-transform: uppercase; }
              .value { font-size: 14px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Agua Verde Turismo</h1>
                <p style="margin: 5px 0 0;">Nova Ocorrencia Registrada</p>
              </div>
              <div class="content">
                <div class="alert">
                  <strong>Tipo:</strong> ${tipoFormatado}<br>
                  <strong>Registrado por:</strong> ${record.registrado_por || 'Sistema'}<br>
                  <strong>Data/Hora:</strong> ${new Date(record.criado_em).toLocaleString('pt-BR')}
                </div>

                <h3 style="margin-bottom: 10px;">Descricao da Ocorrencia</h3>
                <p style="background: white; padding: 15px; border-radius: 4px;">${record.descricao}</p>

                <h3 style="margin-bottom: 10px;">Dados da Viagem #${viagem.id}</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="label">Passageiro</div>
                    <div class="value">${viagem.passageiro_nome}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Telefone</div>
                    <div class="value">${viagem.passageiro_telefone}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Data</div>
                    <div class="value">${dataFormatada}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Horario</div>
                    <div class="value">${horaFormatada}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Origem</div>
                    <div class="value">${viagem.origem}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Destino</div>
                    <div class="value">${viagem.destino}</div>
                  </div>
                  ${viagem.motoristas ? `
                  <div class="info-item">
                    <div class="label">Motorista</div>
                    <div class="value">${viagem.motoristas.nome}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Tel. Motorista</div>
                    <div class="value">${viagem.motoristas.telefone}</div>
                  </div>
                  ` : ''}
                </div>

                <div class="footer">
                  <p>Este email foi enviado automaticamente pelo sistema Agua Verde Turismo.</p>
                  <p><a href="https://app.aguaverde.tur.br/viagens/${viagem.id}">Ver detalhes da viagem</a></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Erro ao enviar email:', errorText)
      return new Response(JSON.stringify({ error: 'Erro ao enviar email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const result = await emailResponse.json()
    console.log('Email enviado com sucesso:', result)

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
