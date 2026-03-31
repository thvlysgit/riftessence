-- Migration script to convert TeamMember roles from old Role enum to new TeamRole enum
-- Run this BEFORE doing prisma db push

-- Step 1: Delete any TeamMember records with FILL role (doesn't exist in TeamRole)
DELETE FROM "TeamMember" WHERE role = 'FILL';

-- Step 2: Add temporary column with text type
ALTER TABLE "TeamMember" ADD COLUMN role_temp TEXT;

-- Step 3: Copy and convert old role values to new ones
UPDATE "TeamMember" SET role_temp = 
  CASE 
    WHEN role::text = 'JUNGLE' THEN 'JGL'
    WHEN role::text = 'SUPPORT' THEN 'SUP'
    ELSE role::text  -- TOP, MID, ADC stay the same
  END;

-- Step 4: Drop old role column
ALTER TABLE "TeamMember" DROP COLUMN role;

-- Step 5: Rename temp column to role
ALTER TABLE "TeamMember" RENAME COLUMN role_temp TO role;

-- Now you can run: prisma db push --accept-data-loss
-- This will recreate the enum and set the correct type
