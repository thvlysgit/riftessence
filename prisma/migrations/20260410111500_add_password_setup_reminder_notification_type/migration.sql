DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'PASSWORD_SETUP_REMINDER'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_SETUP_REMINDER';
  END IF;
END $$;
