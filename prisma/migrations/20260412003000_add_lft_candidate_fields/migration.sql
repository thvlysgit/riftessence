-- Add support for coach/manager/other candidate listings and represented profiles
ALTER TABLE "LftPost"
ADD COLUMN "candidateType" TEXT NOT NULL DEFAULT 'PLAYER',
ADD COLUMN "representedName" TEXT;

CREATE INDEX "LftPost_type_candidateType_createdAt_idx"
ON "LftPost"("type", "candidateType", "createdAt");
