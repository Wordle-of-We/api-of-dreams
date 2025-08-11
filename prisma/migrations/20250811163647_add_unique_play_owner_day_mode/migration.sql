-- 1) Backfill: preencher selectionDate nula com início do dia de createdAt
UPDATE "Play"
SET "selectionDate" = date_trunc('day', "createdAt")
WHERE "selectionDate" IS NULL;

-- 1.1) Garantir "dono" para plays sem userId e sem guestId
-- Use md5(...) para não depender de extensão pgcrypto em Neon
UPDATE "Play"
SET "guestId" = md5(random()::text || clock_timestamp()::text)
WHERE "userId" IS NULL
  AND "guestId" IS NULL;

-- 2) Detectar duplicatas por dono (userId ou guestId) + modo + dia
--    e criar TABELA TEMPORÁRIA com o mapeamento dup_id -> keep_id
CREATE TEMP TABLE "_fix_dups" AS
WITH plays_norm AS (
  SELECT
    p.id,
    p."userId",
    p."guestId",
    p."modeConfigId",
    p."selectionDate",
    p."createdAt",
    COALESCE(CAST(p."userId" AS text), p."guestId") AS owner_key,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(CAST(p."userId" AS text), p."guestId"),
                   p."modeConfigId",
                   p."selectionDate"
      ORDER BY p."createdAt" ASC, p.id ASC
    ) AS rn
  FROM "Play" p
),
dupes AS (
  SELECT * FROM plays_norm WHERE rn > 1
),
keepers AS (
  SELECT
    owner_key, "modeConfigId", "selectionDate",
    MIN(id) AS keep_id
  FROM plays_norm
  WHERE rn = 1
  GROUP BY owner_key, "modeConfigId", "selectionDate"
)
SELECT d.id AS dup_id, k.keep_id
FROM dupes d
JOIN keepers k
  ON k.owner_key = d.owner_key
 AND k."modeConfigId" = d."modeConfigId"
 AND k."selectionDate" = d."selectionDate";

-- 2.1) Mover attempts das duplicatas para a play mantida
UPDATE "Attempt" a
SET "playId" = f.keep_id
FROM "_fix_dups" f
WHERE a."playId" = f.dup_id;

-- 2.2) Remover as plays duplicadas
DELETE FROM "Play" p
USING "_fix_dups" f
WHERE p.id = f.dup_id;

-- Limpar tabela temporária
DROP TABLE "_fix_dups";

-- 3) Travar NOT NULL
ALTER TABLE "Play"
ALTER COLUMN "selectionDate" SET NOT NULL;

-- 4) Adicionar constraints de unicidade (user e guest)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_day_mode_unique'
  ) THEN
    ALTER TABLE "Play"
      ADD CONSTRAINT "user_day_mode_unique"
      UNIQUE ("userId","modeConfigId","selectionDate");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_day_mode_unique'
  ) THEN
    ALTER TABLE "Play"
      ADD CONSTRAINT "guest_day_mode_unique"
      UNIQUE ("guestId","modeConfigId","selectionDate");
  END IF;
END $$;
