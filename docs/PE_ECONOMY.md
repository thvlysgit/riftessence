# Prismatic Essence and daily games

## Product rules

PE is earned through challenges and daily champion games, then spent on permanent cosmetics. It cannot be wagered, transferred, redeemed for cash, or exchanged for advertising. Existing PE balances, unlock keys, prestige badges, quest claims and transaction history are preserved.

Default rewards (editable at `/admin/prismatic`):

| Reward                       |  PE |
| ---------------------------- | --: |
| New wallet welcome grant     | 400 |
| Daily check-in               |  60 |
| Daily two-way conversation   |  40 |
| Champion Archive daily solve |  60 |
| Soundcheck daily solve       |  60 |
| Combined daily game cap      | 120 |

The recurring maximum is 220 PE per player per UTC day, excluding welcome grants and existing one-time milestones. One-way message spam does not qualify for the daily conversation reward. Enabling Discord DMs is no longer a rewarded action. Support-server membership requires a verified Discord guild-membership response; a community named “support” is insufficient.

Existing starter grants are not reissued. Positive legacy RiftCoins convert 1:1 to PE on the next wallet access, once, with a ledger entry; conversion does not add lifetime earnings or XP again. Historic lifetime-counter database column names remain mapped with Prisma `@map` for compatibility. XP is earned from positive quest/game rewards, never admin adjustments or purchases. Level = floor(XP / 1,000) + 1; migration backfills XP from existing positive quest entries.

## Games and attribution

