-- Ranked 1v1 feature rollout
-- 1) Adds user ladder fields
-- 2) Creates RankedOneVOneStatus / RankedOneVOneResultSource enums
-- 3) Creates RankedOneVOne table and indexes

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

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "oneVOneRating" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS "oneVOneWins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "oneVOneLosses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "oneVOneDraws" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_oneVOneRating_idx" ON "User" ("oneVOneRating");

CREATE TABLE IF NOT EXISTS "RankedOneVOne" (
  "id" TEXT NOT NULL,
  "challengerId" TEXT NOT NULL,
  "opponentId" TEXT NOT NULL,
  "region" "Region" NOT NULL,
  "status" "RankedOneVOneStatus" NOT NULL DEFAULT 'PENDING',
  "lobbyName" TEXT,
  "lobbyPassword" TEXT,
  "hostUserId" TEXT,
  "lobbyCreatedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
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

CREATE UNIQUE INDEX IF NOT EXISTS "RankedOneVOne_matchId_key" ON "RankedOneVOne" ("matchId");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_challengerId_createdAt_idx" ON "RankedOneVOne" ("challengerId", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_opponentId_createdAt_idx" ON "RankedOneVOne" ("opponentId", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_status_createdAt_idx" ON "RankedOneVOne" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "RankedOneVOne_region_createdAt_idx" ON "RankedOneVOne" ("region", "createdAt");
