CREATE TABLE IF NOT EXISTS "ScrimSeries" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "hostTeamId" TEXT NOT NULL,
  "guestTeamId" TEXT NOT NULL,
  "matchCode" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "winnerTeamId" TEXT,
  "winnerConfirmedAt" TIMESTAMP(3),
  "firstReporterTeamId" TEXT,
  "firstReportedWinnerTeamId" TEXT,
  "firstReportedAt" TIMESTAMP(3),
  "hostEventId" TEXT,
  "guestEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScrimSeries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScrimSeries_proposalId_key" ON "ScrimSeries"("proposalId");
CREATE INDEX IF NOT EXISTS "ScrimSeries_hostTeamId_scheduledAt_idx" ON "ScrimSeries"("hostTeamId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ScrimSeries_guestTeamId_scheduledAt_idx" ON "ScrimSeries"("guestTeamId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ScrimSeries_winnerTeamId_winnerConfirmedAt_idx" ON "ScrimSeries"("winnerTeamId", "winnerConfirmedAt");
CREATE INDEX IF NOT EXISTS "ScrimSeries_matchCode_idx" ON "ScrimSeries"("matchCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimSeries_proposalId_fkey'
  ) THEN
    ALTER TABLE "ScrimSeries"
      ADD CONSTRAINT "ScrimSeries_proposalId_fkey"
      FOREIGN KEY ("proposalId") REFERENCES "ScrimProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimSeries_postId_fkey'
  ) THEN
    ALTER TABLE "ScrimSeries"
      ADD CONSTRAINT "ScrimSeries_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "ScrimPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimSeries_hostTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimSeries"
      ADD CONSTRAINT "ScrimSeries_hostTeamId_fkey"
      FOREIGN KEY ("hostTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimSeries_guestTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimSeries"
      ADD CONSTRAINT "ScrimSeries_guestTeamId_fkey"
      FOREIGN KEY ("guestTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ScrimTeamReview" (
  "id" TEXT NOT NULL,
  "seriesId" TEXT NOT NULL,
  "reviewerTeamId" TEXT NOT NULL,
  "targetTeamId" TEXT NOT NULL,
  "politeness" INTEGER NOT NULL,
  "punctuality" INTEGER NOT NULL,
  "gameplay" INTEGER NOT NULL,
  "averageRating" DOUBLE PRECISION NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScrimTeamReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScrimTeamReview_reviewerTeamId_targetTeamId_key"
  ON "ScrimTeamReview"("reviewerTeamId", "targetTeamId");

CREATE INDEX IF NOT EXISTS "ScrimTeamReview_targetTeamId_createdAt_idx"
  ON "ScrimTeamReview"("targetTeamId", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimTeamReview_seriesId_createdAt_idx"
  ON "ScrimTeamReview"("seriesId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimTeamReview_seriesId_fkey'
  ) THEN
    ALTER TABLE "ScrimTeamReview"
      ADD CONSTRAINT "ScrimTeamReview_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "ScrimSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimTeamReview_reviewerTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimTeamReview"
      ADD CONSTRAINT "ScrimTeamReview_reviewerTeamId_fkey"
      FOREIGN KEY ("reviewerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimTeamReview_targetTeamId_fkey'
  ) THEN
    ALTER TABLE "ScrimTeamReview"
      ADD CONSTRAINT "ScrimTeamReview_targetTeamId_fkey"
      FOREIGN KEY ("targetTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
