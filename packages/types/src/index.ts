import { z } from 'zod';

export type ID = string;

export const RiotAccount = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string().optional(),
  verified: z.boolean().optional(),
  verificationIconId: z.number().optional()
});
export type RiotAccount = z.infer<typeof RiotAccount>;

export const User = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  riot: RiotAccount.optional()
});
export type User = z.infer<typeof User>;

export const Rating = z.object({
  mmr: z.number().optional(),
  rank: z.string().optional()
});
export type Rating = z.infer<typeof Rating>;

export const Community = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional()
});
export type Community = z.infer<typeof Community>;

export const Match = z.object({
  id: z.string(),
  players: z.array(User),
  timestamp: z.string()
});
export type Match = z.infer<typeof Match>;

export const Post = z.object({
  id: z.string(),
  author: User,
  content: z.string(),
  createdAt: z.string(),
  community: Community.optional(),
  ratings: z.array(Rating).optional()
});
export type Post = z.infer<typeof Post>;

export const schemas = { User, RiotAccount, Post, Rating, Community, Match };
