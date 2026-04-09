-- Add team notification mention strategy settings
ALTER TABLE IF EXISTS "Team"
  ADD COLUMN IF NOT EXISTS "discordMentionMode" TEXT NOT NULL DEFAULT 'EVERYONE',
  ADD COLUMN IF NOT EXISTS "discordMentionRoleId" TEXT,
  ADD COLUMN IF NOT EXISTS "discordRoleMentions" JSONB;

-- Add per-event audience targeting (empty array = everyone)
ALTER TABLE IF EXISTS "TeamEvent"
  ADD COLUMN IF NOT EXISTS "concernedMemberIds" TEXT[] NOT NULL DEFAULT '{}';

-- Persist targeted audience on queued notifications (important for deleted events)
ALTER TABLE IF EXISTS "TeamEventNotification"
  ADD COLUMN IF NOT EXISTS "concernedMemberIds" TEXT[] NOT NULL DEFAULT '{}';

-- Optional performance indexes for audience targeting filters
CREATE INDEX IF NOT EXISTS "TeamEvent_concernedMemberIds_idx"
  ON "TeamEvent" USING GIN ("concernedMemberIds");

CREATE INDEX IF NOT EXISTS "TeamEventNotification_concernedMemberIds_idx"
  ON "TeamEventNotification" USING GIN ("concernedMemberIds");
