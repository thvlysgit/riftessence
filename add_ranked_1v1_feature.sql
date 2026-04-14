-- Ranked 1v1 feature rollout
-- 1) Adds user ladder fields
-- 2) Creates RankedOneVOne enums
-- 3) Creates queue + challenge tables and lifecycle columns

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RankedOneVOneStatus') THEN
    CREATE TYPE "RankedOneVOneStatus" AS ENUM (
      'PENDING',
      'ACCEPTED',
      'LOBBY_READY',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RankedOneVOneResultSource') THEN
    CREATE TYPE "RankedOneVOneResultSource" AS ENUM (
      'RIOT_MATCH',
      'MANUAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RankedOneVOneStyle') THEN
    CREATE TYPE "RankedOneVOneStyle" AS ENUM (
      'ARAM_STANDARD',
      'ARAM_FIRST_BLOOD',
      'MID_STANDARD',
      'TOP_STANDARD'
    );
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "oneVOneRating" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS "oneVOneWins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "oneVOneLosses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "oneVOneDraws" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_oneVOneRating_idx" ON "User" ("oneVOneRating");

CREATE TABLE IF NOT EXISTS "RankedOneVOneQueue" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "region" "Region" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedOneVOneQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RankedOneVOneQueue_userId_key" ON "RankedOneVOneQueue" ("userId");
CREATE INDEX IF NOT EXISTS "RankedOneVOneQueue_region_createdAt_idx" ON "RankedOneVOneQueue" ("region", "createdAt");

CREATE TABLE IF NOT EXISTS "RankedOneVOne" (
  "id" TEXT NOT NULL,
  "challengerId" TEXT NOT NULL,
  "opponentId" TEXT NOT NULL,
  "region" "Region" NOT NULL,
  "status" "RankedOneVOneStatus" NOT NULL DEFAULT 'PENDING',
  "acceptDeadlineAt" TIMESTAMP(3),
  "challengerAcceptedAt" TIMESTAMP(3),
  "opponentAcceptedAt" TIMESTAMP(3),
  "styleSelectionDeadlineAt" TIMESTAMP(3),
  "challengerStyleChoice" "RankedOneVOneStyle",
  "opponentStyleChoice" "RankedOneVOneStyle",
  "resolvedStyle" "RankedOneVOneStyle",
  "lobbyName" TEXT,
  "lobbyPassword" TEXT,
  "hostUserId" TEXT,
  "creatorUserId" TEXT,
  "joinerUserId" TEXT,
  "lobbyCreatedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "challengerFinishedAt" TIMESTAMP(3),
  "opponentFinishedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "issueReports" JSONB,
  "forfeitedById" TEXT,
  "forfeitReason" TEXT,
  "matchId" TEXT,
  "resultSource" "RankedOneVOneResultSource",
  "winnerId" TEXT,
  "loserId" TEXT,
  "challengerRatingBefore" INTEGER,
  "opponentRatingBefore" INTEGER,
  "challengerRatingDelta" INTEGER,
  "opponentRatingDelta" INTEGER,
  "queueId" INTEGER,
  "gameMode" TEXT,
  "gameType" TEXT,
  "gameStartAt" TIMESTAMP(3),
  "gameEndAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedOneVOne_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RankedOneVOne"
  ADD COLUMN IF NOT EXISTS "acceptDeadlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "challengerAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opponentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "styleSelectionDeadlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "challengerStyleChoice" "RankedOneVOneStyle",
  ADD COLUMN IF NOT EXISTS "opponentStyleChoice" "RankedOneVOneStyle",
  ADD COLUMN IF NOT EXISTS "resolvedStyle" "RankedOneVOneStyle",
  ADD COLUMN IF NOT EXISTS "creatorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "joinerUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "challengerFinishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opponentFinishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "issueReports" JSONB,
  ADD COLUMN IF NOT EXISTS "forfeitedById" TEXT,
  ADD COLUMN IF NOT EXISTS "forfeitReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RankedOneVOne_matchId_key" ON "RankedOneVOne" ("matchId");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_challengerId_createdAt_idx" ON "RankedOneVOne" ("challengerId", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_opponentId_createdAt_idx" ON "RankedOneVOne" ("opponentId", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_status_createdAt_idx" ON "RankedOneVOne" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_region_createdAt_idx" ON "RankedOneVOne" ("region", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_acceptDeadlineAt_idx" ON "RankedOneVOne" ("acceptDeadlineAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_styleSelectionDeadlineAt_idx" ON "RankedOneVOne" ("styleSelectionDeadlineAt");
