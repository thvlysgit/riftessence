-- Team draft persistence for Discord /send-draft flow
-- Run this against the same PostgreSQL database used by RiftEssence.

CREATE TABLE IF NOT EXISTS "TeamDraft" (
  "id" TEXT PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "blueBans" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "redBans" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "picks" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamDraft_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamDraft_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TeamDraft_teamId_updatedAt_idx"
  ON "TeamDraft" ("teamId", "updatedAt");

CREATE INDEX IF NOT EXISTS "TeamDraft_createdById_updatedAt_idx"
  ON "TeamDraft" ("createdById", "updatedAt");
