CREATE TYPE "InputControlRuleKind" AS ENUM ('WORD', 'PHRASE', 'PREFIX', 'REGEX');

CREATE TABLE "InputControlRule" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" "InputControlRuleKind" NOT NULL DEFAULT 'PHRASE',
  "pattern" TEXT NOT NULL,
  "reason" TEXT,
  "blockMessage" TEXT,
  "surfaces" TEXT[] NOT NULL DEFAULT ARRAY['DUO_POST']::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InputControlRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InputControlRule_enabled_kind_idx" ON "InputControlRule"("enabled", "kind");
CREATE INDEX "InputControlRule_createdAt_idx" ON "InputControlRule"("createdAt");

INSERT INTO "InputControlRule" (
  "id",
  "label",
  "kind",
  "pattern",
  "reason",
  "blockMessage",
  "surfaces",
  "enabled",
  "updatedAt"
) VALUES
  (
    'input-control-discord-invites',
    'Discord invite advertising',
    'PREFIX',
    'discord.gg/',
    'External community advertising',
    'This post looks like advertising and was blocked.',
    ARRAY['DUO_POST']::TEXT[],
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'input-control-twitch-links',
    'Twitch channel advertising',
    'PREFIX',
    'twitch.tv/',
    'External channel advertising',
    'This post looks like advertising and was blocked.',
    ARRAY['DUO_POST']::TEXT[],
    true,
    CURRENT_TIMESTAMP
  );
