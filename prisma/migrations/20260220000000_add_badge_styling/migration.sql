-- AlterTable
ALTER TABLE "Badge" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '🏆',
ADD COLUMN "bgColor" TEXT NOT NULL DEFAULT 'rgba(96, 165, 250, 0.20)',
ADD COLUMN "borderColor" TEXT NOT NULL DEFAULT '#60A5FA',
ADD COLUMN "textColor" TEXT NOT NULL DEFAULT '#93C5FD',
ADD COLUMN "hoverBg" TEXT NOT NULL DEFAULT 'rgba(96, 165, 250, 0.30)';

-- Update existing badges with their appropriate styles
UPDATE "Badge" SET 
  icon = '🛡️',
  bgColor = 'rgba(239, 68, 68, 0.20)',
  borderColor = '#EF4444',
  textColor = '#F87171',
  hoverBg = 'rgba(239, 68, 68, 0.30)'
WHERE key = 'admin';

UPDATE "Badge" SET 
  icon = '👨‍💼',
  bgColor = 'rgba(167, 139, 250, 0.20)',
  borderColor = '#A78BFA',
  textColor = '#A78BFA',
  hoverBg = 'rgba(167, 139, 250, 0.30)'
WHERE key = 'staff';

UPDATE "Badge" SET 
  icon = '🌟',
  bgColor = 'rgba(96, 165, 250, 0.20)',
  borderColor = '#60A5FA',
  textColor = '#93C5FD',
  hoverBg = 'rgba(96, 165, 250, 0.30)'
WHERE key = 'veteran';
