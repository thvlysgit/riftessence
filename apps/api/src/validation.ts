import { z } from 'zod';

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6).max(128, 'Password too long'),
});

export const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

export const SetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(6).max(128, 'Password too long'),
});

// ============================================================
// POST SCHEMAS
// ============================================================

export const CreatePostSchema = z.object({
  userId: z.string().min(1),
  postingRiotAccountId: z.string().min(1),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL']),
  message: z.string().min(1).max(500, 'Message too long (max 500 characters)').optional(),
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
  userId: z.string().optional(),
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
