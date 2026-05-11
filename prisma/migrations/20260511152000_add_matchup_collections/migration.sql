-- CreateTable
CREATE TABLE "MatchupCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "role" "Role",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchupCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchupCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMatchupCollection" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMatchupCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchupCollection_userId_champion_idx" ON "MatchupCollection"("userId", "champion");

-- CreateIndex
CREATE INDEX "MatchupCollection_isPublic_updatedAt_idx" ON "MatchupCollection"("isPublic", "updatedAt");

-- CreateIndex
CREATE INDEX "MatchupCollection_champion_role_idx" ON "MatchupCollection"("champion", "role");

-- CreateIndex
CREATE UNIQUE INDEX "MatchupCollectionItem_collectionId_matchupId_key" ON "MatchupCollectionItem"("collectionId", "matchupId");

-- CreateIndex
CREATE INDEX "MatchupCollectionItem_matchupId_idx" ON "MatchupCollectionItem"("matchupId");

-- CreateIndex
CREATE INDEX "MatchupCollectionItem_collectionId_position_idx" ON "MatchupCollectionItem"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SavedMatchupCollection_userId_collectionId_key" ON "SavedMatchupCollection"("userId", "collectionId");

-- CreateIndex
CREATE INDEX "SavedMatchupCollection_userId_idx" ON "SavedMatchupCollection"("userId");

-- CreateIndex
CREATE INDEX "SavedMatchupCollection_collectionId_idx" ON "SavedMatchupCollection"("collectionId");

-- AddForeignKey
ALTER TABLE "MatchupCollection" ADD CONSTRAINT "MatchupCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupCollectionItem" ADD CONSTRAINT "MatchupCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MatchupCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupCollectionItem" ADD CONSTRAINT "MatchupCollectionItem_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMatchupCollection" ADD CONSTRAINT "SavedMatchupCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MatchupCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMatchupCollection" ADD CONSTRAINT "SavedMatchupCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
