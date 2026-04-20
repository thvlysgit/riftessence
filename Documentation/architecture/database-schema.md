# Database Schema

> Last updated: 2026-04-20  
> Source: `prisma/schema.prisma` (~1330 lines)

## Models (48 total, core highlights below)

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

## Scrim Lifecycle Domain (2026-04-20)

The scrim workflow now persists full lifecycle state from posting to result confirmation and team reputation.

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| **ScrimPost** | Team scrim listing with region/format/time and optional OP.GG multisearch | → Team, User (author), ScrimProposal[], ScrimSeries[] |
| **ScrimProposal** | Directed proposal from proposer team to target post team with decision status | → ScrimPost, Team (proposer/target), User (proposedBy), ScrimSeries? |
| **ScrimSeries** | Accepted proposal execution record with host-owned match-code lifecycle, auto-result state, manual conflict tracking, and escalation metadata | → ScrimProposal (1:1), ScrimPost, Team (host/guest), ScrimTeamReview[] |
| **ScrimTeamReview** | One-time directed pair review with 3 scoring axes and optional message | → ScrimSeries, Team (reviewer/target) |
| **ScrimDiscordNotification** | Pending/processed Discord DM payloads for proposal decisions | → ScrimProposal |

Team model relations include:
- `scrimPosts`
- `scrimProposalsSent`
- `scrimProposalsReceived`
- `scrimSeriesHost`
- `scrimSeriesGuest`
- `scrimReviewsGiven`
- `scrimReviewsReceived`

Team model scrim-delivery fields include:
- `discordWebhookUrl` (default schedule/event channel)
- `discordScrimCodeWebhookUrl` (optional override for `SCRIM_*` lifecycle forwarding)

TeamEvent schema addition used by accepted scrims:
- `enemyMultigg String?` (opponent multisearch URL persisted on SCRIM events)

ScrimSeries lifecycle fields include:
- match code lifecycle: `matchCodeVersion`, `matchCodeRegeneratedAt`, `matchCodeRegeneratedByTeamId`, `lobbyCodeUsedAt`, `lobbyCodeUsedByUserId`
- result attribution: `resultSource` (`MANUAL_AGREEMENT`, `AUTO_RIOT`)
- automation state: `autoResultStatus`, `autoResultReadyAt`, `autoResultAttempts`, `autoResultLastCheckedAt`, `autoResultFailureReason`, `autoResultMatchId`
- manual conflict/escalation: `manualConflictCount`, `escalatedAt`
- index: `@@index([autoResultStatus, autoResultReadyAt])`

## Enums

- **Region**: NA, EUW, EUNE, KR, JP, OCE, LAN, LAS, BR, RU
- **Role**: TOP, JUNGLE, MID, ADC, SUPPORT, FILL
- **Rank**: IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, UNRANKED
- **VCPreference**: ALWAYS, SOMETIMES, NEVER
- **DuoType**: RANKED, NORMAL, ARAM, FLEX, CUSTOM
- **CommunityRole**: MEMBER, MODERATOR, ADMIN
- **NotificationType**: CONTACT_REQUEST, FEEDBACK_RECEIVED, REPORT_RECEIVED, REPORT_ACCEPTED, REPORT_REJECTED, PASSWORD_SETUP_REMINDER, SCRIM_PROPOSAL_RECEIVED, SCRIM_PROPOSAL_ACCEPTED, SCRIM_PROPOSAL_REJECTED, SCRIM_PROPOSAL_DELAYED, SCRIM_PROPOSAL_AUTO_REJECTED, SCRIM_SERIES_ACCEPTED, SCRIM_MATCH_CODE_REGENERATED, SCRIM_RESULT_AUTO_CONFIRMED, SCRIM_RESULT_MANUAL_CONFIRMED, SCRIM_RESULT_MANUAL_REQUIRED, SCRIM_RESULT_CONFLICT_ESCALATION, ADMIN_TEST
- **ReportStatus**: PENDING, REVIEWED, DISMISSED, ACTION_TAKEN
- **LftPostType**: TEAM, PLAYER
- **CoachingPostType**: OFFERING, SEEKING
- **VerificationStatus**: PENDING, VERIFIED, FAILED
- **AppealStatus**: PENDING, APPROVED, REJECTED
- **ChampionPoolDisplayMode**: LIST, TIERLIST
- **TeamRole**: TOP, JGL, MID, ADC, SUP, SUBS, MANAGER, OWNER, COACH
- **TeamEventType**: SCRIM, PRACTICE, VOD_REVIEW, TOURNAMENT, TEAM_MEETING
- **AttendanceStatus**: ABSENT, PRESENT, UNSURE
- **ScrimFormat**: BO1, BO3, BO5, FEARLESS_BO1, FEARLESS_BO3, FEARLESS_BO5, BLOCK
- **ScrimPostStatus**: AVAILABLE, CANDIDATES, SETTLED
- **ScrimProposalStatus**: PENDING, ACCEPTED, REJECTED, DELAYED, AUTO_REJECTED
- **ScrimDiscordNotificationType**: PROPOSAL_RECEIVED, PROPOSAL_ACCEPTED, PROPOSAL_REJECTED, PROPOSAL_DELAYED, PROPOSAL_AUTO_REJECTED
- **ScrimAutoResultStatus**: PENDING, READY, RUNNING, CONFIRMED, MANUAL_REQUIRED, FAILED
- **ScrimResultSource**: MANUAL_AGREEMENT, AUTO_RIOT

## Key Patterns

- **IDs**: All `cuid()` primary keys
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt`
- **Unique constraints**: `@@unique` on join tables and business rules (e.g., one rating per rater-receiver pair)
- **Scrim uniqueness**:
	- `ScrimProposal @@unique([postId, proposerTeamId])` prevents duplicate active proposer entries per post
	- `ScrimSeries proposalId @unique` enforces one lifecycle series per accepted proposal
	- `ScrimTeamReview @@unique([reviewerTeamId, targetTeamId])` enforces one directed pair review
- **Cascade deletes**: Post→User, LftPost→User, CoachingPost→User, DiscordFeedChannel→Community
- **Composite indexes**: `@@index([region, role, vcPreference, createdAt])` for feed queries, `@@index([region, type, createdAt])` for coaching/LFT feeds
- **Rank validation**: CoachingPost OFFERING type requires coachRank ≥ EMERALD
