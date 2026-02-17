# Security

> Last updated: 2026-02-15  
> **Recent Update**: Fixed critical authentication bypass vulnerability in user profile endpoints

## Authentication
- **JWT**: 7-day expiry, signed with `JWT_SECRET` (min 32 chars, validated at startup)
- **Password**: bcryptjs with salt rounds = 10
- **Token storage**: `localStorage('lfd_token')` — XSS risk mitigated by CSP
- **Token refresh**: Frontend checks every 10 min, refreshes when expiring soon
- **Alternative auth**: Discord OAuth, Riot account verification

## Authorization
- **Admin**: Badge-based — `user.badges.some(b => b.key === 'admin')`
- **Route protection**: `getUserIdFromRequest()` middleware extracts and verifies JWT
- **Community roles**: MEMBER, MODERATOR, ADMIN per community

## Input Validation
- **API**: Zod schemas in `apps/api/src/validation.ts` for all request bodies
- **Frontend**: DOMPurify (`apps/web/utils/sanitize.ts`) for user-generated HTML content

## CORS
- Configured via `@fastify/cors`
- Dev: `ALLOW_ORIGIN=true` (permissive)
- Production: Set to frontend domain

## CSRF
- `@fastify/csrf-protection` configured

## Rate Limiting
- `@fastify/rate-limit` configured (currently relaxed for development)
- Planned: 500 req/15min anonymous, 1000 req/15min authenticated

## Security Gaps (from audit)
- localStorage JWT (vs httpOnly cookies)
- Rate limiting not fully enforced
- Overall security posture improving with ongoing fixes

## Recently Fixed Vulnerabilities

### CVE-2026-003: Feedback & Report Authentication Missing (Fixed 2026-02-15)
**Severity**: MEDIUM  
**CVSS Score**: 6.5 (Medium)

**Description**: Multiple issues in the feedback system:
1. Frontend feedback submission (POST `/api/feedback`), feedback deletion (DELETE `/api/feedback/:id`), and report submission (POST `/api/report`) endpoints were not sending Authorization Bearer tokens
2. Backend feedback deletion endpoint had overly restrictive authorization - only admins could delete feedback, preventing users from deleting their own ratings
3. Frontend DELETE request was sending 'Content-Type: application/json' header with no body, causing Fastify's content parser to return 400 Bad Request

**Impact**:
- Users unable to submit feedback on other players (got "Authorization header missing" error)
- Users unable to delete their own feedback (got 403 Forbidden "You must be an admin" error)
- After auth fix, DELETE requests failed with 400 Bad Request due to Content-Type header mismatch
- Users unable to report problematic users
- Broken moderation and rating features
- Poor user experience - users couldn't manage their own content

**Root Causes**:
1. **Frontend missing auth headers**: Feedback and report fetch calls didn't include `getAuthHeader()`
2. **Redundant parameters**: Frontend passing `raterId`, `reporterId`, `userId` in body instead of relying on JWT
3. **Backend authorization bug**: Deletion endpoint only checked for admin badge, didn't check if user owns the feedback
4. **Content-Type header issue**: Sending 'Content-Type: application/json' on DELETE with no body confuses Fastify parser
5. **Inconsistent patterns**: Some endpoints (like block/unblock) had proper auth, others didn't

**Fix Applied**:
- ✅ Added Authorization headers to all feedback and report API calls
- ✅ Removed redundant userId parameters from request bodies
- ✅ Removed 'Content-Type: application/json' header from DELETE request (no body to parse)
- ✅ Updated backend DELETE `/api/feedback/:id` to allow users to delete their own feedback
- ✅ Preserved admin ability to delete any feedback for moderation purposes

**Authorization Logic (Fixed)**:
```typescript
// User can delete if:
// 1. They are the rater (owner) of the feedback, OR
// 2. They have an admin badge
const isOwner = feedback.raterId === userId;
const hasAdminBadge = user.badges.some(b => b.key === 'admin');
if (!isOwner && !hasAdminBadge) {
  return 403; // Forbidden
}
```

**HTTP Headers Best Practice**:
- Only send 'Content-Type: application/json' when request includes a JSON body
- DELETE, GET requests typically don't need Content-Type header
- POST, PUT, PATCH should include appropriate Content-Type

**Lesson Learned**: 
- Auth patterns must be consistent across all user-initiated actions
- Authorization logic should distinguish between "own content" vs "any content" permissions
- Users should always be able to manage their own data (CRUD operations on their content)
- HTTP Content-Type headers should only be set when actually sending that content type  
- When refactoring authentication, audit all API endpoints for missing headers AND incorrect authorization logic

