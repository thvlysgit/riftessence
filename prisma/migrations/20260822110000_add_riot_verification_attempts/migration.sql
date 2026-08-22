CREATE TABLE "RiotVerificationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "summonerName" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "targetIconId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
    "riotAccountId" TEXT,
    "startedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "observedAt5" TIMESTAMP(3),
    "observedAt15" TIMESTAMP(3),
    "observedAt30" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiotVerificationAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RiotVerificationAttempt"
  ADD CONSTRAINT "RiotVerificationAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RiotVerificationAttempt_userId_status_idx" ON "RiotVerificationAttempt"("userId", "status");
CREATE INDEX "RiotVerificationAttempt_status_nextCheckAt_idx" ON "RiotVerificationAttempt"("status", "nextCheckAt");
CREATE INDEX "RiotVerificationAttempt_puuid_region_status_idx" ON "RiotVerificationAttempt"("puuid", "region", "status");
