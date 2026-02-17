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
