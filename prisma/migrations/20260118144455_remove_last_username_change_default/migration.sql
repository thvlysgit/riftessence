-- AlterTable
-- Remove default value from lastUsernameChange
-- Also set existing values to NULL for users who never actually changed their username
-- (all existing users have the creation timestamp due to the old default)
ALTER TABLE "User" ALTER COLUMN "lastUsernameChange" DROP DEFAULT;

-- Reset lastUsernameChange to NULL for all existing users
-- This gives everyone a "first free change" since the old default was incorrect
UPDATE "User" SET "lastUsernameChange" = NULL WHERE "lastUsernameChange" IS NOT NULL;
