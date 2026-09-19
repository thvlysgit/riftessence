CREATE TABLE "ScrimDiscordMessage" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "syncedPostUpdatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScrimDiscordMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScrimDiscordMessage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ScrimPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScrimDiscordMessage_postId_channelId_key"
ON "ScrimDiscordMessage"("postId", "channelId");

CREATE UNIQUE INDEX "ScrimDiscordMessage_channelId_messageId_key"
ON "ScrimDiscordMessage"("channelId", "messageId");

CREATE INDEX "ScrimDiscordMessage_postId_syncedPostUpdatedAt_idx"
ON "ScrimDiscordMessage"("postId", "syncedPostUpdatedAt");
