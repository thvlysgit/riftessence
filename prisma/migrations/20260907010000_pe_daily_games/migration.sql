ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'GAME_REWARD';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'LEGACY_CONVERSION';
ALTER TABLE "Wallet" ADD COLUMN "experience" INTEGER NOT NULL DEFAULT 0;
-- Preserve balances, purchases and ledger history. Legacy counters retain their
-- physical names and are exposed with PE names using Prisma @map.
UPDATE "Wallet" w SET "experience" = LEAST(2147483647, COALESCE((
  SELECT SUM(t."amount") FROM "WalletTransaction" t
  WHERE t."walletId" = w."id" AND t."type" = 'QUEST_REWARD' AND t."amount" > 0
), 0));
-- NOT VALID protects new writes without destroying or silently rewriting any
-- pre-existing inconsistent balance; admins can inspect and reconcile those.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_pe_nonnegative" CHECK ("prismaticEssence" >= 0) NOT VALID;
CREATE TABLE "GameRound" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "gameKey" TEXT NOT NULL, "day" TEXT NOT NULL, "championId" TEXT NOT NULL,
  "guesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "won" BOOLEAN NOT NULL DEFAULT false,
  "finished" BOOLEAN NOT NULL DEFAULT false, "rewardOffer" INTEGER NOT NULL,
  "rewardPaid" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameRound_reward_nonnegative" CHECK ("rewardOffer" >= 0 AND "rewardPaid" >= 0)
);
CREATE UNIQUE INDEX "GameRound_userId_gameKey_day_key" ON "GameRound"("userId", "gameKey", "day");
CREATE INDEX "GameRound_day_gameKey_won_idx" ON "GameRound"("day", "gameKey", "won");
CREATE TABLE "WalletOperation" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "key" TEXT NOT NULL, "fingerprint" TEXT NOT NULL, "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WalletOperation_userId_key_key" ON "WalletOperation"("userId", "key");
CREATE TABLE "EconomySettings" (
  "id" TEXT PRIMARY KEY DEFAULT 'global', "starterGrant" INTEGER NOT NULL DEFAULT 400,
  "dailyCheckin" INTEGER NOT NULL DEFAULT 60, "dailySocial" INTEGER NOT NULL DEFAULT 40,
  "championReward" INTEGER NOT NULL DEFAULT 60, "soundReward" INTEGER NOT NULL DEFAULT 60,
  "dailyGameCap" INTEGER NOT NULL DEFAULT 120, "gameRewardsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL, "updatedBy" TEXT,
  CONSTRAINT "EconomySettings_rewards_bounded" CHECK (
    "starterGrant" BETWEEN 0 AND 5000 AND "dailyCheckin" BETWEEN 0 AND 500
    AND "dailySocial" BETWEEN 0 AND 500 AND "championReward" BETWEEN 0 AND 500
    AND "soundReward" BETWEEN 0 AND 500 AND "dailyGameCap" BETWEEN 0 AND 1000)
);
INSERT INTO "EconomySettings" ("id", "updatedAt") VALUES ('global', CURRENT_TIMESTAMP);
CREATE INDEX "WalletTransaction_currency_createdAt_idx" ON "WalletTransaction"("currency", "createdAt");
ALTER TABLE "Ad" ADD COLUMN "requestCreditsSpent" INTEGER;
