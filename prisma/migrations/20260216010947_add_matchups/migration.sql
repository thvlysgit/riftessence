-- CreateEnum
CREATE TYPE "MatchupDifficulty" AS ENUM ('FREE_WIN', 'VERY_FAVORABLE', 'FAVORABLE', 'SKILL_MATCHUP', 'HARD', 'VERY_HARD', 'FREE_LOSE');

-- CreateTable
CREATE TABLE "Matchup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "myChampion" TEXT NOT NULL,
    "enemyChampion" TEXT NOT NULL,
    "difficulty" "MatchupDifficulty" NOT NULL DEFAULT 'SKILL_MATCHUP',
    "laningNotes" TEXT,
    "teamfightNotes" TEXT,
    "itemNotes" TEXT,
    "spikeNotes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupLike" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLike" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchupLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Matchup_userId_myChampion_idx" ON "Matchup"("userId", "myChampion");

-- CreateIndex
CREATE INDEX "Matchup_isPublic_createdAt_idx" ON "Matchup"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "Matchup_role_myChampion_idx" ON "Matchup"("role", "myChampion");

-- CreateIndex
CREATE INDEX "MatchupLike_matchupId_isLike_idx" ON "MatchupLike"("matchupId", "isLike");

-- CreateIndex
CREATE UNIQUE INDEX "MatchupLike_userId_matchupId_key" ON "MatchupLike"("userId", "matchupId");

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupLike" ADD CONSTRAINT "MatchupLike_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupLike" ADD CONSTRAINT "MatchupLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
