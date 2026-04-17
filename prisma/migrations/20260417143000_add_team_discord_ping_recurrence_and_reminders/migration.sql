-- Add team Discord ping throttling and reminder settings
ALTER TABLE IF EXISTS "Team"
  ADD COLUMN IF NOT EXISTS "discordPingRecurrence" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "discordLastChannelPingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discordRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "discordReminderDelaysMinutes" INTEGER[] NOT NULL DEFAULT '{}';

-- Queue for pre-event team reminders
CREATE TABLE IF NOT EXISTS "TeamEventReminder" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "reminderMinutes" INTEGER NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "TeamEventReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamEventReminder_eventId_reminderMinutes_key"
  ON "TeamEventReminder"("eventId", "reminderMinutes");

CREATE INDEX IF NOT EXISTS "TeamEventReminder_processed_remindAt_idx"
  ON "TeamEventReminder"("processed", "remindAt");

CREATE INDEX IF NOT EXISTS "TeamEventReminder_teamId_processed_idx"
  ON "TeamEventReminder"("teamId", "processed");

CREATE INDEX IF NOT EXISTS "TeamEventReminder_eventId_idx"
  ON "TeamEventReminder"("eventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventReminder_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamEventReminder"
      ADD CONSTRAINT "TeamEventReminder_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventReminder_eventId_fkey'
  ) THEN
    ALTER TABLE "TeamEventReminder"
      ADD CONSTRAINT "TeamEventReminder_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
