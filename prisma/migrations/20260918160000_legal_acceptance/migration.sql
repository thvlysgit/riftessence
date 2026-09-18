ALTER TABLE "User"
  ADD COLUMN "legalAcceptedVersion" TEXT,
  ADD COLUMN "legalAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "legalAgeGroup" TEXT;

ALTER TABLE "User" ALTER COLUMN "discordDmNotifications" SET DEFAULT false;

-- Existing users must review the documents; never fabricate historical acceptance.
CREATE TABLE "LegalAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locale" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "ageGroup" TEXT NOT NULL,
  "termsAccepted" BOOLEAN NOT NULL,
  "privacyAcknowledged" BOOLEAN NOT NULL,
  "eligibilityConfirmed" BOOLEAN NOT NULL,
  CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LegalAcceptance_userId_version_key" ON "LegalAcceptance"("userId", "version");
