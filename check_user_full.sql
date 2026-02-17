SELECT u.id, u.username, u."preferredRole", u."secondaryRole",
       (SELECT COUNT(*) FROM "RiotAccount" WHERE "userId" = u.id) as account_count
FROM "User" u 
WHERE u.username LIKE 'TSS%';
