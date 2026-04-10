-- AlterTable
ALTER TABLE "Badge"
  ADD COLUMN IF NOT EXISTS "shape" TEXT NOT NULL DEFAULT 'squircle',
  ADD COLUMN IF NOT EXISTS "animation" TEXT NOT NULL DEFAULT 'breathe';

-- Give common built-in badges polished defaults
UPDATE "Badge"
SET "shape" = 'crest', "animation" = 'breathe'
WHERE lower("key") = 'admin';

UPDATE "Badge"
SET "shape" = 'soft-hex', "animation" = 'drift'
WHERE lower("key") = 'developer';

UPDATE "Badge"
SET "shape" = 'round', "animation" = 'glint'
WHERE lower("key") = 'support';

UPDATE "Badge"
SET "shape" = 'bevel', "animation" = 'spark'
WHERE lower("key") IN ('vip', 'goat');

UPDATE "Badge"
SET "shape" = 'soft-hex', "animation" = 'glint'
WHERE lower("key") = 'partner';
