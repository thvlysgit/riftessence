DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrimDiscordNotificationType') THEN
    CREATE TYPE "ScrimDiscordNotificationType" AS ENUM (
      'PROPOSAL_RECEIVED',
      'PROPOSAL_ACCEPTED',
      'PROPOSAL_REJECTED',
      'PROPOSAL_DELAYED',
      'PROPOSAL_AUTO_REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ScrimDiscordNotification" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "recipientDiscordId" TEXT NOT NULL,
  "type" "ScrimDiscordNotificationType" NOT NULL,
  "message" TEXT NOT NULL,
  "actionRequired" BOOLEAN NOT NULL DEFAULT false,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScrimDiscordNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScrimDiscordNotification_processed_createdAt_idx"
  ON "ScrimDiscordNotification"("processed", "createdAt");

CREATE INDEX IF NOT EXISTS "ScrimDiscordNotification_recipientDiscordId_processed_idx"
  ON "ScrimDiscordNotification"("recipientDiscordId", "processed");

CREATE INDEX IF NOT EXISTS "ScrimDiscordNotification_proposalId_recipientUserId_type_idx"
  ON "ScrimDiscordNotification"("proposalId", "recipientUserId", "type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScrimDiscordNotification_proposalId_fkey'
  ) THEN
    ALTER TABLE "ScrimDiscordNotification"
      ADD CONSTRAINT "ScrimDiscordNotification_proposalId_fkey"
      FOREIGN KEY ("proposalId") REFERENCES "ScrimProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
