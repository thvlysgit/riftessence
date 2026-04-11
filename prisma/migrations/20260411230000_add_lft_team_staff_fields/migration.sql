-- Add team linkage and staff-role recruitment support for LFT posts
ALTER TABLE "LftPost"
  ADD COLUMN "teamId" TEXT,
  ADD COLUMN "staffNeeded" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "LftPost_teamId_createdAt_idx" ON "LftPost"("teamId", "createdAt");
