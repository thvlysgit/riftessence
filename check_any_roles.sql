SELECT id, username, "preferredRole", "secondaryRole", "primaryRole"
FROM "User" 
WHERE "preferredRole" IS NOT NULL OR "secondaryRole" IS NOT NULL OR "primaryRole" IS NOT NULL
LIMIT 10;
