-- Create 20 mock duo posts for user thomas
-- First get the user ID
\set userId 'cmiex1b6e0000pb018vkuhtnx'

-- Insert 20 duo posts with variety
INSERT INTO "DuoPost" ("id", "userId", "role", "region", "description", "vcPreference", "duoType", "languages", "playstyles", "active", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, :'userId', 'TOP', 'EUW', 'Looking for chill duo partner to climb ranked!', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['aggressive', 'shotcaller'], true, NOW(), NOW()),
  (gen_random_uuid()::text, :'userId', 'JUNGLE', 'NA', 'Need a support main who can make plays', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid()::text, :'userId', 'MID', 'EUNE', 'Searching for long-term duo, let''s improve together', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid()::text, :'userId', 'ADC', 'KR', 'Want to play some normals and have fun', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
  (gen_random_uuid()::text, :'userId', 'SUPPORT', 'EUW', 'LF serious duo for challenger push', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
  (gen_random_uuid()::text, :'userId', 'TOP', 'NA', 'Casual player looking for friends to play with', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
  (gen_random_uuid()::text, :'userId', 'JUNGLE', 'EUNE', 'Need jungle main who can gank my lane', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  (gen_random_uuid()::text, :'userId', 'MID', 'KR', 'Looking for ADC to synergize with', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours'),
  (gen_random_uuid()::text, :'userId', 'ADC', 'EUW', 'Want duo who communicates well', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),
  (gen_random_uuid()::text, :'userId', 'SUPPORT', 'NA', 'Searching for someone to play clash with', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours'),
  (gen_random_uuid()::text, :'userId', 'TOP', 'EUNE', 'Need top laner for flex queue', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'),
  (gen_random_uuid()::text, :'userId', 'JUNGLE', 'KR', 'Looking for mid laner with good roams', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '11 hours', NOW() - INTERVAL '11 hours'),
  (gen_random_uuid()::text, :'userId', 'MID', 'EUW', 'Want aggressive support to dominate bot lane', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
  (gen_random_uuid()::text, :'userId', 'ADC', 'NA', 'LF duo for late night gaming sessions', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '13 hours', NOW() - INTERVAL '13 hours'),
  (gen_random_uuid()::text, :'userId', 'SUPPORT', 'EUNE', 'Need someone to help me improve', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '14 hours', NOW() - INTERVAL '14 hours'),
  (gen_random_uuid()::text, :'userId', 'TOP', 'KR', 'Looking for duo with positive mental', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '15 hours', NOW() - INTERVAL '15 hours'),
  (gen_random_uuid()::text, :'userId', 'JUNGLE', 'EUW', 'Want to spam ranked and climb fast', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '16 hours', NOW() - INTERVAL '16 hours'),
  (gen_random_uuid()::text, :'userId', 'MID', 'NA', 'Searching for duo partner for new season', 'NEVER', 'BOTH', ARRAY['en', 'es'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '17 hours', NOW() - INTERVAL '17 hours'),
  (gen_random_uuid()::text, :'userId', 'ADC', 'EUNE', 'Need someone who plays tanks', 'ALWAYS', 'SHORT_TERM', ARRAY['en'], ARRAY['aggressive', 'shotcaller'], true, NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours'),
  (gen_random_uuid()::text, :'userId', 'SUPPORT', 'KR', 'Looking for carry player to duo with', 'SOMETIMES', 'LONG_TERM', ARRAY['en', 'fr'], ARRAY['supportive', 'flexible'], true, NOW() - INTERVAL '19 hours', NOW() - INTERVAL '19 hours');

-- Show the created posts
SELECT COUNT(*) as total_posts FROM "DuoPost" WHERE "userId" = :'userId';
SELECT id, role, region, LEFT(description, 40) as description_preview, "createdAt"
FROM "DuoPost" 
WHERE "userId" = :'userId'
ORDER BY "createdAt" DESC
LIMIT 5;
