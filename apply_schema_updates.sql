-- Add unique constraint on Rating (raterId, receiverId) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'Rating' AND constraint_name = 'Rating_raterId_receiverId_key'
  ) THEN
    ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_receiverId_key" UNIQUE ("raterId", "receiverId");
  END IF;
END $$;

-- Add index on raterId, receiverId, createdAt if it doesn't exist
CREATE INDEX IF NOT EXISTS "Rating_raterId_receiverId_createdAt_idx" ON "Rating" ("raterId", "receiverId", "createdAt");

-- Ensure index on receiverId, createdAt exists
CREATE INDEX IF NOT EXISTS "Rating_receiverId_createdAt_idx" ON "Rating" ("receiverId", "createdAt");

-- TeamDraft table for Team Draft Room persistence + Discord /send-draft integration
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
