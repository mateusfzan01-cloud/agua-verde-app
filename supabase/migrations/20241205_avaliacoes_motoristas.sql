-- ============================================
-- Sistema de Avaliação de Motoristas
-- ============================================

-- 1. Adicionar campos de avaliação na tabela viagens
ALTER TABLE viagens
ADD COLUMN IF NOT EXISTS avaliacao_nota INTEGER CHECK (avaliacao_nota >= 1 AND avaliacao_nota <= 5),
ADD COLUMN IF NOT EXISTS avaliacao_comentario TEXT,
ADD COLUMN IF NOT EXISTS avaliacao_data TIMESTAMPTZ;

-- 2. Criar índice para consultas por motorista
CREATE INDEX IF NOT EXISTS idx_viagens_motorista_avaliacao
ON viagens(motorista_id, avaliacao_nota)
WHERE avaliacao_nota IS NOT NULL AND deleted_at IS NULL;

-- 3. Criar índice para consultas de avaliações recentes
CREATE INDEX IF NOT EXISTS idx_viagens_avaliacao_data
ON viagens(avaliacao_data DESC)
WHERE avaliacao_nota IS NOT NULL AND deleted_at IS NULL;

-- 4. Função para obter estatísticas de avaliação de um motorista
CREATE OR REPLACE FUNCTION get_motorista_avaliacao(p_motorista_id UUID)
RETURNS TABLE (
  media_nota NUMERIC(3,2),
  total_avaliacoes BIGINT,
  distribuicao JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(v.avaliacao_nota)::NUMERIC, 2) as media_nota,
    COUNT(v.avaliacao_nota) as total_avaliacoes,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE v.avaliacao_nota = 5),
      '4', COUNT(*) FILTER (WHERE v.avaliacao_nota = 4),
      '3', COUNT(*) FILTER (WHERE v.avaliacao_nota = 3),
      '2', COUNT(*) FILTER (WHERE v.avaliacao_nota = 2),
      '1', COUNT(*) FILTER (WHERE v.avaliacao_nota = 1)
    ) as distribuicao
  FROM viagens v
  WHERE v.motorista_id = p_motorista_id
    AND v.avaliacao_nota IS NOT NULL
    AND v.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Função trigger para criar alerta em avaliação baixa
CREATE OR REPLACE FUNCTION criar_alerta_avaliacao_baixa()
RETURNS TRIGGER AS $$
DECLARE
  v_motorista_nome TEXT;
BEGIN
  -- Só processa se a nota foi inserida/atualizada e é <= 2
  IF NEW.avaliacao_nota IS NOT NULL AND NEW.avaliacao_nota <= 2 THEN
    -- Buscar nome do motorista
    SELECT nome INTO v_motorista_nome
    FROM motoristas
    WHERE id = NEW.motorista_id;

    -- Criar alerta
    INSERT INTO alertas (tipo, mensagem, viagem_id, lido, criado_em)
    VALUES (
      'avaliacao_baixa',
      'Avaliacao baixa (' || NEW.avaliacao_nota || ' estrelas) na viagem #' || NEW.id || ' - Motorista: ' || COALESCE(v_motorista_nome, 'Desconhecido'),
      NEW.id,
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para avaliação baixa
DROP TRIGGER IF EXISTS trigger_avaliacao_baixa ON viagens;
CREATE TRIGGER trigger_avaliacao_baixa
AFTER INSERT OR UPDATE OF avaliacao_nota ON viagens
FOR EACH ROW
EXECUTE FUNCTION criar_alerta_avaliacao_baixa();

-- 7. Função agregada para relatório geral de avaliações
CREATE OR REPLACE FUNCTION get_relatorio_avaliacoes(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_motorista_id UUID DEFAULT NULL
)
RETURNS TABLE (
  media_geral NUMERIC(3,2),
  total_avaliacoes BIGINT,
  total_viagens_concluidas BIGINT,
  taxa_avaliacao NUMERIC(5,2),
  distribuicao_geral JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(v.avaliacao_nota)::NUMERIC, 2) as media_geral,
    COUNT(v.avaliacao_nota) as total_avaliacoes,
    COUNT(*) FILTER (WHERE v.status = 'concluida') as total_viagens_concluidas,
    CASE
      WHEN COUNT(*) FILTER (WHERE v.status = 'concluida') > 0
      THEN ROUND((COUNT(v.avaliacao_nota)::NUMERIC / COUNT(*) FILTER (WHERE v.status = 'concluida') * 100), 2)
      ELSE 0
    END as taxa_avaliacao,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE v.avaliacao_nota = 5),
      '4', COUNT(*) FILTER (WHERE v.avaliacao_nota = 4),
      '3', COUNT(*) FILTER (WHERE v.avaliacao_nota = 3),
      '2', COUNT(*) FILTER (WHERE v.avaliacao_nota = 2),
      '1', COUNT(*) FILTER (WHERE v.avaliacao_nota = 1)
    ) as distribuicao_geral
  FROM viagens v
  WHERE v.deleted_at IS NULL
    AND v.status = 'concluida'
    AND (p_data_inicio IS NULL OR v.data_hora::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR v.data_hora::DATE <= p_data_fim)
    AND (p_motorista_id IS NULL OR v.motorista_id = p_motorista_id);
END;
$$ LANGUAGE plpgsql;
