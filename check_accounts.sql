SELECT ra.id, ra."userId", ra."lastStatsUpdate", u.username 
FROM "RiotAccount" ra 
JOIN "User" u ON ra."userId" = u.id 
WHERE u.username LIKE 'TSS%';
