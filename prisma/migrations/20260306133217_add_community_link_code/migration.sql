-- CreateTable
CREATE TABLE "CommunityLinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityLinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLinkCode_code_key" ON "CommunityLinkCode"("code");

-- CreateIndex
CREATE INDEX "CommunityLinkCode_code_idx" ON "CommunityLinkCode"("code");

-- CreateIndex
CREATE INDEX "CommunityLinkCode_guildId_idx" ON "CommunityLinkCode"("guildId");
