# API Contracts

> Last updated: 2026-04-20  
> Base URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:3333`)

## Route Modules

| Module | Prefix | File |
|--------|--------|------|
| Auth | `/api/auth` | `apps/api/src/routes/auth.ts` |
| Discord OAuth | `/api/auth/discord` | `apps/api/src/routes/discord.ts` |
| User | `/api/user` | `apps/api/src/routes/user.ts` |
| Posts | `/api` | `apps/api/src/routes/posts.ts` |
| LFT | `/api` | `apps/api/src/routes/lft.ts` |
| Coaching | `/api` | `apps/api/src/routes/coaching.ts` |
| Communities | `/api` | `apps/api/src/routes/communities.ts` |
| Discord Feed | `/api` | `apps/api/src/routes/discordFeed.ts` |
| Teams | `/api` | `apps/api/src/routes/teams.ts` |
| Scrims | `/api` | `apps/api/src/routes/scrims.ts` |
| Ads | `/api` | `apps/api/src/routes/ads.ts` |
| Blocks | `/api/user` | `apps/api/src/routes/blocks.ts` |
| Leaderboards | `/api` | `apps/api/src/routes/leaderboards.ts` |
| Chat | `/api/chat` | `apps/api/src/routes/chat.ts` |

### Inline Routes (in `apps/api/src/index.ts`)
- `POST /api/feedback` — Ratings/feedback (requires JWT auth)
- `DELETE /api/feedback/:id` — Delete feedback (requires JWT auth, user can delete own feedback or admin can delete any)
- `POST /api/report` — User reports (requires JWT auth)
- `GET /health`, `/health/db`, `/health/deep` — Health checks
- Admin operations (ban, badges, account admin)
- Riot verification endpoints
- Notification endpoints

## Response Patterns

### Success (with data)
```json
{ "success": true, "data": { ... }, "pagination": { "hasMore": true, "total": 100 } }
```

Note: Some route modules (including Teams/Scrims) return direct payload roots (for example `posts`, `proposals`, `series`) instead of a shared `data` envelope.

### Success (auth)
```json
{ "userId": "cuid", "username": "alice", "token": "jwt.token.here" }
```

### Error
```json
{ "error": "User-friendly message", "code": "ERROR_CODE" }
```

### Validation Error
```json
{ "error": "Invalid input", "details": [{ "field": "email", "message": "Invalid email format" }] }
```

## Authentication

All protected endpoints require: `Authorization: Bearer <jwt_token>`

---

## Notification Endpoints (`/api/notifications`)

### POST `/api/notifications/contact`
Send a contact request notification.

Auth: Required

Body:
- `toUserId`
- optional `postId`

Behavior:
- sender is derived from the JWT, not from request body fields
- rejects self-contact
- invalidates the recipient notification-list cache

### GET `/api/notifications`
Fetch notifications for the authenticated user.

Auth: Required

Behavior:
- ignores caller-supplied `userId` query parameters
- returns only notifications owned by the JWT user
- enriches sender profile links with batched sender lookups

### PATCH `/api/notifications/:id/read`
Mark one owned notification as read.

Auth: Required

Behavior:
- returns `404` when the notification does not belong to the JWT user
- invalidates the user's notification-list cache

### PATCH `/api/notifications/read-all`
Mark all notifications owned by the authenticated user as read in one batch.

Auth: Required

Response:
```json
{ "success": true, "updatedCount": 3 }
```

---

## Scrim Finder Endpoints (`/api/scrims`)

### GET `/api/scrims/posts`
Fetch scrim feed posts.

Auth: Required

Query Parameters:
- `region` (optional)
- `status` (optional) — `AVAILABLE`, `CANDIDATES`, `SETTLED`
- `format` (optional) — `BO1`, `BO3`, `BO5`, `FEARLESS_BO1`, `FEARLESS_BO3`, `FEARLESS_BO5`, `BLOCK`
- `fearless` (optional, only when `format` is omitted) — `REGULAR`, `FEARLESS`
- `teamId` (optional)

Notes:
- Start times are stored in UTC and should be rendered client-side in viewer local timezone.
- Endpoint auto-expires unanswered pending proposals after 10 minutes.

Response highlights:
- `canDelete` for each post (`true` when viewer is post author, team manager/coach/owner for the post team, or admin)
- `proposalStats` (pending/delayed/accepted/rejected/autoRejected counts + avg response minutes)
- `myProposal` for managed teams
- `proposalsPreview` first proposals snapshot

### GET `/api/scrims/teams/:teamId/prefill`
Build team-based post prefill data.

Auth: Required

Access rule:
- requester must be a member of `:teamId`

Response includes:
- `team` snapshot (id/name/tag/region + member role/rank/account identifiers)
- `suggestedAverageRank`
- `suggestedAverageDivision`
- `suggestedStartTimesUtc`
- `defaultStartTimeUtc`
- `generatedOpggMultisearchUrl`
- `riotIds`
- `disclaimer`

### POST `/api/scrims/posts`
Create a scrim post.

Auth: Required

Reliability gate:
- linked Discord account required
- Discord DM notifications must still be enabled (default-on for linked accounts; users can disable in settings)

Core body fields:
- `teamId`
- `startTimeUtc`
- `scrimFormat`
- optional: rank/division, `averageLp` (for `MASTER`/`GRANDMASTER`/`CHALLENGER`), timezone label, OP.GG multisearch URL, notes

Behavior:
- creating a new active post for the same team replaces older `AVAILABLE`/`CANDIDATES` posts
- pending/delayed proposals on replaced posts are cleared and proposers receive rejection notifications (app + Discord DM when eligible)

Feed Metrics:
- `proposalStats.averageResponseMinutes` is computed at team scope (global for the post owner team), not only from proposals on one specific post.

### DELETE `/api/scrims/posts/:postId`
Delete a scrim post.

Auth: Required

Allowed actors:
- post author
- owner/manager/coach of the post's team
- admin badge holders

### POST `/api/scrims/posts/:postId/proposals`
Submit or refresh a proposal from a managed team.

Auth: Required

Reliability gate:
- linked Discord account required
- Discord DM notifications must still be enabled (default-on for linked accounts; users can disable in settings)

Body:
- `proposerTeamId`
- optional `message`

Behavior:
- proposal submission implies acceptance of the original post start time (no separate proposal time override)

### GET `/api/scrims/proposals/incoming`
List actionable incoming proposals (`PENDING` / `DELAYED`) for teams where requester is owner/manager/coach.

Auth: Required

### PATCH `/api/scrims/proposals/:proposalId/decision`
Decide proposal outcome.

Auth: Required

Body:
- `action`: `ACCEPT`, `REJECT`, `DELAY`

Behavior:
- `DELAY` marks proposal as low-priority fallback (not rejection)
- `ACCEPT` settles the post, rejects other open proposals, and creates/updates a `ScrimSeries`
- On `ACCEPT`, server also auto-creates/reuses team `SCRIM` calendar events (10-minute matching window) and fills `enemyMultigg` with opponent OP.GG multisearch when available

Response:
- `success`
- `status`
- `seriesId` (`null` unless decision produced/linked a series)

### GET `/api/scrims/discord-notifications`
Poll pending scrim-specific Discord notifications with proposal context.

Auth: Bot API key required (`Authorization: Bearer <DISCORD_BOT_API_KEY>`)

### PATCH `/api/scrims/discord-notifications/:id/processed`
Mark a scrim Discord notification as processed.

Auth: Bot API key required (`Authorization: Bearer <DISCORD_BOT_API_KEY>`)

### POST `/api/scrims/proposals/:proposalId/discord-decision`
Apply `ACCEPT` / `REJECT` / `DELAY` from Discord button interactions.

Auth: Bot API key required (`Authorization: Bearer <DISCORD_BOT_API_KEY>`)

Body:
- `discordId`
- `action`: `ACCEPT`, `REJECT`, `DELAY`

Response:
- same shape as proposal decision (`success`, `status`, `seriesId`)

### GET `/api/scrims/series/pending-results`
List scrim series where winner agreement is still pending between host and guest team.

Auth: Required

Scope:
- only series where requester can manage at least one participating team

Response:
- `series[]` with:
  - code lifecycle: `matchCode`, `matchCodeVersion`, `matchCodeRegeneratedAt`, `matchCodeRegeneratedByTeamId`, `lobbyCodeUsedAt`, `lobbyCodeUsedByUserId`
  - participants/context: host/guest team snapshots, `scheduledAt`, `boGames`, `hostCreatesLobby`, `myTeamIds`
  - auto/manual resolution: `autoResultStatus`, `autoResultReadyAt`, `autoResultAttempts`, `autoResultFailureReason`, `autoResultMatchId`, `resultSource`
  - conflict/escalation: `manualConflictCount`, `escalatedAt`
  - first report state + proposal/post context

### POST `/api/scrims/series/:seriesId/match-code/regenerate`
Regenerate scrim match code for a pending series.

Auth: Required

Rules:
- only host team staff (owner/manager/coach) can regenerate
- blocked once winner is already confirmed

Response:
- `success: true`
- `series` snapshot (`id`, `matchCode`, `matchCodeVersion`, team IDs, `scheduledAt`)

Side effects:
- emits lifecycle fanout to both teams (`SCRIM_MATCH_CODE_REGENERATED`) via team-event queue + in-app notifications
- updates code version metadata for live UI refresh

### POST `/api/scrims/series/:seriesId/lobby-code-used`
Record host trust marker that lobby was created with app-provided code.

Auth: Required

Rules:
- only host team staff can record usage

Response:
- `success: true`

### POST `/api/scrims/series/:seriesId/result`
Report winner for a series with two-team agreement flow.

Auth: Required

Body:
- `reportingTeamId`
- `winnerTeamId`

Behavior:
- first report stores pending winner claim (`PENDING_CONFIRMATION`)
- first reporter can update their own pending winner claim before opponent confirms
- opponent matching the same winner confirms result (`CONFIRMED`)
- opponent reporting a different winner returns conflict (`409`) and increments `manualConflictCount`
- repeated conflicts auto-escalate with support guidance payload (`support.required`, `support.url`, screenshot guidance, trust hint)

Result source:
- manual confirmation sets `resultSource: MANUAL_AGREEMENT`
- Riot auto-confirmed series report `resultSource` as `AUTO_RIOT`

Lifecycle fanout:
- pending confirmation prompts opponent via `SCRIM_RESULT_MANUAL_REQUIRED`
- confirmed results fan out via `SCRIM_RESULT_MANUAL_CONFIRMED`
- escalations fan out via `SCRIM_RESULT_CONFLICT_ESCALATION`

Response notes:
- when series is already confirmed, endpoint returns `CONFIRMED` with `alreadyConfirmed: true` and `resultSource`
- conflict responses may include `manualConflictCount` and `support` escalation guidance

### GET `/api/scrims/reviews/candidates`
List eligible team-vs-team directed review candidates for confirmed series.

Auth: Required

Rules:
- only for teams requester can manage
- excludes directed pairs that already reviewed (`reviewerTeamId -> targetTeamId`)

### POST `/api/scrims/reviews`
Submit a scrim review for one directed team pair.

Auth: Required

Body:
- `seriesId`
- `reviewerTeamId`
- `targetTeamId`
- `politeness` (1-5)
- `punctuality` (1-5)
- `gameplay` (1-5)
- optional `message`

Rules:
- series must exist and have confirmed winner
- reviewer team must be manageable by requester
- reviewer/target must match the two teams in that series
- one-time per directed pair (`409` on duplicate)

---

## Team Endpoints (`/api/teams`)

### GET `/api/teams/:id`
Fetch team detail payload used by the team profile page.

Auth: Required

Roster member account fields:
- `rank`, `division`, `lp`, `gameName`, `tagLine`, and `riotRegion` are selected from the member's most relevant real Riot account for the team, preferring visible accounts in the team region with rank data before falling back to the main account.
- Team invites and joins match all real Riot account PUUIDs owned by the user, not only the main account.

Scrim-related response additions:
- `scrimPerformance`
  - `totalSeries`
  - `wins`
  - `losses`
  - `winRate` (percentage or `null`)
- `scrimReputation`
  - `averageRating` (or `null`)
  - `reviewCount`
  - `recentReviews[]` including reviewer team, three score axes, average, comment, and series metadata

### GET `/api/teams/:id/discord`
Read team Discord delivery settings.

Auth: Required (team owner)

Response highlights:
- schedule/event webhook: `webhookUrl`
- optional scrim lifecycle override channel: `scrimCodeWebhookUrl`
- validation metadata for both webhook targets (`webhookValid`, `channelName`, `guildName`, `scrimCodeWebhookValid`, `scrimCodeChannelName`, `scrimCodeGuildName`)
- mention and reminder settings

### POST `/api/teams/:id/discord`
Update team Discord delivery settings.

Auth: Required (team owner)

Body highlights:
- optional `webhookUrl`
- optional `scrimCodeWebhookUrl` (dedicated channel for `SCRIM_*` lifecycle notices; fallback remains `webhookUrl`)
- mention/reminder settings and role maps

### DELETE `/api/teams/:id/discord`
Reset team Discord settings.

Auth: Required (team owner)

Behavior:
- clears both `webhookUrl` and `scrimCodeWebhookUrl`

---

## Chat Endpoints (`/api/chat`)

### GET `/api/chat/conversations`
Fetch all conversations for the authenticated user.

**Auth**: Required  
**Response**:
```json
{
  "conversations": [
    {
      "id": "cuid",
      "lastMessageAt": "2026-02-12T10:30:00.000Z",
      "unreadCount": 3,
      "otherUser": {
        "id": "cuid",
        "username": "summoner123",
        "profileImageUrl": "https://..."
      }
    }
  ]
}
```

### GET `/api/chat/conversations/:conversationId/messages`
Get messages for a specific conversation (last 100 messages, newest first).  
**Side effect**: Marks all messages as read and resets unread count for current user.

**Auth**: Required  
**Response**:
```json
{
  "messages": [
    {
      "id": "cuid",
      "senderId": "cuid",
      "content": "Hey, want to duo?",
      "createdAt": "2026-02-12T10:30:00.000Z",
      "read": true
    }
  ]
}
```

### POST `/api/chat/messages`
Send a new message. Creates conversation if it doesn't exist.

**Auth**: Required  
**Body**:
```json
{
  "recipientId": "cuid",
  "content": "Message text (max 2000 chars)"
}
```
**Validation**: Uses `SendMessageSchema` (Zod validation)  
**Checks**: Cannot message blocked users or users who blocked you  
**Side effects**:
- Creates Conversation if first message between users
- Increments recipient's `unreadCount` in Conversation
- Uses Prisma transaction for atomicity

**Success Response**:
```json
{
  "message": {
    "id": "cuid",
    "conversationId": "cuid",
    "senderId": "cuid",
    "content": "Message text",
    "createdAt": "2026-02-12T10:30:00.000Z",
    "read": false
  }
}
```

**Error Responses**:
- `400` — "You have blocked this user" / "This user has blocked you" / validation errors
- `401` — Not authenticated
- `500` — Server error

### GET `/api/chat/unread-count`
Get total number of unread messages across all conversations.

**Auth**: Required  
**Response**:
```json
{
  "unreadCount": 7
}
```

### POST `/api/chat/conversations/with/:userId`
Get or create a conversation with a specific user.

**Auth**: Required  
**Response**:
```json
{
  "conversation": {
    "id": "cuid",
    "user1Id": "cuid",
    "user2Id": "cuid",
    "lastMessageAt": "2026-02-12T10:30:00.000Z",
    "unreadCountUser1": 0,
    "unreadCountUser2": 2
  }
}
```

---

## User Endpoints (`/api/user`)

### GET `/api/user/search`
Search for users by partial username match.

**Auth**: Not required (public endpoint)  
**Query Parameters**:
- `q` (required) — Search query, minimum 2 characters
- `limit` (optional) — Results limit, max 20, default 10
- `offset` (optional) — Pagination offset, default 0

**Response**:
```json
{
  "users": [
    {
      "id": "cuid",
      "username": "summoner123",
      "verified": true,
      "badges": [
        { "key": "admin", "name": "Admin" },
        { "key": "verified", "name": "Verified" }
      ],
      "profileIconId": 29
    }
  ],
  "pagination": {
    "total": 45,
    "offset": 0,
    "limit": 10,
    "hasMore": true
  }
}
```

**Behavior**:
- Case-insensitive partial match on username (uses SQL `LIKE %query%`)
- Returns up to 20 results per request
- Includes main Riot account's profileIconId if available
- Fetches profile icons from Riot API in parallel

### POST `/api/user/assign-badge`
Assign a badge to a user (admin only).

**Auth**: Required (admin badge)  
**Request Body**:
```json
{
  "userId": "cuid",
  "badgeKey": "verified"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Badge assigned successfully"
}
```

**Error Responses**:
- `400` — "userId and badgeKey are required"
- `403` — "Admin access required"
- `404` — "Badge not found. Create it first in the database." / "User not found"
- `401` — Not authenticated
- `500` — Server error

**Note**: If user already has the badge, returns success with message "User already has this badge"

### POST `/api/user/remove-badge`
Remove a badge from a user (admin only).

**Auth**: Required (admin badge)  
**Request Body**:
```json
{
  "userId": "cuid",
  "badgeKey": "verified"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Badge removed successfully"
}
```

**Error Responses**:
- `400` — "userId and badgeKey are required"
- `403` — "Admin access required"
- `404` — "Badge not found" / "User not found"
- `401` — Not authenticated
- `500` — Server error

### GET `/api/user/badges`
List all available badges.

**Auth**: Not required (public endpoint)  
**Response**:
```json
{
  "badges": [
    {
      "id": "cuid",
      "key": "admin",
      "name": "Admin",
      "description": "Platform administrator"
    },
    {
      "id": "cuid",
      "key": "verified",
      "name": "Verified",
      "description": "Verified League of Legends account"
    }
  ]
}
```

### PATCH `/api/user/badge/:key`
Update a badge's description (admin only).

**Auth**: Required (admin badge via query param)  
**Query Parameters**:
- `userId` (required) — User ID from JWT token

**Request Body**:
```json
{
  "description": "New badge description"
}
```

**Response**:
```json
{
  "success": true,
  "badge": {
    "id": "cuid",
    "key": "verified",
    "name": "Verified",
    "description": "New badge description"
  }
}
```

**Error Responses**:
- `401` — "User authentication required"
- `403` — "Admin privileges required"
- `404` — "User not found" / "Badge not found"
- `500` — Server error

### GET `/api/user/check-admin`
Check if the authenticated user has admin privileges.

**Auth**: Required  
**Response**:
```json
{
  "isAdmin": true
}
```

**Note**: Used by frontend admin pages to verify access before rendering admin UI

---

## Admin Endpoints

### POST `/api/admin/broadcast-message`
Queue a Discord embed DM broadcast to eligible linked users.

**Auth**: Required (admin badge)  
**Request Body**:
```json
{
  "title": "string (min: 3, max: 256)",
  "description": "string (min: 10, max: 4000)",
  "color": "#5865F2",
  "url": "optional https URL",
  "footer": "optional string (max: 2048)",
  "imageUrl": "optional https URL"
}
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "dmQueued": 120,
    "skippedNoDiscordOrDisabled": 30
  }
}
```

**Behavior**:
- Enqueues `DiscordDmQueue` rows with `kind = "ADMIN_EMBED"` for users who have a linked Discord account and have not disabled Discord DM notifications.
- Does not create in-app chat conversations or unread chat messages.
- The Discord bot renders the queued payload as a Discord embed DM.
- Delivery can still be blocked by Discord privacy settings or by no mutual server/app install.
- Logs admin action for audit trail

**Error Responses**:
- `400` — "Invalid request" (validation error, content too short/long or invalid URL/color)
- `403` — "Admin access required" (user not admin)
- `404` — "User not found" (admin user not found)
- `401` — Not authenticated
- `500` — Server error

---

## Posts Endpoints (`/api/posts`)

### GET `/api/posts`
Fetch all duo posts with pagination and filters.

**Auth**: Optional (required for blocked users filter)  
**Query Parameters**:
- `region`: string | string[] (optional) — Filter by region(s)
- `role`: string | string[] (optional) — Filter by role(s)
- `language`: string | string[] (optional) — Filter by language(s)
- `vcPreference`: 'ALWAYS' | 'SOMETIMES' | 'NEVER' (optional)
- `verified`: `true` | `false` | `all` (optional) - Matches the same post banner criteria used by the feed (`true` requires a linked Discord account plus a real linked Riot account; Discord-only placeholder Riot accounts are unverified)
- `duoType`: string (optional) — Filter by duo type
- `userId`: string (optional) — Used to filter blocked users and check admin status
- `limit`: number (default: 10, max validated) — Number of posts per page
- `offset`: number (default: 0) — Pagination offset

**Response**:
```json
{
  "posts": [
    {
      "id": "cuid",
      "createdAt": "2026-02-24T10:30:00.000Z",
      "message": "Looking for chill duo partner!",
      "role": "ADC",
      "secondRole": "SUPPORT",
      "region": "EUW",
      "languages": ["en", "de"],
      "vcPreference": "SOMETIMES",
      "duoType": "RANKED",
      "authorId": "cuid",
      "username": "SummonerName",
      "isAnonymous": false,
      "isAdmin": false,
      "reportCount": 0,
      "preferredRole": "ADC",
      "secondaryRole": "SUPPORT",
      "discordUsername": "discord#1234",
      "postingRiotAccount": {
        "gameName": "RiftMaster",
        "tagLine": "EUW1",
        "region": "EUW",
        "rank": "PLATINUM",
        "division": "II",
        "lp": 45,
        "winrate": 54.2
      },
      "bestRank": {
        "gameName": "RiftMaster",
        "tagLine": "NA1",
        "rank": "DIAMOND",
        "division": "IV",
        "lp": 12,
        "winrate": 51.8
      },
      "ratings": {
        "skill": 4.2,
        "personality": 4.8,
        "skillCount": 15,
        "personalityCount": 15
      },
      "isMainAccount": false,
      "community": {
        "id": "cuid",
        "name": "EUW Chill Squad",
        "isPartner": true,
        "inviteLink": "https://discord.gg/example"
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "total": 150
  }
}
```

**Features**:
- Server-side pagination with limit/offset
- Multi-filter support (regions, roles, languages)
- Verification filtering is aligned with the response `verification.isVerified` banner state.
- `postingRiotAccount` is resolved from `postingRiotAccountId` even when a Discord-submitted Riot ID belongs to a display-only external account, so rank/winrate can be shown without marking the author verified.
- Bidirectional blocking filter
- Admin status detection
- Ordered by `createdAt DESC`

### GET `/api/posts/:id`
Fetch a single duo post by ID.

**Auth**: Not required (public endpoint for sharing)  
**Response**:
```json
{
  "post": {
    "id": "cuid",
    "createdAt": "2026-02-24T10:30:00.000Z",
    "message": "Looking for chill duo partner!",
    "role": "ADC",
    "secondRole": "SUPPORT",
    "region": "EUW",
    "languages": ["en", "de"],
    "vcPreference": "SOMETIMES",
    "duoType": "RANKED",
    "authorId": "cuid",
    "username": "SummonerName",
    "isAnonymous": false,
    "isAdmin": false,
    "reportCount": 0,
    "preferredRole": "ADC",
    "secondaryRole": "SUPPORT",
    "discordUsername": "discord#1234",
    "postingRiotAccount": {
      "gameName": "RiftMaster",
      "tagLine": "EUW1",
      "region": "EUW",
      "rank": "PLATINUM",
      "division": "II",
      "lp": 45,
      "winrate": 54.2
    },
    "bestRank": {
      "gameName": "RiftMaster",
      "tagLine": "NA1",
      "rank": "DIAMOND",
      "division": "IV",
      "lp": 12,
      "winrate": 51.8
    },
    "ratings": {
      "skill": 4.2,
      "personality": 4.8,
      "skillCount": 15,
      "personalityCount": 15
    },
    "isMainAccount": false,
    "community": {
      "id": "cuid",
      "name": "EUW Chill Squad",
      "isPartner": true,
      "inviteLink": "https://discord.gg/example"
    },
    "championPoolMode": "TIERLIST",
    "championList": [],
    "championTierlist": {
      "S": ["Jinx", "Kai'Sa"],
      "A": ["Ashe", "Caitlyn"]
    }
  }
}
```

**Features**:
- Public access (no authentication required)
- Same format as list endpoint
- Used for share pages and OpenGraph embeds
- Respects anonymous mode (hides usernames/accounts)

**Error Responses**:
- `404` — "Post not found"
- `500` — Server error

### POST `/api/posts`
Create a new duo post.

**Auth**: Required  
**Request Body**: Validated via `CreatePostSchema`

**Success Response** (201):
```json
{
  "success": true,
  "postId": "cuid"
}
```

**Error Responses**:
- `400` — Validation errors, missing Riot account
- `401` — Invalid/missing authentication
- `500` — Server error

### DELETE `/api/posts/:id`
Delete a duo post.

**Auth**: Required  
**Authorization**: Owner of the post OR admin

**Success Response** (200):
```json
{
  "success": true
}
```

**Error Responses**:
- `401` — Invalid/missing authentication
- `403` — Not authorized (not owner or admin)
- `404` — Post not found
- `500` — Server error

---

## Coaching Endpoints (`/api/coaching`)

### GET `/api/coaching/posts`
Fetch all coaching posts with optional filters.

**Auth**: Optional (required for blocked users filter)  
**Query Parameters**:
- `region`: string | string[] (optional) — Filter by region(s)
- `type`: 'OFFERING' | 'SEEKING' (optional) — Filter by post type
- `userId`: string (optional) — Used to filter blocked users and check admin status

**Response**:
```json
[
  {
    "id": "cuid",
    "type": "OFFERING",
    "createdAt": "2026-02-16T10:30:00.000Z",
    "region": "NA",
    "authorId": "cuid",
    "username": "SummonerName",
    "discordUsername": "discord#1234",
    "discordTag": "discord#1234",
    "isAdmin": false,
    "roles": ["TOP", "MID"],
    "languages": ["English", "French"],
    "availability": "TWICE_A_WEEK",
    "details": "Experienced coach focusing on macro...",
    "coachRank": "DIAMOND",
    "coachDivision": "II",
    "specializations": ["Wave Management", "Vision Control", "Macro"]
  }
]
```

**Features**:
- Bidirectional blocking filter (excludes posts from blocked users)
- Admin status detection for conditional UI rendering
- Ordered by `createdAt DESC`

### POST `/api/coaching/posts`
Create a new coaching post.

**Auth**: Required  
**Request Body**:
```json
{
  "type": "OFFERING" | "SEEKING",
  "region": "Region",
  "roles": ["Role[]"],
  "languages": ["string[]"],
  "availability": "TeamAvailability",
  "details": "string (max 500)",
  "discordTag": "string (max 50)",
  "coachRank": "EMERALD" | "DIAMOND" | "MASTER" | "GRANDMASTER" | "CHALLENGER",
  "coachDivision": "I" | "II" | "III" | "IV",
  "specializations": ["string[]"]
}
```

**Validation Rules** (via `CreateCoachingPostSchema`):
- Type must be 'OFFERING' or 'SEEKING'
- Region is required
- Discord account linked OR discordTag provided
- **OFFERING posts**: coachRank must be EMERALD or higher
- One active post per type per user (prevents duplicates)

**Success Response** (201):
```json
{
  "success": true,
  "post": { /* Created post object */ }
}
```

**Error Responses**:
- `400` — Missing required fields, invalid type, duplicate post, rank requirement not met
- `401` — Invalid/missing authentication
- `404` — User not found
- `500` — Server error

### DELETE `/api/coaching/posts/:id`
Delete a coaching post.

**Auth**: Required  
**Authorization**: Owner of the post OR admin

**Success Response** (200):
```json
{
  "success": true
}
```

**Error Responses**:
- `401` — Invalid/missing authentication
- `403` — Not authorized (not owner or admin)
- `404` — Post or user not found
- `500` — Server error

---

Populated by @DocumentationManager as endpoints are documented in detail.
