-- Add language filters to Discord feed channel configs
ALTER TABLE "DiscordFeedChannel"
  ADD COLUMN IF NOT EXISTS "filterLanguages" TEXT[] DEFAULT '{}';

UPDATE "DiscordFeedChannel"
SET "filterLanguages" = '{}'
WHERE "filterLanguages" IS NULL;

ALTER TABLE "DiscordFeedChannel"
  ALTER COLUMN "filterLanguages" SET DEFAULT '{}',
  ALTER COLUMN "filterLanguages" SET NOT NULL;
