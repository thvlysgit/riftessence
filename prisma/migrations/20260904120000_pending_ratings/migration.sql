ALTER TABLE "RiotVerificationAttempt" ALTER COLUMN "userId" DROP NOT NULL;

-- A guest author identity must not reserve a RiotAccount or block future signup.
CREATE TABLE "GuestRatingIdentity" (
  "puuid" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "GuestRatingIdentity_pkey" PRIMARY KEY ("puuid"),
  CONSTRAINT "GuestRatingIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GuestRatingIdentity_userId_key" ON "GuestRatingIdentity"("userId");

CREATE TABLE "PendingRating" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "stars" INTEGER,
  "moons" INTEGER,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "failureReason" TEXT,
  "ratingId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "nextPublishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PendingRating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendingRating_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "RiotVerificationAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PendingRating_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PendingRating_scores_check" CHECK (("stars" IS NULL OR "stars" BETWEEN 1 AND 5) AND ("moons" IS NULL OR "moons" BETWEEN 1 AND 5))
);
CREATE UNIQUE INDEX "PendingRating_ratingId_key" ON "PendingRating"("ratingId");
CREATE UNIQUE INDEX "PendingRating_attemptId_receiverId_key" ON "PendingRating"("attemptId", "receiverId");
CREATE INDEX "PendingRating_status_nextPublishAt_idx" ON "PendingRating"("status", "nextPublishAt");
