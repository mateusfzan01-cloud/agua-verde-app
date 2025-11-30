-- ================================================
-- MIGRACAO: Timestamps de Status e Sistema de Convites
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- 1. ADICIONAR COLUNAS DE TIMESTAMPS NA TABELA VIAGENS
-- ================================================

ALTER TABLE viagens
ADD COLUMN IF NOT EXISTS timestamp_iniciou_deslocamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timestamp_chegou_local TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timestamp_passageiro_embarcou TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timestamp_viagem_concluida TIMESTAMPTZ;

-- Comentarios nas colunas
COMMENT ON COLUMN viagens.timestamp_iniciou_deslocamento IS 'Horario em que o motorista iniciou o deslocamento';
COMMENT ON COLUMN viagens.timestamp_chegou_local IS 'Horario em que o motorista chegou no local de embarque';
COMMENT ON COLUMN viagens.timestamp_passageiro_embarcou IS 'Horario em que o passageiro embarcou';
COMMENT ON COLUMN viagens.timestamp_viagem_concluida IS 'Horario em que a viagem foi concluida';


-- 2. CRIAR TABELA DE CONVITES PARA MOTORISTAS
-- ================================================

CREATE TABLE IF NOT EXISTS motorista_convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID REFERENCES motoristas(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  aceito_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id)
);

-- Indices para melhor performance
CREATE INDEX IF NOT EXISTS idx_motorista_convites_token ON motorista_convites(token);
CREATE INDEX IF NOT EXISTS idx_motorista_convites_email ON motorista_convites(email);
CREATE INDEX IF NOT EXISTS idx_motorista_convites_status ON motorista_convites(status);

-- RLS (Row Level Security) para a tabela de convites
ALTER TABLE motorista_convites ENABLE ROW LEVEL SECURITY;

-- RLS para a tabela perfis
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Funcao auxiliar para verificar se usuario e admin (evita referencia circular em policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfis
    WHERE perfis.id = auth.uid()
    AND perfis.tipo IN ('admin', 'gerente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politica: Admins podem ver todos os convites
CREATE POLICY "Admins podem gerenciar convites" ON motorista_convites
  FOR ALL USING (is_admin());

-- Politica: Qualquer pessoa pode verificar um convite pelo token (para pagina de aceite)
CREATE POLICY "Publico pode verificar convite" ON motorista_convites
  FOR SELECT USING (true);


-- 3. FUNCAO PARA GERAR TOKEN UNICO
-- ================================================

CREATE OR REPLACE FUNCTION gerar_token_convite()
RETURNS VARCHAR(255) AS $$
DECLARE
  novo_token VARCHAR(255);
BEGIN
  -- Gera um token unico usando UUID + timestamp
  novo_token := encode(gen_random_bytes(32), 'hex');
  RETURN novo_token;
END;
$$ LANGUAGE plpgsql;


-- 4. TRIGGER PARA ENVIAR EMAIL DE OCORRENCIA (via webhook)
-- ================================================
-- Nota: Este trigger chama a Edge Function quando uma ocorrencia e criada

CREATE OR REPLACE FUNCTION notify_ocorrencia()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
BEGIN
  -- Apenas notifica se nao for alteracao de status automatica
  IF NEW.tipo != 'alteracao_status' THEN
    -- A URL da Edge Function deve ser configurada como secret
    edge_function_url := current_setting('app.settings.edge_function_url', true);

    IF edge_function_url IS NOT NULL AND edge_function_url != '' THEN
      PERFORM
        net.http_post(
          url := edge_function_url || '/enviar-email-ocorrencia',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'type', 'INSERT',
            'table', 'ocorrencias',
            'record', row_to_json(NEW)
          )
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger (se a extensao pg_net estiver habilitada)
-- DROP TRIGGER IF EXISTS on_ocorrencia_created ON ocorrencias;
-- CREATE TRIGGER on_ocorrencia_created
--   AFTER INSERT ON ocorrencias
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_ocorrencia();


-- 5. PERMISSOES
-- ================================================

-- Garantir que usuarios autenticados possam inserir ocorrencias
GRANT INSERT ON ocorrencias TO authenticated;
GRANT SELECT ON ocorrencias TO authenticated;

-- Garantir acesso a tabela de convites
GRANT ALL ON motorista_convites TO authenticated;
GRANT USAGE ON SEQUENCE motorista_convites_id_seq TO authenticated;


-- ================================================
-- FIM DA MIGRACAO
-- ================================================
