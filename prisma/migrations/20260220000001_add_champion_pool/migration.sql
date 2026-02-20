-- Add ChampionPoolDisplayMode enum and champion pool columns to User table
-- Run this on the Pi if champion-pool PATCH returns 500

DO $$ BEGIN
  CREATE TYPE "ChampionPoolDisplayMode" AS ENUM ('LIST', 'TIERLIST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "championPoolMode" "ChampionPoolDisplayMode" NOT NULL DEFAULT 'LIST',
  ADD COLUMN IF NOT EXISTS "championList"     text[]  NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "championTierlist" jsonb;