- `/games/archive`: six guesses using role, resource, attack range and skin-count clues (excluding the base appearance). Inspired by [LoLdle](https://loldle.net/), credited in-game. Each guess after the first reduces the offered reward by 10 PE.
- `/games/soundcheck`: guess a champion from their actual Q/W/E/R ability sounds, not music or voice lines. Inspired by [League of Listen by Lynge](https://lynge.tv/listen/), credited in-game. Initial curated pool: 26 champions, 104 audio clips.
- Champion data/artwork and ability demonstration audio originate from Riot Games. The game implementations are independent; neither original game's code or recordings were copied. Third-party assets are not covered by this repository's software license. See `apps/api/assets/soundcheck/README.md`.

Each daily game is persisted once per account/game/UTC date. The daily answer is selected server-side with HMAC using the existing `JWT_SECRET`; use the same secret and catalog across API replicas. Do not rotate the secret or replace the catalog mid-day unless accepting that newly started rounds may receive a different answer. Practice uses random answers, pays no PE, reuses unfinished rounds, and is limited to 100 new rounds per account/day.

The browser never decides whether an answer is correct or how much to award. It receives champion choices, prior guesses and comparisons, not an unfinished round's answer. Audio is authenticated, served as stripped audio-only MP3 bytes under opaque round/slot URLs, and marked private/no-store; source filenames and champion-specific ability names are withheld until completion. Like any daily puzzle, answers can still be shared between players. Rewards are capped, not claimed to be cheat-proof.

Round base rewards are offered when the round starts. Changing reward values affects new rounds. Soundcheck records distinct ability slots when audio is served; each additional slot after the first reduces the offered reward by 10 PE. Replays and additional Soundcheck guesses are free. Deductions have a zero floor, persist across refreshes, and use the same transaction lock as guesses. Completed rewards are unchanged by subsequent listening. The current cap and pause switch apply when awarding every win, including an already-started round. Practice, failed rounds, expired daily rounds and repeated submissions never award PE. Pausing rewards leaves games playable.

Game pages display a countdown to the next UTC reset and links to another game after completion. Their suggestion banner accepts a free-form idea from signed-in users (10–3,000 characters, up to five submissions per rolling day). Suggestions and in-app admin notifications commit together; identical pending ideas are deduplicated. Admins review, mark reviewed, or reopen ideas at `/admin/game-suggestions`.

To refresh assets, with Node and FFmpeg available:

```sh
node scripts/sync-game-catalog.cjs 16.10.1
node scripts/build-soundcheck-audio.cjs /path/to/ffmpeg
```

Review the generated catalog, audio manifest and every changed clip before release. The sync uses a pinned Data Dragon version and CommunityDragon's ability-video source metadata. Runtime games have no dependency on those metadata endpoints. Audio is bundled in the API image by its existing repository copy step; no FFmpeg dependency is needed in production.

## Wallet safety

All economy mutations acquire the same PostgreSQL `User` row lock before creating/updating that user's wallet. Balance changes, ledger entries, unlocks, claims, round completion and adjustment audit records commit together. Conditional debits prevent overdrafts; duplicate daily claims have a database uniqueness constraint.

Purchases and admin adjustments require a UUID `Idempotency-Key`. Retrying the same key/payload returns its prior result without charging or granting again. Reusing a key with another payload returns 409. Daily claims and game submissions use their own durable natural keys. Do not add direct wallet writers elsewhere without using `withWallet` and `postEntry`.

Admins can inspect circulation, period earnings/spending, daily flows, sources/sinks, balance distribution, median balance, active wallets, game completion and recent ledger activity. Reports exclude legacy conversions from minted PE. Reconciliation warnings compare balances with PE ledger sums; they flag historic discrepancies without silently “fixing” user balances. Settings edits and manual adjustments require a reason and are audited. Settings use version checking to reject stale concurrent admin edits.

## Advertising

The request form strongly encourages a Discord username, especially for accounts without linked Discord. If the contact is blank, the API uses the linked Discord username when available. Contact details and free-form special requests are stored for staff review and excluded from public ad responses. Admin notifications link directly to `/admin/ads?tab=requests`.

`/advertise` is linked from the footer. Submitting an inquiry consumes neither PE nor legacy ad credits. At most three requests may await review; an identical pending title/destination returns the existing inquiry without notifying admins again. Staff review remains at `/admin/ads`; publishing terms must be agreed separately. There is no checkout or invented advertising price in this change.

New requests record `requestCreditsSpent = 0`. Existing requests retain null and retain the old duration-based credit refund behavior if rejected. Existing unused credits are preserved for staff reconciliation, not deleted or converted. `/adspace` redirects to `/advertise`; `/purse/gamble` redirects to `/games`. Old PE wagering/cache/advertising-purchase API routes return 410.

## Deployment and checks

1. Back up the application database and review its migration status.
2. Apply `20260907010000_pe_daily_games` via the normal `prisma migrate deploy` workflow before serving the new API. Generate the Prisma client at build time. The migration preserves balances and ownership; its nonnegative-balance constraint is `NOT VALID` so it checks new writes without silently rewriting historical inconsistencies.
3. Rebuild API and web together. Existing API images bundle the audio files. No credentials beyond the existing database/JWT configuration are required for games.
   Apply `20260907120000_game_feedback_and_rewards` before deploying the corresponding game and advertising changes; it adds listening history, game suggestions, and staff-only ad request fields.
4. Check the economy dashboard and make any deliberate reward adjustments with an audit reason.

**Historical migration caveat:** replaying this repository's complete migration chain onto an empty database currently fails in pre-existing `0003_update_notification_system`, which references `Notification` before it exists. This change does not rewrite applied historical migrations. The new migration was separately verified against a schema generated from the preceding revision, with seeded legacy balance, counters, ownership and credits. Resolve fresh-install baselining separately; do not reset or `db push` a live database.

The `economy-safety` CI job uses an isolated PostgreSQL 15 service and the current schema for integration tests. To run the same suite locally, provision a dedicated database whose name ends in `_test`, push the schema into **that disposable database only**, and set `TEST_DATABASE_URL` to its local connection URL:

```sh
pnpm exec prisma generate --schema=prisma/schema.prisma
pnpm exec jest --runInBand --config jest.config.cjs --runTestsByPath apps/api/__tests__/dailyGames.test.ts apps/api/__tests__/economy.integration.test.ts
```

Without `TEST_DATABASE_URL`, the database suite is skipped. It deliberately refuses arbitrary database names/remote hosts and never falls back to `DATABASE_URL`. It modifies global reward settings temporarily, restores them afterward, and deletes only its own generated records. Do not share its database with a running application.
