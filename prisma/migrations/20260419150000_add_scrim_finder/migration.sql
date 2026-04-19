-- Add new FeedType value for Scrim mirroring
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'FeedType'
      AND e.enumlabel = 'SCRIM'
  ) THEN
    ALTER TYPE "FeedType" ADD VALUE 'SCRIM';
  END IF;
END $$;

-- Add notification types for Scrim proposal lifecycle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_PROPOSAL_RECEIVED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_PROPOSAL_RECEIVED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_PROPOSAL_ACCEPTED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_PROPOSAL_ACCEPTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_PROPOSAL_REJECTED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_PROPOSAL_REJECTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_PROPOSAL_DELAYED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_PROPOSAL_DELAYED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_PROPOSAL_AUTO_REJECTED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_PROPOSAL_AUTO_REJECTED';
  END IF;
END $$;

-- Scrim-specific enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimFormat') THEN
    CREATE TYPE "ScrimFormat" AS ENUM ('BO1', 'BO3', 'BO5', 'BLOCK');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimPostStatus') THEN
    CREATE TYPE "ScrimPostStatus" AS ENUM ('AVAILABLE', 'CANDIDATES', 'SETTLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimProposalStatus') THEN
    CREATE TYPE "ScrimProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'DELAYED', 'AUTO_REJECTED');
  END IF;
END $$;

-- Scrim posts
CREATE TABLE IF NOT EXISTS "ScrimPost" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "contactUserId" TEXT,
  "region" "Region" NOT NULL,
  "teamName" TEXT NOT NULL,
  "teamTag" TEXT,
  "averageRank" "Rank",
  "averageDivision" TEXT,
  "startTimeUtc" TIMESTAMP(3) NOT NULL,
  "timezoneLabel" TEXT,
  "scrimFormat" "ScrimFormat" NOT NULL,
  "teamMultiGgUrl" TEXT,
  "opggMultisearchUrl" TEXT,
  "details" TEXT,
  "status" "ScrimPostStatus" NOT NULL DEFAULT 'AVAILABLE',
  "settledAt" TIMESTAMP(3),
  "discordMirrored" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScrimPost_pkey" PRIMARY KEY ("id")
);

-- Scrim proposals
CREATE TABLE IF NOT EXISTS "ScrimProposal" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "proposerTeamId" TEXT NOT NULL,
  "targetTeamId" TEXT NOT NULL,
  "proposedByUserId" TEXT NOT NULL,
  "message" TEXT,
  "proposedStartTimeUtc" TIMESTAMP(3),
  "status" "ScrimProposalStatus" NOT NULL DEFAULT 'PENDING',
  "lowPriorityAt" TIMESTAMP(3),
  "decisionByUserId" TEXT,
  "decisionAt" TIMESTAMP(3),
  "autoRejectedAt" TIMESTAMP(3),
  "responseSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScrimProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScrimProposal_postId_proposerTeamId_key"
  ON "ScrimProposal"("postId", "proposerTeamId");

CREATE INDEX IF NOT EXISTS "ScrimPost_teamId_createdAt_idx"
  ON "ScrimPost"("teamId", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimPost_status_createdAt_idx"
  ON "ScrimPost"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimPost_region_status_createdAt_idx"
  ON "ScrimPost"("region", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimPost_scrimFormat_createdAt_idx"
  ON "ScrimPost"("scrimFormat", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimPost_source_discordMirrored_idx"
  ON "ScrimPost"("source", "discordMirrored");

CREATE INDEX IF NOT EXISTS "ScrimProposal_postId_status_createdAt_idx"
  ON "ScrimProposal"("postId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimProposal_proposerTeamId_status_createdAt_idx"
  ON "ScrimProposal"("proposerTeamId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimProposal_targetTeamId_status_createdAt_idx"
  ON "ScrimProposal"("targetTeamId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimPost_teamId_fkey'
  ) THEN
    ALTER TABLE "ScrimPost"
      ADD CONSTRAINT "ScrimPost_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimPost_authorId_fkey'
  ) THEN
    ALTER TABLE "ScrimPost"
      ADD CONSTRAINT "ScrimPost_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimProposal_postId_fkey'
  ) THEN
    ALTER TABLE "ScrimProposal"
      ADD CONSTRAINT "ScrimProposal_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "ScrimPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimProposal_proposerTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimProposal"
      ADD CONSTRAINT "ScrimProposal_proposerTeamId_fkey"
      FOREIGN KEY ("proposerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimProposal_targetTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimProposal"
      ADD CONSTRAINT "ScrimProposal_targetTeamId_fkey"
      FOREIGN KEY ("targetTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimProposal_proposedByUserId_fkey'
  ) THEN
    ALTER TABLE "ScrimProposal"
      ADD CONSTRAINT "ScrimProposal_proposedByUserId_fkey"
      FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
