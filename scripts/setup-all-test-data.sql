-- Update Riot account for user thomas
UPDATE "RiotAccount"
SET "gameName" = 'Thvlys', "tagLine" = '9099'
WHERE "userId" = 'cmiex1b6e0000pb018vkuhtnx'
AND id = 'cmiex1b6e0001pb01ez2vsnya';

-- Verify the update
SELECT id, "gameName", "tagLine", region FROM "RiotAccount" WHERE "userId" = 'cmiex1b6e0000pb018vkuhtnx';

-- Create 20 mock posts for user thomas  
INSERT INTO "Post" ("id", "authorId", "postingRiotAccountId", "region", "role", "message", "languages", "vcPreference", "duoType", "createdAt")
VALUES
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUW', 'TOP', 'Looking for chill duo partner to climb ranked!', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW()),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'NA', 'JUNGLE', 'Need a support main who can make plays', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUNE', 'MID', 'Searching for long-term duo, let''s improve together', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'KR', 'ADC', 'Want to play some normals and have fun', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '3 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUW', 'SUPPORT', 'LF serious duo for challenger push', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '4 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'NA', 'TOP', 'Casual player looking for friends to play with', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '5 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUNE', 'JUNGLE', 'Need jungle main who can gank my lane', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '6 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'KR', 'MID', 'Looking for ADC to synergize with', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '7 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUW', 'ADC', 'Want duo who communicates well', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '8 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'NA', 'SUPPORT', 'Searching for someone to play clash with', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '9 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUNE', 'TOP', 'Need top laner for flex queue', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '10 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'KR', 'JUNGLE', 'Looking for mid laner with good roams', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '11 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUW', 'MID', 'Want aggressive support to dominate bot lane', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '12 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'NA', 'ADC', 'LF duo for late night gaming sessions', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '13 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUNE', 'SUPPORT', 'Need someone to help me improve', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '14 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'KR', 'TOP', 'Looking for duo with positive mental', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '15 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUW', 'JUNGLE', 'Want to spam ranked and climb fast', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '16 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'NA', 'MID', 'Searching for duo partner for new season', ARRAY['en', 'es'], 'NEVER', 'BOTH', NOW() - INTERVAL '17 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'EUNE', 'ADC', 'Need someone who plays tanks', ARRAY['en'], 'ALWAYS', 'SHORT_TERM', NOW() - INTERVAL '18 hours'),
  (gen_random_uuid()::text, 'cmiex1b6e0000pb018vkuhtnx', 'cmiex1b6e0001pb01ez2vsnya', 'KR', 'SUPPORT', 'Looking for carry player to duo with', ARRAY['en', 'fr'], 'SOMETIMES', 'LONG_TERM', NOW() - INTERVAL '19 hours');

-- Show the created posts
SELECT COUNT(*) as total_posts FROM "Post" WHERE "authorId" = 'cmiex1b6e0000pb018vkuhtnx';
SELECT id, role, region, LEFT(message, 40) as message_preview, "createdAt"
FROM "Post" 
WHERE "authorId" = 'cmiex1b6e0000pb018vkuhtnx'
ORDER BY "createdAt" DESC
LIMIT 5;
