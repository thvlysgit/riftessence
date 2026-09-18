ALTER TYPE "WalletTransactionType" ADD VALUE 'AD_PURCHASE';
ALTER TYPE "WalletTransactionType" ADD VALUE 'AD_REFUND';

ALTER TABLE "Ad"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "impressionBudget" INTEGER,
  ADD COLUMN "remainingImpressions" INTEGER,
  ADD COLUMN "peSpent" INTEGER NOT NULL DEFAULT 0;

UPDATE "Ad" SET "reviewStatus" = 'PENDING'
WHERE "isActive" = false AND "requestCreditsSpent" IS NOT NULL;

CREATE INDEX "Ad_reviewStatus_createdAt_idx" ON "Ad"("reviewStatus", "createdAt");

CREATE TABLE "AdPurchase" (
  "id" TEXT NOT NULL,
  "adId" TEXT NOT NULL,
  "purchaserId" TEXT NOT NULL,
  "peAmount" INTEGER NOT NULL,
  "impressions" INTEGER NOT NULL,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdPurchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdPurchase_adId_createdAt_idx" ON "AdPurchase"("adId", "createdAt");
CREATE INDEX "AdPurchase_purchaserId_createdAt_idx" ON "AdPurchase"("purchaserId", "createdAt");
CREATE INDEX "AdPurchase_createdAt_idx" ON "AdPurchase"("createdAt");
