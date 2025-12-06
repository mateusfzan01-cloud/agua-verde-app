-- Migration: Sistema de Rastreamento de Localizacao
-- Data: 2024-12-06
-- Descricao: Adiciona suporte a captura de localizacao de motoristas

-- =====================================================
-- ETAPA 1: Adicionar colunas de localizacao na tabela viagens
-- =====================================================

-- Localizacao no INICIO da viagem
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_inicio_lat DECIMAL(10, 7);
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_inicio_lng DECIMAL(10, 7);
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_inicio_endereco TEXT;
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_inicio_timestamp TIMESTAMPTZ;

-- Localizacao no FIM da viagem
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_fim_lat DECIMAL(10, 7);
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_fim_lng DECIMAL(10, 7);
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_fim_endereco TEXT;
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS local_fim_timestamp TIMESTAMPTZ;

-- =====================================================
-- ETAPA 2: Criar tabela de historico de localizacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia ao motorista
  motorista_id UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,

  -- Referencia opcional a viagem (quando em viagem) - INTEGER para compatibilidade
  viagem_id INTEGER REFERENCES viagens(id) ON DELETE SET NULL,

  -- Coordenadas
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,

  -- Endereco reverso (geocoding)
  endereco TEXT,

  -- Precisao do GPS em metros
  accuracy DECIMAL(6, 2),

  -- Velocidade em m/s (se disponivel)
  speed DECIMAL(5, 2),

  -- Direcao em graus (0-360)
  heading DECIMAL(5, 2),

  -- Timestamp da captura
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata adicional (device info, etc)
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- ETAPA 3: Criar indices para performance
-- =====================================================

-- Indice para buscar localizacoes por motorista
CREATE INDEX IF NOT EXISTS idx_driver_locations_motorista
  ON driver_locations(motorista_id, captured_at DESC);

-- Indice para buscar localizacoes por viagem
CREATE INDEX IF NOT EXISTS idx_driver_locations_viagem
  ON driver_locations(viagem_id, captured_at DESC);

-- Indice para buscar localizacoes por timestamp
CREATE INDEX IF NOT EXISTS idx_driver_locations_captured
  ON driver_locations(captured_at DESC);

-- Indice espacial para coordenadas (para queries de proximidade futuras)
CREATE INDEX IF NOT EXISTS idx_driver_locations_coords
  ON driver_locations(latitude, longitude);

-- =====================================================
-- ETAPA 4: Politicas RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Politica: Motoristas podem inserir suas proprias localizacoes
CREATE POLICY "Motoristas podem inserir localizacoes"
  ON driver_locations
  FOR INSERT
  WITH CHECK (true);

-- Politica: Qualquer um pode ver localizacoes (para rastreamento publico)
CREATE POLICY "Localizacoes sao visiveis"
  ON driver_locations
  FOR SELECT
  USING (true);

-- =====================================================
-- ETAPA 5: View para ultima localizacao de cada motorista
-- =====================================================

CREATE OR REPLACE VIEW ultima_localizacao_motoristas AS
SELECT DISTINCT ON (dl.motorista_id)
  dl.motorista_id,
  m.nome AS motorista_nome,
  dl.latitude,
  dl.longitude,
  dl.endereco,
  dl.accuracy,
  dl.speed,
  dl.heading,
  dl.captured_at,
  dl.viagem_id,
  -- Calcula se a localizacao eh recente (menos de 5 minutos)
  CASE
    WHEN dl.captured_at > NOW() - INTERVAL '5 minutes' THEN true
    ELSE false
  END AS online
FROM driver_locations dl
JOIN motoristas m ON m.id = dl.motorista_id
WHERE dl.captured_at > NOW() - INTERVAL '24 hours'
ORDER BY dl.motorista_id, dl.captured_at DESC;

-- =====================================================
-- ETAPA 6: Funcao para limpar localizacoes antigas
-- =====================================================

CREATE OR REPLACE FUNCTION limpar_localizacoes_antigas()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove localizacoes com mais de 7 dias
  -- Mantem apenas a ultima localizacao de cada viagem
  DELETE FROM driver_locations
  WHERE captured_at < NOW() - INTERVAL '7 days'
    AND id NOT IN (
      -- Mantem a primeira e ultima localizacao de cada viagem
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY viagem_id ORDER BY captured_at ASC) as rn_first,
               ROW_NUMBER() OVER (PARTITION BY viagem_id ORDER BY captured_at DESC) as rn_last
        FROM driver_locations
        WHERE viagem_id IS NOT NULL
      ) sub
      WHERE rn_first = 1 OR rn_last = 1
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- ETAPA 7: Comentarios nas colunas
-- =====================================================

COMMENT ON TABLE driver_locations IS 'Historico de localizacoes dos motoristas';
COMMENT ON COLUMN driver_locations.accuracy IS 'Precisao do GPS em metros';
COMMENT ON COLUMN driver_locations.speed IS 'Velocidade em metros por segundo';
COMMENT ON COLUMN driver_locations.heading IS 'Direcao em graus (0 = Norte, 90 = Leste)';

COMMENT ON COLUMN viagens.local_inicio_lat IS 'Latitude capturada ao iniciar a viagem';
COMMENT ON COLUMN viagens.local_inicio_lng IS 'Longitude capturada ao iniciar a viagem';
COMMENT ON COLUMN viagens.local_inicio_endereco IS 'Endereco reverso do ponto de inicio';
COMMENT ON COLUMN viagens.local_inicio_timestamp IS 'Momento da captura da localizacao inicial';

COMMENT ON COLUMN viagens.local_fim_lat IS 'Latitude capturada ao finalizar a viagem';
COMMENT ON COLUMN viagens.local_fim_lng IS 'Longitude capturada ao finalizar a viagem';
COMMENT ON COLUMN viagens.local_fim_endereco IS 'Endereco reverso do ponto de finalizacao';
COMMENT ON COLUMN viagens.local_fim_timestamp IS 'Momento da captura da localizacao final';
