ALTER TABLE "InputControlRule"
  ALTER COLUMN "surfaces" SET DEFAULT ARRAY['GLOBAL']::TEXT[];

UPDATE "InputControlRule"
SET "surfaces" = ARRAY['GLOBAL']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  'input-control-discord-invites',
  'input-control-twitch-links'
)
AND "surfaces" = ARRAY['DUO_POST']::TEXT[];
