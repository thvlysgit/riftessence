-- Add notification types for scrim series lifecycle updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_SERIES_ACCEPTED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_SERIES_ACCEPTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_MATCH_CODE_REGENERATED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_MATCH_CODE_REGENERATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_RESULT_AUTO_CONFIRMED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_RESULT_AUTO_CONFIRMED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_RESULT_MANUAL_CONFIRMED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_RESULT_MANUAL_CONFIRMED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_RESULT_MANUAL_REQUIRED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_RESULT_MANUAL_REQUIRED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'SCRIM_RESULT_CONFLICT_ESCALATION'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SCRIM_RESULT_CONFLICT_ESCALATION';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimAutoResultStatus') THEN
    CREATE TYPE "ScrimAutoResultStatus" AS ENUM (
      'PENDING',
      'READY',
      'RUNNING',
      'CONFIRMED',
      'MANUAL_REQUIRED',
      'FAILED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimResultSource') THEN
    CREATE TYPE "ScrimResultSource" AS ENUM (
      'MANUAL_AGREEMENT',
      'AUTO_RIOT'
    );
  END IF;
END $$;

-- Team-level optional override for scrim-code forwarding channel
ALTER TABLE IF EXISTS "Team"
  ADD COLUMN IF NOT EXISTS "discordScrimCodeWebhookUrl" TEXT;

-- Scrim series lifecycle and auto-resolution tracking
ALTER TABLE IF EXISTS "ScrimSeries"
  ADD COLUMN IF NOT EXISTS "matchCodeVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "matchCodeRegeneratedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "matchCodeRegeneratedByTeamId" TEXT,
  ADD COLUMN IF NOT EXISTS "lobbyCodeUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lobbyCodeUsedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "resultSource" "ScrimResultSource",
  ADD COLUMN IF NOT EXISTS "autoResultStatus" "ScrimAutoResultStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "autoResultReadyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoResultAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "autoResultLastCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoResultFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "autoResultMatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "manualConflictCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ScrimSeries_autoResultStatus_autoResultReadyAt_idx"
  ON "ScrimSeries"("autoResultStatus", "autoResultReadyAt");
