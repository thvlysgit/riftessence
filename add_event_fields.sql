-- Add enemyMultigg field to TeamEvent for Scrim/Tournament events
ALTER TABLE "TeamEvent" ADD COLUMN IF NOT EXISTS "enemyMultigg" TEXT;

-- Add iconUrl field to Team for custom team icons
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;

-- Create TeamEventCoach junction table for VOD Review coach assignments
CREATE TABLE IF NOT EXISTS "TeamEventCoach" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamEventCoach_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint
ALTER TABLE "TeamEventCoach" ADD CONSTRAINT "TeamEventCoach_eventId_userId_key" UNIQUE ("eventId", "userId");

-- Add indexes
CREATE INDEX IF NOT EXISTS "TeamEventCoach_eventId_idx" ON "TeamEventCoach"("eventId");
CREATE INDEX IF NOT EXISTS "TeamEventCoach_userId_idx" ON "TeamEventCoach"("userId");

-- Add foreign keys
ALTER TABLE "TeamEventCoach" ADD CONSTRAINT "TeamEventCoach_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamEventCoach" ADD CONSTRAINT "TeamEventCoach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
