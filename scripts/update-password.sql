-- Set password for user thomas
-- Hash for "T01102007b" generated with bcrypt (10 rounds)
UPDATE "User" 
SET password = '$2a$10$H8fzOxxjshOkdBSJsi/N2euCnF2V8v9cl.qMjIPRTE27pN0RXlwfG'
WHERE username = 'thomas';

-- Verify the update
SELECT id, username, email, verified 
FROM "User" 
WHERE username = 'thomas';
