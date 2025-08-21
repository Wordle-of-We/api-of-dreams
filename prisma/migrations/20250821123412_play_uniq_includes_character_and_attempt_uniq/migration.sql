/*
  Ajustes:
  - Drop das UNIQUE antigas de Play via DROP CONSTRAINT (não DROP INDEX)
  - Saneamento de dados em Attempt (duplicatas, order nulo, playId nulo)
  - Criação de UNIQUE novas (com characterId) e índices
*/

-- 0) (Opcional) Verificações rápidas ANTES (para você inspecionar, não falha se não rodar)
-- -- Duplicatas por (playId, guess)
-- SELECT "playId","guess",COUNT(*) FROM "Attempt"
-- GROUP BY 1,2 HAVING COUNT(*) > 1;
-- -- Attempts com order nulo
-- SELECT COUNT(*) FROM "Attempt" WHERE "order" IS NULL;
-- -- Attempts com playId nulo
-- SELECT COUNT(*) FROM "Attempt" WHERE "playId" IS NULL;

-- 1) Soltar FK para permitir alterações tranquilas
ALTER TABLE "Attempt" DROP CONSTRAINT IF EXISTS "Attempt_playId_fkey";

-- 2) Remover UNIQUE antigas (dia/modo) – dropar CONSTRAINT, não índice
ALTER TABLE "Play" DROP CONSTRAINT IF EXISTS "guest_day_mode_unique";
ALTER TABLE "Play" DROP CONSTRAINT IF EXISTS "user_day_mode_unique";

-- 3) Saneamento de dados em Attempt, ANTES de NOT NULL/UNIQUE

-- 3a) Remover duplicatas exatas por (playId, guess), mantendo o menor id
WITH d AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "playId","guess" ORDER BY id) rn
  FROM "Attempt"
)
DELETE FROM "Attempt" a
USING d
WHERE a.id = d.id AND d.rn > 1;

-- 3b) Preencher "order" nulo com numeração determinística por play
WITH to_fix AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "playId" ORDER BY "createdAt", id) AS new_order
  FROM "Attempt"
  WHERE "order" IS NULL AND "playId" IS NOT NULL
)
UPDATE "Attempt" a
SET "order" = t.new_order
FROM to_fix t
WHERE a.id = t.id;

-- 3c) Tratar attempts órfãos (playId nulo).
-- Opção simples (apaga órfãos):
DELETE FROM "Attempt" WHERE "playId" IS NULL;

-- (Alternativa avançada para tentar reanexar órfãos a uma Play compatível - use por sua conta e risco)
-- -- UPDATE "Attempt" a
-- -- SET "playId" = p.id
-- -- FROM "Play" p
-- -- WHERE a."playId" IS NULL
-- --   AND a."guestId" IS NOT NULL
-- --   AND p."guestId" = a."guestId"
-- --   AND p."modeConfigId" = a."modeConfigId"
-- --   AND p."characterId" = a."targetCharacterId"
-- --   AND p."selectionDate" = date_trunc('day', a."createdAt" AT TIME ZONE 'America/Fortaleza');

-- 4) Agora sim: alterar Attempt (drop attemptNumber, NOT NULL)
ALTER TABLE "Attempt"
  DROP COLUMN IF EXISTS "attemptNumber",
  ALTER COLUMN "playId" SET NOT NULL,
  ALTER COLUMN "order" SET NOT NULL;

-- 5) Índices úteis
CREATE INDEX IF NOT EXISTS "Attempt_playId_createdAt_idx"
  ON "Attempt"("playId","createdAt");

CREATE INDEX IF NOT EXISTS "Play_guestId_modeConfigId_selectionDate_idx"
  ON "Play"("guestId","modeConfigId","selectionDate");

CREATE INDEX IF NOT EXISTS "Play_userId_modeConfigId_selectionDate_idx"
  ON "Play"("userId","modeConfigId","selectionDate");

-- 6) UNIQUE novas

-- Em Attempt: proíbe chute repetido na mesma play
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_guess_per_play'
  ) THEN
    ALTER TABLE "Attempt"
      ADD CONSTRAINT "uniq_guess_per_play" UNIQUE ("playId","guess");
  END IF;
END $$;

-- Em Play: permite múltiplas plays no mesmo dia/modo quando o personagem muda
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_user_mode_day_char'
  ) THEN
    ALTER TABLE "Play"
      ADD CONSTRAINT "uniq_user_mode_day_char"
      UNIQUE ("userId","modeConfigId","selectionDate","characterId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_guest_mode_day_char'
  ) THEN
    ALTER TABLE "Play"
      ADD CONSTRAINT "uniq_guest_mode_day_char"
      UNIQUE ("guestId","modeConfigId","selectionDate","characterId");
  END IF;
END $$;

-- 7) Restaurar FK
ALTER TABLE "Attempt"
  ADD CONSTRAINT "Attempt_playId_fkey"
  FOREIGN KEY ("playId") REFERENCES "Play"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
