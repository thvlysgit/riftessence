-- Add hidden column to RiotAccount
ALTER TABLE "RiotAccount" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
