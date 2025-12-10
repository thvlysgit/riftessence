/*
  Warnings:

  - The `region` column on the `Community` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `CommunityMembership` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `RatingAppeal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `vcPreference` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `primaryRole` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `region` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `VerificationRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `userId` on table `DiscordAccount` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `result` on the `MatchHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `region` on the `RiotAccount` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FLEX');

-- CreateEnum
CREATE TYPE "VCPreference" AS ENUM ('ALWAYS', 'SOMETIMES', 'NEVER');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blocked_fk";

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blocker_fk";

-- DropForeignKey
ALTER TABLE "CommunityMembership" DROP CONSTRAINT "CommunityMembership_community_fk";

-- DropForeignKey
ALTER TABLE "CommunityMembership" DROP CONSTRAINT "CommunityMembership_user_fk";

-- DropForeignKey
ALTER TABLE "DiscordAccount" DROP CONSTRAINT "DiscordAccount_user_fk";

-- DropForeignKey
ALTER TABLE "MatchHistory" DROP CONSTRAINT "MatchHistory_user_fk";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_author_fk";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_rater_fk";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_receiver_fk";

-- DropForeignKey
ALTER TABLE "RatingAppeal" DROP CONSTRAINT "RatingAppeal_rating_fk";

-- DropForeignKey
ALTER TABLE "RatingAppeal" DROP CONSTRAINT "RatingAppeal_user_fk";

-- DropForeignKey
ALTER TABLE "RiotAccount" DROP CONSTRAINT "RiotAccount_user_fk";

-- DropForeignKey
ALTER TABLE "VerificationRequest" DROP CONSTRAINT "VerificationRequest_user_fk";

-- AlterTable
ALTER TABLE "Block" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Community" DROP COLUMN "region",
ADD COLUMN     "region" "Region",
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommunityMembership" DROP COLUMN "role",
ADD COLUMN     "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "joinedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DiscordAccount" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatchHistory" DROP COLUMN "result",
ADD COLUMN     "result" "MatchResult" NOT NULL,
ALTER COLUMN "matchDate" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RatingAppeal" DROP COLUMN "status",
ADD COLUMN     "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RiotAccount" ADD COLUMN     "verificationIconId" INTEGER,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "region",
ADD COLUMN     "region" "Region" NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "vcPreference",
ADD COLUMN     "vcPreference" "VCPreference" NOT NULL DEFAULT 'SOMETIMES',
DROP COLUMN "primaryRole",
ADD COLUMN     "primaryRole" "Role",
DROP COLUMN "region",
ADD COLUMN     "region" "Region";

-- AlterTable
ALTER TABLE "VerificationRequest" DROP COLUMN "status",
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "submittedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "_BadgeToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BadgeToUser_AB_unique" ON "_BadgeToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_BadgeToUser_B_index" ON "_BadgeToUser"("B");

-- CreateIndex
CREATE INDEX "Community_region_createdAt_idx" ON "Community"("region", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityMembership_communityId_role_idx" ON "CommunityMembership"("communityId", "role");

-- CreateIndex
CREATE INDEX "RatingAppeal_ratingId_status_idx" ON "RatingAppeal"("ratingId", "status");

-- CreateIndex
CREATE INDEX "RiotAccount_region_createdAt_idx" ON "RiotAccount"("region", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RiotAccount_puuid_region_key" ON "RiotAccount"("puuid", "region");

-- CreateIndex
CREATE INDEX "User_region_primaryRole_createdAt_idx" ON "User"("region", "primaryRole", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_status_idx" ON "VerificationRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "RiotAccount" ADD CONSTRAINT "RiotAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordAccount" ADD CONSTRAINT "DiscordAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchHistory" ADD CONSTRAINT "MatchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingAppeal" ADD CONSTRAINT "RatingAppeal_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingAppeal" ADD CONSTRAINT "RatingAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToUser" ADD CONSTRAINT "_BadgeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToUser" ADD CONSTRAINT "_BadgeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: Migration generator attempted to rename several indexes.
-- Those rename statements are removed here because the new indexes
-- are created above in this migration and the old index names may
-- not exist in the target/shadow database. Removing them prevents
-- failures when applying the migration to a fresh database.
