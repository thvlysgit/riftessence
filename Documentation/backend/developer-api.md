# Developer Public API

Overview

- Provides read-only access to live Duo and LFT posts, plus a two-way Scrim Finder federation API.
- Access requires an API key tied to a submitted application. Keys are issued when a logged-in RiftEssence user requests access.
- Request submission now also requires that the requester has at least one linked Riot account.

Key Concepts

- Applications: Submitted by a logged-in user and stored as `DeveloperApiApplication`.
- Requests: Each submission creates a `DeveloperApiRequest` and a generated API key; admins can grant `priorityAccess`.
- Keys: Stored hashed (`keyHash`) with a visible `keyPrefix`. Full secret shown once at issuance.
- Usage: Requests are tracked in `DeveloperApiUsage` for auditing and rate-limiting.

Endpoints (selected)

- POST `/api/developer-api/requests` — submit application and receive a one-time API secret.
- GET `/api/developer-api/duo/posts` — fetch Duo/feed posts (filter: region, language, rank, verifiedOnly).
- GET `/api/developer-api/lft/posts` — fetch LFT posts (same filters as above).
- GET `/api/developer-api/scrims/posts` — fetch live first-party and federated scrim availability (filters: region, format, limit, offset).
- PUT `/api/developer-api/scrims/posts/:externalPostId` — create or replace one availability listing from another scrim finder.
- DELETE `/api/developer-api/scrims/posts/:externalPostId` — withdraw the calling application’s federated listing.
- GET `/api/admin/developer-api/dashboard` — admin view: applications, requests, keys, usage.
- PATCH `/api/admin/developer-api/requests/:id/priority` — admin: grant priority access to a request.

Request Failure Modes (POST `/api/developer-api/requests`)

- `400`: invalid form payload or requester missing linked Riot account.
- `401`: missing/invalid auth token.
- `404`: requester account not found.
- `409`: rare API key collision (safe to retry).
- `503`: provisioning unavailable (for example missing database objects during rollout).
- `500`: unexpected server error.

Frontend Surfaces

- Public docs and request form: `/developer-api`.
- Admin dashboard page: `/admin/developer-api`.

Security & Rate Limiting

- Keys are hashed server-side; only prefix stored for lookup.
- Rate-limiting/backpressure enforced per key+IP with exponential short delays; overloaded clients receive 429 + Retry-After-style guidance.
- Federated posts are isolated by application and external ID. An application can update or remove only its own listings.
- External contact links must be absolute HTTPS URLs. RiftEssence never exposes a Discord webhook through the public API.

Scrim Federation

- `GET /api/developer-api/scrims/posts` returns `posts` plus standard offset pagination. Each post contains the team label, region, rank, start time, format, source, and an optional `contactUrl`.
- `PUT /api/developer-api/scrims/posts/:externalPostId` is idempotent. Reusing the same external ID updates the listing instead of creating duplicates.
- Required PUT fields: `externalTeamId`, `teamName`, `region`, `format`, `startTimeUtc` (future ISO-8601), and `contactUrl` (HTTPS).
- Optional PUT fields: `teamTag`, `timezoneLabel`, `averageRank`, `averageDivision`, `averageLp`, and `details`.
- Supported formats: `BO1`, `BO3`, `BO5`, `FEARLESS_BO1`, `FEARLESS_BO3`, `FEARLESS_BO5`, `BLOCK`.

Example federated listing

```bash
curl -X PUT "https://api.riftessence.app/api/developer-api/scrims/posts/partner-slot-1842" \
  -H "x-api-key: re_xxxx_your_key_here" \
  -H "content-type: application/json" \
  -d '{
    "externalTeamId": "partner-team-42",
    "teamName": "Blue Comets",
    "teamTag": "BC",
    "region": "EUW",
    "format": "FEARLESS_BO3",
    "startTimeUtc": "2026-09-20T18:00:00.000Z",
    "contactUrl": "https://partner.example/scrims/partner-slot-1842"
  }'
```

Admin Workflow

- Admins review incoming requests via the admin dashboard and can mark requests as priority. Priority keys are escalated to higher rate limits.
- Footer and admin dashboard now include first-class navigation links to these pages.

Notes for Developers

- Prefer the `keyPrefix` as an identifier in logs (never store full keys).
- For verified-only filters, the user must have a linked RiotAccount and `verified` flag.
