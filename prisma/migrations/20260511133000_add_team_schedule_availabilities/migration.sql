ALTER TABLE "Team"
  ADD COLUMN IF NOT EXISTS "fillAvailabilitiesReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "fillAvailabilitiesReminderDayOfWeek" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fillAvailabilitiesReminderTimeMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "fillAvailabilitiesReminderLastSentAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "TeamScheduleAvailability" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "rawText" TEXT,
  "intervals" JSONB NOT NULL DEFAULT '[]',
  "source" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamScheduleAvailability_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamScheduleAvailability_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamScheduleAvailability"
      ADD CONSTRAINT "TeamScheduleAvailability_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamScheduleAvailability_userId_fkey'
  ) THEN
    ALTER TABLE "TeamScheduleAvailability"
      ADD CONSTRAINT "TeamScheduleAvailability_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TeamScheduleAvailability_teamId_userId_weekStart_dayOfWeek_key"
  ON "TeamScheduleAvailability"("teamId", "userId", "weekStart", "dayOfWeek");

CREATE INDEX IF NOT EXISTS "TeamScheduleAvailability_teamId_weekStart_idx"
  ON "TeamScheduleAvailability"("teamId", "weekStart");

CREATE INDEX IF NOT EXISTS "TeamScheduleAvailability_userId_weekStart_idx"
  ON "TeamScheduleAvailability"("userId", "weekStart");
