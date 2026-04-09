-- Create team system enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamRole') THEN
    CREATE TYPE "TeamRole" AS ENUM ('TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'OWNER', 'COACH');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamEventType') THEN
    CREATE TYPE "TeamEventType" AS ENUM ('SCRIM', 'PRACTICE', 'VOD_REVIEW', 'TOURNAMENT', 'TEAM_MEETING');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('ABSENT', 'PRESENT', 'UNSURE');
  END IF;
END
$$;

-- Team table
CREATE TABLE IF NOT EXISTS "Team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tag" TEXT,
  "description" TEXT,
  "iconUrl" TEXT,
  "region" "Region" NOT NULL,
  "discordWebhookUrl" TEXT,
  "discordNotifyEvents" BOOLEAN NOT NULL DEFAULT true,
  "discordNotifyMembers" BOOLEAN NOT NULL DEFAULT false,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- Team member table
CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "TeamRole" NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- Pending roster spots table
CREATE TABLE IF NOT EXISTS "TeamPendingSpot" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "riotId" TEXT,
  "puuid" TEXT,
  "username" TEXT,
  "role" "TeamRole" NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamPendingSpot_pkey" PRIMARY KEY ("id")
);

-- Team events table
CREATE TABLE IF NOT EXISTS "TeamEvent" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "TeamEventType" NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER,
  "enemyMultigg" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "discordMirrored" BOOLEAN NOT NULL DEFAULT false,
  "discordMessageId" TEXT,

  CONSTRAINT "TeamEvent_pkey" PRIMARY KEY ("id")
);

-- Event coaches table
CREATE TABLE IF NOT EXISTS "TeamEventCoach" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamEventCoach_pkey" PRIMARY KEY ("id")
);

-- Event attendance table
CREATE TABLE IF NOT EXISTS "TeamEventAttendance" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'UNSURE',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamEventAttendance_pkey" PRIMARY KEY ("id")
);

-- Team notification queue for Discord bot
CREATE TABLE IF NOT EXISTS "TeamEventNotification" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventTitle" TEXT NOT NULL,
  "eventType" "TeamEventType" NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER,
  "description" TEXT,
  "enemyLink" TEXT,
  "notificationType" TEXT NOT NULL,
  "triggeredBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "TeamEventNotification_pkey" PRIMARY KEY ("id")
);

-- Uniques
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamPendingSpot_teamId_puuid_key" ON "TeamPendingSpot"("teamId", "puuid");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamEventCoach_eventId_userId_key" ON "TeamEventCoach"("eventId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamEventAttendance_eventId_userId_key" ON "TeamEventAttendance"("eventId", "userId");

-- Indexes
CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team"("ownerId");
CREATE INDEX IF NOT EXISTS "Team_region_createdAt_idx" ON "Team"("region", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX IF NOT EXISTS "TeamPendingSpot_teamId_idx" ON "TeamPendingSpot"("teamId");
CREATE INDEX IF NOT EXISTS "TeamPendingSpot_puuid_idx" ON "TeamPendingSpot"("puuid");
CREATE INDEX IF NOT EXISTS "TeamPendingSpot_username_idx" ON "TeamPendingSpot"("username");
CREATE INDEX IF NOT EXISTS "TeamEvent_teamId_scheduledAt_idx" ON "TeamEvent"("teamId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "TeamEvent_createdBy_idx" ON "TeamEvent"("createdBy");
CREATE INDEX IF NOT EXISTS "TeamEvent_teamId_discordMirrored_idx" ON "TeamEvent"("teamId", "discordMirrored");
CREATE INDEX IF NOT EXISTS "TeamEventCoach_eventId_idx" ON "TeamEventCoach"("eventId");
CREATE INDEX IF NOT EXISTS "TeamEventCoach_userId_idx" ON "TeamEventCoach"("userId");
CREATE INDEX IF NOT EXISTS "TeamEventAttendance_eventId_idx" ON "TeamEventAttendance"("eventId");
CREATE INDEX IF NOT EXISTS "TeamEventAttendance_userId_idx" ON "TeamEventAttendance"("userId");
CREATE INDEX IF NOT EXISTS "TeamEventNotification_processed_createdAt_idx" ON "TeamEventNotification"("processed", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamEventNotification_teamId_idx" ON "TeamEventNotification"("teamId");

-- Foreign keys (conditionally added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Team_ownerId_fkey'
  ) THEN
    ALTER TABLE "Team"
      ADD CONSTRAINT "Team_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamMember_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamMember"
      ADD CONSTRAINT "TeamMember_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamMember_userId_fkey'
  ) THEN
    ALTER TABLE "TeamMember"
      ADD CONSTRAINT "TeamMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamPendingSpot_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamPendingSpot"
      ADD CONSTRAINT "TeamPendingSpot_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEvent_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamEvent"
      ADD CONSTRAINT "TeamEvent_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventCoach_eventId_fkey'
  ) THEN
    ALTER TABLE "TeamEventCoach"
      ADD CONSTRAINT "TeamEventCoach_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventCoach_userId_fkey'
  ) THEN
    ALTER TABLE "TeamEventCoach"
      ADD CONSTRAINT "TeamEventCoach_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventAttendance_eventId_fkey'
  ) THEN
    ALTER TABLE "TeamEventAttendance"
      ADD CONSTRAINT "TeamEventAttendance_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventAttendance_userId_fkey'
  ) THEN
    ALTER TABLE "TeamEventAttendance"
      ADD CONSTRAINT "TeamEventAttendance_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventNotification_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamEventNotification"
      ADD CONSTRAINT "TeamEventNotification_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
