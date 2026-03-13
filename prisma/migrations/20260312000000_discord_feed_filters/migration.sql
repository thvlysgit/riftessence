-- Migration: Add feed type, filters to DiscordFeedChannel + mirroring to LftPost
-- Run this BEFORE deploying new code

-- 1. Create the FeedType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedType') THEN
    CREATE TYPE "FeedType" AS ENUM ('DUO', 'LFT');
  END IF;
END
$$;

-- 2. Add new columns to DiscordFeedChannel
ALTER TABLE "DiscordFeedChannel"
  ADD COLUMN IF NOT EXISTS "feedType" "FeedType" NOT NULL DEFAULT 'DUO',
  ADD COLUMN IF NOT EXISTS "filterRegions" "Region"[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "filterRoles" "Role"[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "filterMinRank" "Rank",
  ADD COLUMN IF NOT EXISTS "filterMaxRank" "Rank";

-- 3. Drop old unique constraint and create new one
-- The old constraint was on (communityId, channelId). New one is (guildId, channelId, feedType).
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DiscordFeedChannel_communityId_channelId_key'
  ) THEN
    ALTER TABLE "DiscordFeedChannel"
      DROP CONSTRAINT "DiscordFeedChannel_communityId_channelId_key";
  END IF;
END
$$;

-- Create new unique constraint (guildId + channelId + feedType)
-- This allows the same channel to have both DUO and LFT configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DiscordFeedChannel_guildId_channelId_feedType_key'
  ) THEN
    ALTER TABLE "DiscordFeedChannel"
      ADD CONSTRAINT "DiscordFeedChannel_guildId_channelId_feedType_key"
      UNIQUE ("guildId", "channelId", "feedType");
  END IF;
END
$$;

-- 4. Add index on feedType + guildId
CREATE INDEX IF NOT EXISTS "DiscordFeedChannel_feedType_guildId_idx"
  ON "DiscordFeedChannel" ("feedType", "guildId");

-- 5. Add discordMirrored and source columns to LftPost
ALTER TABLE "LftPost"
  ADD COLUMN IF NOT EXISTS "discordMirrored" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'app';

-- 6. Add index for LFT mirroring polling
CREATE INDEX IF NOT EXISTS "LftPost_source_discordMirrored_idx"
  ON "LftPost" ("source", "discordMirrored");
