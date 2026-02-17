import { z } from 'zod';

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

export const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

export const SetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

// ============================================================
// POST SCHEMAS
// ============================================================

export const CreatePostSchema = z.object({
  userId: z.string().min(1),
  postingRiotAccountId: z.string().min(1),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL']),
  secondRole: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL']).optional(),
  message: z.string().max(500, 'Message too long (max 500 characters)').transform(val => val === '' ? undefined : val).optional(),
  languages: z.array(z.string()).default([]),
  vcPreference: z.enum(['ALWAYS', 'SOMETIMES', 'NEVER']),
  duoType: z.enum(['SHORT_TERM', 'LONG_TERM', 'BOTH']),
  communityId: z.string().optional(),
});

// ============================================================
// RIOT VERIFICATION SCHEMAS
// ============================================================

export const VerifyRiotSchema = z.object({
  summonerName: z.string().min(1).max(100),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  verificationIconId: z.number().int().min(0),
  userId: z.string().optional().nullable(),
});

export const RiotLookupSchema = z.object({
  summonerName: z.string().min(1).max(100),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
});

// ============================================================
// RATING/FEEDBACK SCHEMAS
// ============================================================

export const RatingSchema = z.object({
  receiverId: z.string().min(1),
  stars: z.number().int().min(0).max(5).optional(),
  moons: z.number().int().min(0).max(5).optional(),
  comment: z.string().max(300, 'Comment too long (max 300 characters)').optional(),
  raterId: z.string().min(1).optional(),
  sharedMatchesCount: z.number().int().min(1).optional(),
});

// ============================================================
// REPORT SCHEMAS
// ============================================================

export const ReportSchema = z.object({
  reportedId: z.string().min(1),
  reason: z.string().min(10).max(500, 'Reason too long (max 500 characters)'),
  reporterId: z.string().min(1).optional(),
});

// ============================================================
// LFT SCHEMAS
// ============================================================

export const CreateTeamLftSchema = z.object({
  userId: z.string().min(1),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  teamName: z.string().min(1).max(100),
  rolesNeeded: z.array(z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'])).optional(),
  averageRank: z.string().optional(),
  averageDivision: z.string().optional(),
  scrims: z.boolean().optional(),
  minAvailability: z.string().optional(),
  coachingAvailability: z.enum(['DEDICATED_COACH', 'FREQUENT', 'OCCASIONAL', 'NONE']).optional(),
  details: z.string().max(500, 'Details too long (max 500 characters)').optional(),
  discordUsername: z.string().max(50).optional(),
});

export const CreatePlayerLftSchema = z.object({
  userId: z.string().min(1),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  mainRole: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']).optional(),
  rank: z.string().optional(),
  division: z.string().optional(),
  experience: z.enum(['FIRST_TEAM', 'A_LITTLE_EXPERIENCE', 'EXPERIMENTED']).optional(),
  languages: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  age: z.number().int().min(13).max(100).optional(),
  availability: z.string().optional(),
  discordUsername: z.string().max(50).optional(),
});

// ============================================================
// COACHING SCHEMAS
// ============================================================

export const CreateCoachingPostSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['OFFERING', 'SEEKING']),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  roles: z.array(z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'])).default([]),
  languages: z.array(z.string()).default([]),
  availability: z.enum(['ONCE_A_WEEK', 'TWICE_A_WEEK', 'THRICE_A_WEEK', 'FOUR_TIMES_A_WEEK', 'EVERYDAY']).optional(),
  details: z.string().max(1000, 'Details too long (max 1000 characters)').optional(),
  discordTag: z.string().max(50).optional(),
  // Offering-specific fields
  coachRank: z.enum(['EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']).optional(),
  coachDivision: z.string().max(10).optional(),
  specializations: z.array(z.string()).default([]),
}).refine(
  (data) => {
    // If type is OFFERING, coachRank must be present and Emerald or higher
    if (data.type === 'OFFERING') {
      return data.coachRank && ['EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(data.coachRank);
    }
    return true;
  },
  {
    message: 'OFFERING posts require a coach rank of EMERALD or higher',
    path: ['coachRank'],
  }
);

// ============================================================
// PROFILE UPDATE SCHEMAS
// ============================================================

export const UpdateProfileSchema = z.object({
  bio: z.string().max(200, 'Bio too long (max 200 characters)').optional(),
  anonymous: z.boolean().optional(),
  vcPreference: z.enum(['ALWAYS', 'SOMETIMES', 'NEVER']).optional(),
  playstyles: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  primaryRole: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL']).optional(),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']).optional(),
});

// ============================================================
// CAPTCHA VERIFICATION SCHEMA
// ============================================================

export const TurnstileVerifySchema = z.object({
  token: z.string().min(1),
  remoteip: z.string().optional(),
});

// ============================================================
// Helper function to safely parse and return errors
// ============================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _: 'Validation failed' } };
  }
}

// ============================================================
// ADMIN BROADCAST SCHEMA
// ============================================================

export const BroadcastMessageSchema = z.object({
  content: z.string().min(10, 'Message too short').max(2000, 'Message too long'),
});

// ============================================================
// PAGINATION SCHEMA
// ============================================================

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

// ============================================================
// MATCHUP SCHEMAS
// ============================================================

export const CreateMatchupSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL']),
  myChampion: z.string().min(1).max(50),
  enemyChampion: z.string().min(1).max(50),
  difficulty: z.enum(['FREE_WIN', 'VERY_FAVORABLE', 'FAVORABLE', 'SKILL_MATCHUP', 'HARD', 'VERY_HARD', 'FREE_LOSE']).default('SKILL_MATCHUP'),
  laningNotes: z.string().max(2000).optional(),
  teamfightNotes: z.string().max(2000).optional(),
  itemNotes: z.string().max(2000).optional(),
  spikeNotes: z.string().max(2000).optional(),
  isPublic: z.boolean().default(false),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const UpdateMatchupSchema = CreateMatchupSchema.partial().omit({ userId: true });

export const MatchupQuerySchema = z.object({
  userId: z.string().optional(),
  myChampion: z.string().optional(),
  role: z.string().optional(),
  limit: z.preprocess((val) => Number(val), z.number().min(1).max(100)).default(20),
  offset: z.preprocess((val) => Number(val), z.number().min(0)).default(0),
});

export const PublicMatchupQuerySchema = z.object({
  myChampion: z.string().optional(),
  enemyChampion: z.string().optional(),
  role: z.string().optional(),
  difficulty: z.string().optional(),
  sortBy: z.enum(['newest', 'mostLiked', 'mostDownloaded']).default('newest'),
  limit: z.preprocess((val) => Number(val), z.number().min(1).max(100)).default(20),
  offset: z.preprocess((val) => Number(val), z.number().min(0)).default(0),
});
