-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTACT_REQUEST', 'FEEDBACK_RECEIVED', 'REPORT_RECEIVED', 'REPORT_ACCEPTED', 'REPORT_REJECTED', 'ADMIN_TEST');

-- AlterTable: Make type nullable first
ALTER TABLE "Notification" ALTER COLUMN "type" DROP NOT NULL;

-- AlterTable: Make fromUserId nullable
ALTER TABLE "Notification" ALTER COLUMN "fromUserId" DROP NOT NULL;

-- AlterTable: Add new columns
ALTER TABLE "Notification" ADD COLUMN "feedbackId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "reportId" TEXT;

-- Update existing notifications to use enum (convert string to enum)
UPDATE "Notification" SET "type" = 'CONTACT_REQUEST' WHERE "type" = 'CONTACT_REQUEST';

-- AlterTable: Change type column to use enum
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";
ALTER TABLE "Notification" ALTER COLUMN "type" SET NOT NULL;
