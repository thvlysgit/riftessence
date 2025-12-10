-- Drop existing constraints and old columns from Post
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_authorId_fkey";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "title";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "content";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "externalDiscordId";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "anonymous";

-- Make authorId NOT NULL and add cascade delete
ALTER TABLE "Post" ALTER COLUMN "authorId" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "postingRiotAccountId" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "region" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "vcPreference" SET NOT NULL;

-- Add new foreign key with cascade
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old indexes
DROP INDEX IF EXISTS "Post_externalDiscordId_idx";

-- Create new indexes
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX IF NOT EXISTS "Post_region_role_createdAt_idx" ON "Post"("region", "role", "createdAt");

-- Create Notification table
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "postId" TEXT,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Notification
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
