-- Add Discord DM notifications opt-in field to User
ALTER TABLE "User" ADD COLUMN "discordDmNotifications" BOOLEAN NOT NULL DEFAULT false;

-- Create DiscordDmQueue table for queuing DM notifications to be sent by the bot
CREATE TABLE "DiscordDmQueue" (
    "id" TEXT NOT NULL,
    "recipientDiscordId" TEXT NOT NULL,
    "senderUsername" TEXT NOT NULL,
    "messagePreview" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordDmQueue_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient polling by the Discord bot
CREATE INDEX "DiscordDmQueue_sent_createdAt_idx" ON "DiscordDmQueue"("sent", "createdAt");
CREATE INDEX "DiscordDmQueue_recipientDiscordId_sent_idx" ON "DiscordDmQueue"("recipientDiscordId", "sent");
