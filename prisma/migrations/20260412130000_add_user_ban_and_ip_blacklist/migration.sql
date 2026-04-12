ALTER TABLE "User"
ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bannedAt" TIMESTAMP(3),
ADD COLUMN "bannedReason" TEXT,
ADD COLUMN "bannedById" TEXT,
ADD COLUMN "bannedIp" TEXT,
ADD COLUMN "lastKnownIp" TEXT;

CREATE INDEX "User_isBanned_createdAt_idx" ON "User"("isBanned", "createdAt");

CREATE TABLE "IpBlacklist" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "reason" TEXT,
  "sourceUserId" TEXT,
  "bannedById" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "liftedAt" TIMESTAMP(3),

  CONSTRAINT "IpBlacklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IpBlacklist_ipAddress_key" ON "IpBlacklist"("ipAddress");
CREATE INDEX "IpBlacklist_active_ipAddress_idx" ON "IpBlacklist"("active", "ipAddress");
CREATE INDEX "IpBlacklist_sourceUserId_active_idx" ON "IpBlacklist"("sourceUserId", "active");
