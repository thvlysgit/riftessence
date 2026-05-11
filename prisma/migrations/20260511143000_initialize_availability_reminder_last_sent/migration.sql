ALTER TABLE "Team"
  ALTER COLUMN "fillAvailabilitiesReminderLastSentAt" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "Team"
SET "fillAvailabilitiesReminderLastSentAt" = CURRENT_TIMESTAMP
WHERE "fillAvailabilitiesReminderLastSentAt" IS NULL;
