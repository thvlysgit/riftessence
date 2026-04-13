CREATE TYPE "WalletCurrency" AS ENUM ('RIFT_COINS', 'PRISMATIC_ESSENCE');

CREATE TYPE "WalletTransactionType" AS ENUM (
  'WELCOME_BONUS',
  'QUEST_REWARD',
  'SHOP_PURCHASE',
  'CONVERT_BUY_PRISMATIC',
  'CONVERT_SELL_PRISMATIC',
  'ADMIN_ADJUSTMENT'
);

CREATE TYPE "WalletQuestKey" AS ENUM (
  'DAILY_CHECKIN',
  'COMPLETE_PROFILE',
  'CREATE_FIRST_DUO_POST',
  'JOIN_FIRST_COMMUNITY'
);

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "riftCoins" INTEGER NOT NULL DEFAULT 0,
  "prismaticEssence" INTEGER NOT NULL DEFAULT 0,
  "totalRiftCoinsEarned" INTEGER NOT NULL DEFAULT 0,
  "totalRiftCoinsSpent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" "WalletCurrency" NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "unitPriceRc" INTEGER,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletQuestClaim" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questKey" "WalletQuestKey" NOT NULL,
  "claimWindow" TEXT NOT NULL,
  "rewardRiftCoins" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletQuestClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrismaticMarket" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "totalSupplyCap" INTEGER NOT NULL DEFAULT 1000000,
  "circulatingSupply" INTEGER NOT NULL DEFAULT 0,
  "basePriceRc" INTEGER NOT NULL DEFAULT 40,
  "slopeRc" INTEGER NOT NULL DEFAULT 320,
  "sellSpreadBps" INTEGER NOT NULL DEFAULT 700,
  "lastTradePriceRc" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PrismaticMarket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Wallet_riftCoins_idx" ON "Wallet"("riftCoins");
CREATE INDEX "Wallet_prismaticEssence_idx" ON "Wallet"("prismaticEssence");

CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");

CREATE UNIQUE INDEX "WalletQuestClaim_userId_questKey_claimWindow_key" ON "WalletQuestClaim"("userId", "questKey", "claimWindow");
CREATE INDEX "WalletQuestClaim_userId_createdAt_idx" ON "WalletQuestClaim"("userId", "createdAt");
CREATE INDEX "WalletQuestClaim_questKey_createdAt_idx" ON "WalletQuestClaim"("questKey", "createdAt");

ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletQuestClaim"
  ADD CONSTRAINT "WalletQuestClaim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
