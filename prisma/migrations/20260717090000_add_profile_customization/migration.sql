ALTER TABLE "User"
ADD COLUMN "bioSlug" TEXT,
ADD COLUMN "profileBackgroundType" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN "profileBackgroundValue" TEXT,
ADD COLUMN "profileSongUrl" TEXT,
ADD COLUMN "profileSongTitle" TEXT,
ADD COLUMN "profileSocialLinks" JSONB;

CREATE UNIQUE INDEX "User_bioSlug_key" ON "User"("bioSlug");
CREATE INDEX "User_bioSlug_idx" ON "User"("bioSlug");
