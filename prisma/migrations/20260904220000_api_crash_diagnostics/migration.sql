-- Persist API failures and process lifetimes so an automatic container restart
-- does not erase the evidence administrators need for diagnosis.
CREATE TABLE "SystemIncident" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "requestId" TEXT,
    "userId" TEXT,
    "instanceKey" TEXT,
    "release" TEXT,
    "metadata" JSONB,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiProcessRun" (
    "id" TEXT NOT NULL,
    "instanceKey" TEXT NOT NULL,
    "release" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    "rssMb" INTEGER,
    "heapUsedMb" INTEGER,
    "heapTotalMb" INTEGER,
    "externalMb" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiProcessRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemIncident_fingerprint_key" ON "SystemIncident"("fingerprint");
CREATE INDEX "SystemIncident_status_severity_lastSeenAt_idx" ON "SystemIncident"("status", "severity", "lastSeenAt");
CREATE INDEX "SystemIncident_userId_lastSeenAt_idx" ON "SystemIncident"("userId", "lastSeenAt");
CREATE INDEX "SystemIncident_route_lastSeenAt_idx" ON "SystemIncident"("route", "lastSeenAt");
CREATE INDEX "SystemIncident_kind_lastSeenAt_idx" ON "SystemIncident"("kind", "lastSeenAt");
CREATE INDEX "ApiProcessRun_instanceKey_status_idx" ON "ApiProcessRun"("instanceKey", "status");
CREATE INDEX "ApiProcessRun_startedAt_idx" ON "ApiProcessRun"("startedAt");
CREATE INDEX "ApiProcessRun_status_heartbeatAt_idx" ON "ApiProcessRun"("status", "heartbeatAt");
