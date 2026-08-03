-- Ensure every code-owned profile badge has an assignable database record.
INSERT INTO "Badge" ("id", "key", "name", "description")
VALUES
  ('canonical_badge_moderator', 'moderator', 'Moderator', 'RiftEssence community moderator'),
  ('canonical_badge_bug_hunter', 'bug-hunter', 'Bug Hunter', 'Helped identify and report issues'),
  ('canonical_badge_verified', 'verified', 'Verified', 'Verified RiftEssence account')
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
