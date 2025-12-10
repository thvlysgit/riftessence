-- CreateEnum
CREATE TYPE "LftPostType" AS ENUM ('TEAM', 'PLAYER');

-- CreateEnum
CREATE TYPE "TeamExperience" AS ENUM ('FIRST_TEAM', 'A_LITTLE_EXPERIENCE', 'EXPERIMENTED');

-- CreateEnum
CREATE TYPE "CoachingAvailability" AS ENUM ('DEDICATED_COACH', 'FREQUENT', 'OCCASIONAL', 'NONE');

-- CreateEnum
CREATE TYPE "TeamAvailability" AS ENUM ('ONCE_A_WEEK', 'TWICE_A_WEEK', 'THRICE_A_WEEK', 'FOUR_TIMES_A_WEEK', 'EVERYDAY');

-- CreateTable
CREATE TABLE "LftPost" (
    "id" TEXT NOT NULL,
    "type" "LftPostType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "teamName" TEXT,
    "rolesNeeded" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "averageRank" "Rank",
    "averageDivision" TEXT,
    "scrims" BOOLEAN,
    "minAvailability" "TeamAvailability",
    "coachingAvailability" "CoachingAvailability",
    "details" TEXT,
    "mainRole" "Role",
    "rank" "Rank",
    "division" TEXT,
    "experience" "TeamExperience",
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "age" INTEGER,
    "availability" "TeamAvailability",

    CONSTRAINT "LftPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LftPost_type_createdAt_idx" ON "LftPost"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LftPost_authorId_idx" ON "LftPost"("authorId");

-- CreateIndex
CREATE INDEX "LftPost_region_type_createdAt_idx" ON "LftPost"("region", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "LftPost" ADD CONSTRAINT "LftPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
