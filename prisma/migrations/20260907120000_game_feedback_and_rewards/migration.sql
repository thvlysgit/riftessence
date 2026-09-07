ALTER TABLE "GameRound" ADD COLUMN "listenedSlots" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Ad" ADD COLUMN "discordContact" TEXT, ADD COLUMN "specialRequests" TEXT;

CREATE TABLE "GameSuggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idea" TEXT NOT NULL,
  "reviewed" BOOLEAN NOT NULL DEFAULT false,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSuggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GameSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameSuggestion_reviewed_createdAt_idx" ON "GameSuggestion"("reviewed", "createdAt");
CREATE INDEX "GameSuggestion_userId_createdAt_idx" ON "GameSuggestion"("userId", "createdAt");
