ALTER TABLE "ScrimPost"
ADD COLUMN "externalPostId" TEXT,
ADD COLUMN "externalContactUrl" TEXT;

CREATE UNIQUE INDEX "ScrimPost_source_externalPostId_key"
ON "ScrimPost"("source", "externalPostId");

CREATE TABLE "ScrimExternalTeam" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "managerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScrimExternalTeam_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScrimExternalTeam_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "DeveloperApiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScrimExternalTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScrimExternalTeam_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScrimExternalTeam_teamId_key" ON "ScrimExternalTeam"("teamId");
CREATE UNIQUE INDEX "ScrimExternalTeam_applicationId_externalId_key" ON "ScrimExternalTeam"("applicationId", "externalId");
CREATE INDEX "ScrimExternalTeam_managerUserId_createdAt_idx" ON "ScrimExternalTeam"("managerUserId", "createdAt");
