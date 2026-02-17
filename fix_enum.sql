-- Clear stats cache to force role detection
UPDATE "RiotAccount" SET "lastStatsUpdate" = NULL;

-- Update TeamExperience enum
ALTER TYPE "TeamExperience" RENAME TO "TeamExperience_old";

CREATE TYPE "TeamExperience" AS ENUM ('FIRST_TEAM', 'SOME_EXPERIENCE', 'MODERATE', 'EXPERIENCED', 'VERY_EXPERIENCED');

ALTER TABLE "LftPost" ALTER COLUMN experience TYPE "TeamExperience" USING experience::text::"TeamExperience";

DROP TYPE "TeamExperience_old";
