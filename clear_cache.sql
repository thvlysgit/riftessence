UPDATE "RiotAccount" SET "lastStatsUpdate" = '2024-01-01 00:00:00' WHERE "userId" IN (SELECT id FROM "User" WHERE username LIKE 'TSS%');
