# Optimistic Riot linking and ratings

## Behaviour

- Account linking and guest ratings use one server-assigned icon challenge. Riot Sign-On remains unavailable in the UI.
- Confirmation starts persisted checks at 5, 15, and 30 minutes. The final matching check verifies ownership; earlier mismatches allow for Riot propagation delay. Keep the icon for at least 30 minutes and until verification finishes if Riot is delayed.
- Signed-in players reuse an active challenge for the same Riot account. Already verified owners do not need another icon change. Guest receipts cannot authenticate a RiftEssence session.
- Before the rating form is unlocked, the API checks the newest 50 games for every relevant account. Signed-in users check every verified linked account automatically and skip icon verification. Guest raters check the Riot account used by their assigned-icon challenge. If no shared match is found—or Riot cannot complete the check—the rating form is not available.
- Eligibility records the matching rater PUUIDs, recipient account IDs, unique shared-match count, and check time. A submitted rating is then stored in `PendingRating`, separate from `Rating`; it cannot affect public feedback, scores, rewards, or notifications while ownership remains pending.
- After ownership succeeds, publication uses that recorded shared-game evidence and rechecks that the relevant Riot links still belong to both users, plus self-rating, blocks, duplicates, daily limits, and cooldowns. It does not rerun the 50-game search, so a qualifying match cannot roll out of the window during the 30-minute ownership check.
- Rating creation, receiver notification, and the final publication marker commit in one transaction. Worker leases are fenced; a stale icon-check worker cannot grant verification.
- A final icon mismatch rejects dependent ratings and removes only the failed, unverified signed-in connection. Riot/network errors retry rather than count as failed ownership. Shared-game lookup failures also retry; a successful lookup with no common games rejects the rating.
- A guest author is recorded through `GuestRatingIdentity`, without reserving a Riot account on an inaccessible login. Subsequent signed-in ratings also check that identity for duplicates and quotas.
- The browser saves the scoped rating receipt in session storage, so a refresh can recover its status. The server continues processing after the browser closes. Receipts expire after seven days; draft submission is limited to one hour and unconfirmed challenges to 15 minutes.

## Entry points

- `/authenticate`: signed-in account connection, shared icon confirmation component.
- `/rate/[username]`: guest or signed-in rating; accepts pending proof without waiting for Riot.
- Profile Give Feedback: viewers without a verified Riot account go to the rating flow. Existing verified users keep their current feedback form.
- Legacy `/api/user/verify-riot`, `/verify/riot`, and `/verify/riot/by-summoner` return HTTP 410. Client-selected icons must never grant verified status or a login token.

## Deployment order

1. Apply `prisma migrate deploy`, including `20260822110000_add_riot_verification_attempts`, `20260904120000_pending_ratings`, and `20260904150000_rating_eligibility_evidence`.
2. Generate Prisma Client, build and restart all API instances on this revision. Stop old API instances before exposing the new guest flow: old workers assume every challenge has a user.
3. Confirm the API process is running `startRiotConnectionVerifier`. This is a persistent API-process worker, not a browser timer or a Vercel frontend job.
4. Deploy the frontend. The API and frontend are separate deployments; a frontend-only deployment will leave the new endpoints unavailable.
5. Smoke-test a real Riot account: confirm the assigned icon, submit a rating, inspect private pending status, and verify exactly one public rating/notification after the final successful check and shared-game lookup. Repeat a final mismatch and an API outage scenario before treating rollout as verified.

Do not roll the API back to a pre-migration worker while guest attempts are active. The old worker is not compatible with nullable challenge owners.

## Regression tests

Run Jest with `--runInBand --config jest.config.cjs --runTestsByPath` and these files:

- `apps/api/__tests__/riotVerificationChallenge.test.ts`
- `apps/api/__tests__/riotConnectionVerifier.test.ts`
- `apps/api/__tests__/optimisticRateRoutes.test.ts`
- `apps/api/__tests__/pendingRatings.test.ts`
- `apps/api/__tests__/verifyRiot.test.ts`

These tests use mocked Riot and database access. They cover contracts and failure handling, but do not replace PostgreSQL migration/transaction testing or a real Riot verification cycle.
