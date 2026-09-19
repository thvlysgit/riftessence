ALTER TABLE "Team"
ADD COLUMN "isScrimProfile" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ScrimProfile" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "defaultAverageRank" "Rank",
  "defaultDivision" TEXT,
  "defaultAverageLp" INTEGER,
  "opggMultisearchUrl" TEXT,
  "contactPreference" TEXT NOT NULL DEFAULT 'DISCORD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScrimProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScrimProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScrimProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScrimProfile_teamId_key" ON "ScrimProfile"("teamId");
CREATE INDEX "ScrimProfile_ownerId_createdAt_idx" ON "ScrimProfile"("ownerId", "createdAt");
