-- RenameIndex
ALTER INDEX "Block_blocker_blocked_unique" RENAME TO "Block_blockerId_blockedId_key";

-- RenameIndex
ALTER INDEX "Block_blocker_idx" RENAME TO "Block_blockerId_idx";

-- RenameIndex
ALTER INDEX "CommunityMembership_user_community_unique" RENAME TO "CommunityMembership_userId_communityId_key";

-- RenameIndex
ALTER INDEX "MatchHistory_user_matchDate_idx" RENAME TO "MatchHistory_userId_matchDate_idx";

-- RenameIndex
ALTER INDEX "Rating_receiver_createdAt_idx" RENAME TO "Rating_receiverId_createdAt_idx";
