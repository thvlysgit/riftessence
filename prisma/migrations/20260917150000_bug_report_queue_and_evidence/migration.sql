ALTER TABLE "Report"
  ADD COLUMN "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "contactDiscord" TEXT;

CREATE TABLE "BugReport" (
  "id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pageUrl" TEXT,
  "userAgent" TEXT,
  "reporterId" TEXT,
  "contactDiscord" TEXT,
  "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "discordMessageId" TEXT,
  "forwardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");
CREATE INDEX "BugReport_discordMessageId_createdAt_idx" ON "BugReport"("discordMessageId", "createdAt");

ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BugReportSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "discordChannelId" TEXT NOT NULL DEFAULT '1374090454194323526',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "BugReportSettings_pkey" PRIMARY KEY ("id")
);
