# Developer Public API

Overview
- Provides read-only access to live Duo (feed) and LFT posts for third-party developers.
- Access requires an API key tied to a submitted application. Keys are issued when a logged-in RiftEssence user requests access.

Key Concepts
- Applications: Submitted by a logged-in user and stored as `DeveloperApiApplication`.
- Requests: Each submission creates a `DeveloperApiRequest` and a generated API key; admins can grant `priorityAccess`.
- Keys: Stored hashed (`keyHash`) with a visible `keyPrefix`. Full secret shown once at issuance.
- Usage: Requests are tracked in `DeveloperApiUsage` for auditing and rate-limiting.

Endpoints (selected)
- POST `/api/developer-api/requests` — submit application and receive a one-time API secret.
- GET `/api/developer-api/duo/posts` — fetch Duo/feed posts (filter: region, language, rank, verifiedOnly).
- GET `/api/developer-api/lft/posts` — fetch LFT posts (same filters as above).
- GET `/api/admin/developer-api/dashboard` — admin view: applications, requests, keys, usage.
- PATCH `/api/admin/developer-api/requests/:id/priority` — admin: grant priority access to a request.

Security & Rate Limiting
- Keys are hashed server-side; only prefix stored for lookup.
- Rate-limiting/backpressure enforced per key+IP with exponential short delays; overloaded clients receive 429 + Retry-After-style guidance.

Admin Workflow
- Admins review incoming requests via the admin dashboard and can mark requests as priority. Priority keys are escalated to higher rate limits.

Notes for Developers
- Prefer the `keyPrefix` as an identifier in logs (never store full keys).
- For verified-only filters, the user must have a linked RiotAccount and `verified` flag.
