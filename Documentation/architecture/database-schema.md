# Database Schema

> Last updated: 2026-02-16  
> Source: `prisma/schema.prisma` (~680 lines)

## Models (21 total)

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| **User** | Core user: auth, profile, champion pool, playstyles, roles, region | → RiotAccount[], Post[], CoachingPost[], Rating[], Badge[], Community[], Conversation[], Message[] |
| **RiotAccount** | Riot Games account: PUUID, rank, winrate, verification | → User |
| **DiscordAccount** | Linked Discord identity | → User |
| **Post** | Duo finder post: role, region, message, VC pref, duo type | → User, RiotAccount, Community |
| **LftPost** | Team/player LFT post (polymorphic: TEAM or PLAYER) | → User, RiotAccount |
| **CoachingPost** | Coaching post (OFFERING or SEEKING, Emerald+ for offers) | → User, Community |
| **Community** | Communities with language, regions, Discord link | → Memberships[], DiscordFeedChannel[], CoachingPost[] |
| **CommunityMembership** | User ↔ Community with role (MEMBER/MOD/ADMIN) | → User, Community |
| **Conversation** | 1-to-1 chat conversations with unread counts | → User (user1 + user2), Message[] |
| **Message** | Individual chat messages with read status | → Conversation, User (sender) |
| **Rating** | Stars (skill) + moons (personality) | → User (rater + receiver) |
| **Report** | User reports with status tracking | → User (reporter + reported + resolver) |
| **Notification** | Multi-type notifications with read status | → User |
| **Block** | User blocking | → User (blocker + blocked) |
| **Badge** | Named badges (admin, developer, etc.) | M2M → User |
| **MatchHistory** | Shared match records | → User[] |
| **VerificationRequest** | Riot verification requests | → User, RiotAccount |
| **RatingAppeal** | Appeal system for ratings | → Rating, User |
| **DiscordFeedChannel** | Discord channel ↔ Community mirroring | → Community |
| **AuditLog** | Admin action tracking | → User |
| **Ad + AdImpression + AdClick + AdSettings** | Ad monetization system | Complex |

## Enums

- **Region**: NA, EUW, EUNE, KR, JP, OCE, LAN, LAS, BR, RU
- **Role**: TOP, JUNGLE, MID, ADC, SUPPORT, FILL
- **Rank**: IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, UNRANKED
- **VCPreference**: ALWAYS, SOMETIMES, NEVER
- **DuoType**: RANKED, NORMAL, ARAM, FLEX, CUSTOM
- **CommunityRole**: MEMBER, MODERATOR, ADMIN
- **NotificationType**: CONTACT_REQUEST, FEEDBACK, REPORT, ADMIN
- **ReportStatus**: PENDING, REVIEWED, DISMISSED, ACTION_TAKEN
- **LftPostType**: TEAM, PLAYER
- **CoachingPostType**: OFFERING, SEEKING
- **VerificationStatus**: PENDING, VERIFIED, FAILED
- **AppealStatus**: PENDING, APPROVED, REJECTED
- **ChampionPoolDisplayMode**: LIST, TIERLIST

## Key Patterns

- **IDs**: All `cuid()` primary keys
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt`
- **Unique constraints**: `@@unique` on join tables and business rules (e.g., one rating per rater-receiver pair)
- **Cascade deletes**: Post→User, LftPost→User, CoachingPost→User, DiscordFeedChannel→Community
- **Composite indexes**: `@@index([region, role, vcPreference, createdAt])` for feed queries, `@@index([region, type, createdAt])` for coaching/LFT feeds
- **Rank validation**: CoachingPost OFFERING type requires coachRank ≥ EMERALD
