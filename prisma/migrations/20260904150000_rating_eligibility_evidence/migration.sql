ALTER TABLE "PendingRating"
  ADD COLUMN "sharedMatchesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eligibleRaterPuuids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "eligibleReceiverAccountIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sharedMatchesCheckedAt" TIMESTAMP(3);