**Files Fixed**:
- `apps/web/pages/profile.tsx` (feedback submission, deletion, and report submission handlers)
- `apps/api/src/index.ts` (DELETE /api/feedback/:id authorization logic)

---

### CVE-2026-002: Discord OAuth Missing Authentication (Fixed 2026-02-15)
**Severity**: MEDIUM  
**CVSS Score**: 5.3 (Medium)

**Description**: Discord OAuth endpoints (`/api/auth/discord/login`, `/api/auth/discord/unlink`) required JWT authentication on the backend but the frontend was not sending Authorization Bearer tokens. Additionally, the OAuth callback redirect was hardcoded to `http://localhost:3000` instead of using an environment-configurable frontend URL.

**Impact**:
- Users couldn't link Discord accounts (got "Authorization header missing" error)
- Remote users accessing via VS Code Dev Tunnels would be redirected to localhost after OAuth completion
- Broken user experience for Discord integration feature

**Root Causes**:
1. **Frontend missing auth headers**: `fetch()` calls to Discord endpoints didn't include `getAuthHeader()`
2. **Hardcoded redirect URL**: No environment variable for frontend URL in OAuth callback
3. **Inconsistent auth patterns**: Other endpoints used auth headers but Discord endpoints were overlooked

**Fix Applied**:
- ✅ Frontend now sends Authorization headers with Discord link/unlink requests
- ✅ Backend OAuth callback uses `FRONTEND_URL` environment variable for redirect
- ✅ Added `FRONTEND_URL` to `.env` and `docker-compose.yml`
- ✅ Fallback to `http://localhost:3000` for local development

**Lesson Learned**: All user-specific endpoints must send Authorization headers, even for OAuth flows that redirect. Environment variables should be used for all external URLs to support different deployment contexts (local, tunnel, production).

**Files Fixed**:
- `apps/web/pages/profile.tsx` (Discord link/unlink handlers)
- `apps/api/src/routes/discord.ts` (OAuth callback redirect)
- `.env` and `docker-compose.yml` (FRONTEND_URL configuration)

---

### CVE-2026-001: User Profile Data Leak (Fixed 2026-02-15)
**Severity**: HIGH  
**CVSS Score**: 8.1 (High)

**Description**: Multiple user profile API endpoints (`/champion-pool`, `/playstyles`, `/languages`, `/anonymous`, `/refresh-riot-stats`) were using `prisma.user.findFirst()` as a fallback when no `userId` query parameter was provided. This caused the API to return data for the first user in the database regardless of who made the request.

**Impact**:
- Unauthorized users could view other users' champion pools, playstyles, languages, and settings
- Authenticated users could modify other users' profile data  
- Data leak affected all users who didn't send authentication headers
- Real-world example: User reported seeing another user's champion pool pre-selected

**Root Causes**:
1. **Unsafe fallback pattern**: `const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : await prisma.user.findFirst();`
2. **Missing authentication**: Endpoints didn't use `getUserIdFromRequest()` to validate JWT tokens
3. **Frontend missing auth headers**: `fetch()` calls didn't include `getAuthHeader()` for Authorization Bearer token

**Fix Applied**:
- ✅ All affected endpoints now require JWT authentication via `getUserIdFromRequest()`
- ✅ Removed `findFirst()` fallbacks and query parameter auth
- ✅ Frontend now sends Authorization headers with all profile API calls
- ✅ Returns 401 Unauthorized if no valid token is present

**Lesson Learned**: Never use `findFirst()` or query params for user identification. ALWAYS use JWT-based authentication for user-specific data. Added to anti-patterns: "Do NOT use `prisma.user.findFirst()` or query params as auth fallback."

**Files Fixed**:
- `apps/api/src/routes/user.ts` (5 endpoints)
- `apps/web/pages/profile.tsx` (6 API call sites)

---

## Security Best Practices

### Backend API
1. **Always use `getUserIdFromRequest()`** for user-specific endpoints
2. **Never use `findFirst()` as an auth fallback** — it returns arbitrary data
3. **Validate all user input with Zod schemas** before database queries
4. **Return generic error messages** — don't expose internal details to clients
5. **Check authorization after authentication** — verify user can access requested resource

### Frontend
1. **Always include auth headers** when calling user-specific endpoints:
   ```typescript
   fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
   })
   ```
2. **Don't send userId in query params** — let backend extract from JWT token
3. **Check authentication state** before showing authenticated UI
4. **Handle 401 responses** by redirecting to login
