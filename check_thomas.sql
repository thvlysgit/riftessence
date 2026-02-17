SELECT u.id, u.username, u."preferredRole", u."secondaryRole", u."primaryRole",
       ra.id as account_id, ra."summonerName", ra."isMain", ra."lastStatsUpdate"
FROM "User" u
LEFT JOIN "RiotAccount" ra ON ra."userId" = u.id
WHERE u.username = 'thomas';
