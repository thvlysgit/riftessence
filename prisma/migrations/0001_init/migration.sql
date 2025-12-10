-- Initial migration for RiftEssence schema
-- NOTE: This SQL is a best-effort mapping from the Prisma schema to PostgreSQL DDL.
CREATE TABLE "User" (
  id text PRIMARY KEY,
  email text UNIQUE,
  username text NOT NULL UNIQUE,
  name text,
  bio text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  anonymous boolean NOT NULL DEFAULT false,
  "vcPreference" text NOT NULL DEFAULT 'SOMETIMES',
  languages text[] NOT NULL DEFAULT ARRAY[]::text[],
  playstyles text[] NOT NULL DEFAULT ARRAY[]::text[],
  "primaryRole" text,
  region text,
  verified boolean NOT NULL DEFAULT false
);

CREATE INDEX "User_region_primaryRole_createdAt_idx" ON "User" (region, "primaryRole", "createdAt");

CREATE TABLE "RiotAccount" (
  id text PRIMARY KEY,
  puuid text NOT NULL,
  "summonerName" text NOT NULL,
  region text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "userId" text
);
ALTER TABLE "RiotAccount" ADD CONSTRAINT "RiotAccount_puuid_region_key" UNIQUE (puuid, region);
CREATE INDEX "RiotAccount_region_createdAt_idx" ON "RiotAccount" (region, "createdAt");

CREATE TABLE "DiscordAccount" (
  id text PRIMARY KEY,
  "discordId" text NOT NULL UNIQUE,
  username text,
  discriminator text,
  "userId" text UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Community" (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  region text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "Community_region_createdAt_idx" ON "Community" (region, "createdAt");

CREATE TABLE "CommunityMembership" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "communityId" text NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  "joinedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_user_community_unique" UNIQUE ("userId", "communityId");
CREATE INDEX "CommunityMembership_community_role_idx" ON "CommunityMembership" ("communityId", role);

CREATE TABLE "Post" (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "authorId" text,
  "externalDiscordId" text,
  anonymous boolean NOT NULL DEFAULT false
);
CREATE INDEX "Post_createdAt_idx" ON "Post" ("createdAt");
CREATE INDEX "Post_externalDiscordId_idx" ON "Post" ("externalDiscordId");

CREATE TABLE "Rating" (
  id text PRIMARY KEY,
  stars integer NOT NULL DEFAULT 0,
  moons integer NOT NULL DEFAULT 0,
  "sharedMatchesCount" integer NOT NULL DEFAULT 0,
  comment text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "raterId" text NOT NULL,
  "receiverId" text NOT NULL
);
CREATE INDEX "Rating_receiver_createdAt_idx" ON "Rating" ("receiverId", "createdAt");

CREATE TABLE "MatchHistory" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "opponentId" text NOT NULL,
  result text NOT NULL,
  "matchDate" timestamptz NOT NULL DEFAULT now(),
  "sharedMatchesCount" integer NOT NULL DEFAULT 1
);
CREATE INDEX "MatchHistory_user_matchDate_idx" ON "MatchHistory" ("userId", "matchDate");

CREATE TABLE "Block" (
  id text PRIMARY KEY,
  "blockerId" text NOT NULL,
  "blockedId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "Block" ADD CONSTRAINT "Block_blocker_blocked_unique" UNIQUE ("blockerId", "blockedId");
CREATE INDEX "Block_blocker_idx" ON "Block" ("blockerId");

CREATE TABLE "Badge" (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text
);

CREATE TABLE "VerificationRequest" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  "submittedAt" timestamptz NOT NULL DEFAULT now(),
  "resolvedAt" timestamptz,
  "reviewerId" text
);
CREATE INDEX "VerificationRequest_user_status_idx" ON "VerificationRequest" ("userId", status);

CREATE TABLE "RatingAppeal" (
  id text PRIMARY KEY,
  "ratingId" text NOT NULL,
  "userId" text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "RatingAppeal_rating_status_idx" ON "RatingAppeal" ("ratingId", status);

-- Foreign keys
ALTER TABLE "RiotAccount" ADD CONSTRAINT "RiotAccount_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "DiscordAccount" ADD CONSTRAINT "DiscordAccount_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_community_fk" FOREIGN KEY ("communityId") REFERENCES "Community"(id) ON DELETE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_author_fk" FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rater_fk" FOREIGN KEY ("raterId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_receiver_fk" FOREIGN KEY ("receiverId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "MatchHistory" ADD CONSTRAINT "MatchHistory_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blocker_fk" FOREIGN KEY ("blockerId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blocked_fk" FOREIGN KEY ("blockedId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "RatingAppeal" ADD CONSTRAINT "RatingAppeal_rating_fk" FOREIGN KEY ("ratingId") REFERENCES "Rating"(id) ON DELETE CASCADE;
ALTER TABLE "RatingAppeal" ADD CONSTRAINT "RatingAppeal_user_fk" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
