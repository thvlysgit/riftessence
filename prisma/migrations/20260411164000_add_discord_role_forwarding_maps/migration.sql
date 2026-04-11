-- Add per-community Discord role forwarding maps for ranks and languages
ALTER TABLE "Community"
  ADD COLUMN IF NOT EXISTS "discordRankRoleMap" JSONB,
  ADD COLUMN IF NOT EXISTS "discordLanguageRoleMap" JSONB;
