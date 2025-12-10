-- Add gameName and tagLine columns to RiotAccount
ALTER TABLE "RiotAccount" ADD COLUMN "gameName" TEXT;
ALTER TABLE "RiotAccount" ADD COLUMN "tagLine" TEXT;
