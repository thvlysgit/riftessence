# API Contracts

> Last updated: 2026-02-16  
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
Send a system message to all users (except admin and system user).

**Auth**: Required (admin badge)  
**Request Body**:
```json
{
  "content": "string (min: 10, max: 2000)"
}
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "conversationsCreated": 45,
    "messagesSent": 150
  }
}
```

**Behavior**:
- Creates or uses System user (username: "System", profileIconId: 29)
- Creates conversation between System and each user if not exists
- Sends message from System to all users except admin and System itself
- Increments unread count for each recipient
- Logs admin action for audit trail

**Error Responses**:
- `400` — "Invalid request" (validation error, content too short/long)
- `403` — "Admin access required" (user not admin)
- `404` — "User not found" (admin user not found)
- `401` — Not authenticated
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
