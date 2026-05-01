-- Create Developer API storage for public request intake, issued keys, and usage tracking.
CREATE TABLE "DeveloperApiApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "formResponses" JSONB NOT NULL,
    "priorityAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperApiApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeveloperApiRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "formResponses" JSONB NOT NULL,
    "priorityAccess" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperApiRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeveloperApiKey" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "label" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "DeveloperApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeveloperApiUsage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipHash" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperApiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeveloperApiKey_keyPrefix_key" ON "DeveloperApiKey"("keyPrefix");
CREATE UNIQUE INDEX "DeveloperApiKey_keyHash_key" ON "DeveloperApiKey"("keyHash");
CREATE INDEX "DeveloperApiApplication_priorityAccess_createdAt_idx" ON "DeveloperApiApplication"("priorityAccess", "createdAt");
CREATE INDEX "DeveloperApiRequest_applicationId_createdAt_idx" ON "DeveloperApiRequest"("applicationId", "createdAt");
CREATE INDEX "DeveloperApiRequest_priorityAccess_createdAt_idx" ON "DeveloperApiRequest"("priorityAccess", "createdAt");
CREATE INDEX "DeveloperApiKey_applicationId_isActive_idx" ON "DeveloperApiKey"("applicationId", "isActive");
CREATE INDEX "DeveloperApiKey_isPriority_createdAt_idx" ON "DeveloperApiKey"("isPriority", "createdAt");
CREATE INDEX "DeveloperApiUsage_applicationId_createdAt_idx" ON "DeveloperApiUsage"("applicationId", "createdAt");
CREATE INDEX "DeveloperApiUsage_apiKeyId_createdAt_idx" ON "DeveloperApiUsage"("apiKeyId", "createdAt");
CREATE INDEX "DeveloperApiUsage_endpoint_createdAt_idx" ON "DeveloperApiUsage"("endpoint", "createdAt");

ALTER TABLE "DeveloperApiRequest"
    ADD CONSTRAINT "DeveloperApiRequest_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "DeveloperApiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeveloperApiRequest"
    ADD CONSTRAINT "DeveloperApiRequest_apiKeyId_fkey"
    FOREIGN KEY ("apiKeyId") REFERENCES "DeveloperApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeveloperApiKey"
    ADD CONSTRAINT "DeveloperApiKey_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "DeveloperApiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeveloperApiUsage"
    ADD CONSTRAINT "DeveloperApiUsage_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "DeveloperApiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeveloperApiUsage"
    ADD CONSTRAINT "DeveloperApiUsage_apiKeyId_fkey"
    FOREIGN KEY ("apiKeyId") REFERENCES "DeveloperApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;