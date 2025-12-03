-- Migration: Adicionar campo moeda para viagens
-- Contexto: Separar tipo de moeda do valor das viagens

-- Adicionar campo moeda com valor padrão BRL (Real Brasileiro)
ALTER TABLE viagens
ADD COLUMN IF NOT EXISTS moeda VARCHAR(3) DEFAULT 'BRL';

-- Comentário no campo
COMMENT ON COLUMN viagens.moeda IS 'Código ISO 4217 da moeda (BRL, USD, EUR, etc.). Padrão: BRL';
