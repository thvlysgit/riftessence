ALTER TABLE "User" ALTER COLUMN "discordDmNotifications" SET DEFAULT true;

ALTER TABLE "DiscordDmQueue" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CHAT_PREVIEW';
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedTitle" TEXT;
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedDescription" TEXT;
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedColor" TEXT;
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedUrl" TEXT;
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedFooter" TEXT;
ALTER TABLE "DiscordDmQueue" ADD COLUMN "embedImageUrl" TEXT;

CREATE INDEX "DiscordDmQueue_kind_sent_createdAt_idx" ON "DiscordDmQueue"("kind", "sent", "createdAt");
