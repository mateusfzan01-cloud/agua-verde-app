-- Migration: Adicionar soft delete para viagens
-- Contexto: Permitir exclusão lógica de viagens criadas por erro de parsing de emails

-- Adicionar campo deleted_at para soft delete
ALTER TABLE viagens
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para otimizar consultas que filtram registros não excluídos
CREATE INDEX IF NOT EXISTS idx_viagens_deleted_at ON viagens(deleted_at);

-- Comentário no campo
COMMENT ON COLUMN viagens.deleted_at IS 'Data/hora da exclusão lógica (soft delete). NULL significa que o registro está ativo.';
