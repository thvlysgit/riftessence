-- Apply the notification schema changes after the Notification table exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('CONTACT_REQUEST', 'FEEDBACK_RECEIVED', 'REPORT_RECEIVED', 'REPORT_ACCEPTED', 'REPORT_REJECTED', 'ADMIN_TEST');
  END IF;
END $$;

ALTER TABLE "Notification" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "fromUserId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "feedbackId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "reportId" TEXT;
UPDATE "Notification" SET "type" = 'CONTACT_REQUEST' WHERE "type" = 'CONTACT_REQUEST';
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";
ALTER TABLE "Notification" ALTER COLUMN "type" SET NOT NULL;