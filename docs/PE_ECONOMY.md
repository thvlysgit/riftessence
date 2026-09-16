# Prismatic Essence and daily games

## Product rules

PE is earned through challenges and daily games, then spent on permanent cosmetics. It cannot be wagered, transferred, redeemed for cash, or exchanged for advertising. Existing PE balances, unlock keys, prestige badges, quest claims and transaction history are preserved.

Default rewards (editable at `/admin/prismatic`):

| Reward                       |  PE |
| ---------------------------- | --: |
| New wallet welcome grant     | 400 |
| Daily check-in               |  60 |
| Daily two-way conversation   |  40 |
| Champion Archive daily solve |  60 |
| Soundcheck daily solve       |  60 |
| Shopkeeper perfect score     |  60 |
| Recipe Rush flawless crafts  |  60 |
| Combined daily game cap      | 120 |

The recurring maximum is 220 PE per player per UTC day, excluding welcome grants and existing one-time milestones. One-way message spam does not qualify for the daily conversation reward. Enabling Discord DMs is no longer a rewarded action. Support-server membership requires a verified Discord guild-membership response; a community named “support” is insufficient.

Existing starter grants are not reissued. Positive legacy RiftCoins convert 1:1 to PE on the next wallet access, once, with a ledger entry; conversion does not add lifetime earnings or XP again. Historic lifetime-counter database column names remain mapped with Prisma `@map` for compatibility. XP is earned from positive quest/game rewards, never admin adjustments or purchases. Level = floor(XP / 1,000) + 1; migration backfills XP from existing positive quest entries.

## Games and attribution

- `/games/archive`: six guesses using five clue types selected at round creation from role, typical lanes, gender, lore region, skins, range, resource and release date. The selected types are shown before guessing and remain fixed through reloads. Existing cases retain their previous four clues. Lanes are typical positions rather than live pick-rate rankings. Each row displays the guessed champion’s own skin count; the arrow compares it to the answer. Inspired by [LoLdle](https://loldle.net/), credited in-game. Each guess after the first reduces the offered reward by 10 PE.
- `/games/soundcheck`: guess a champion from their actual Q/W/E/R ability sounds, not music or voice lines. Inspired by [League of Listen by Lynge](https://lynge.tv/listen/), credited in-game. Initial curated pool: 26 champions, 104 audio clips.
- `/games/shopkeeper`: six higher-or-lower comparisons using total shop prices from Riot's Data Dragon, pinned to patch 16.18.1. Each pair has different prices; twelve distinct items appear per round. Both prices are revealed after each answer. Completing all six awards `floor(offered reward × correct answers / 6)` (10 PE per correct answer by default), subject to the shared daily cap. Practice pays nothing. The admin report counts a perfect score as solved. Item pairs and prices are saved with the round. Valid pairs keep their pinned prices; invalid unplayed legacy pairs are repaired on read. Completed comparisons and rewards are preserved.
- `/games/recipe-rush`: three final items (two-component epic, two-component legendary, then a legendary with at least three ingredients). Some legendary rounds require crafting their epic components first, including nested epic recipes, before final assembly. Drag a piece onto the forge, tap it, or focus it and press Enter/Space. Each action adds exactly one copy. New rounds have ten unique tray items that replenish after use; duplicate ingredients require deliberate repeated uses of the same button. Four decoy slots prioritize related stats, shared build ingredients, and similar prices, with remaining decoys drawn more broadly from components and epics. Recipes, crafting steps, and tray state are pinned with the round. Already-started original rounds retain their previous rules and progress.
- Champion data/artwork and ability demonstration audio originate from Riot Games. The game implementations are independent; neither original game's code or recordings were copied. Third-party assets are not covered by this repository's software license. See `apps/api/assets/soundcheck/README.md`.

Each daily game is persisted once per account/game/UTC date. The daily answer is selected server-side with HMAC using the existing `JWT_SECRET`; use the same secret and catalog across API replicas. Do not rotate the secret or replace the catalog mid-day unless accepting that newly started rounds may receive a different answer. Practice uses random answers, pays no PE, reuses unfinished rounds, and is limited to 100 new rounds per account/day.

The browser never decides whether an answer is correct or how much to award. It receives champion choices, prior guesses and comparisons, not an unfinished round's answer. Audio is authenticated, served as stripped audio-only MP3 bytes under opaque round/slot URLs, and marked private/no-store; source filenames and champion-specific ability names are withheld until completion. Like any daily puzzle, answers can still be shared between players. Rewards are capped, not claimed to be cheat-proof.

Round base rewards are offered when the round starts. Changing reward values affects new rounds. Soundcheck records distinct ability slots when audio is served; each additional slot after the first reduces the offered reward by 10 PE. Replays and additional Soundcheck guesses are free. Deductions have a zero floor, persist across refreshes, and use the same transaction lock as guesses. Completed rewards are unchanged by subsequent listening. The current cap and pause switch apply when awarding every completed game, including an already-started round. Practice, failed champion rounds, expired daily rounds and repeated submissions never award PE. Shopkeeper pays for correct comparisons when its round is completed. Pausing rewards leaves games playable. The shared daily game cap remains 120 PE across all four games.

Game pages display a countdown to the next UTC reset and links to another game after completion. Their suggestion banner accepts a free-form idea from signed-in users (10–3,000 characters, up to five submissions per rolling day). Suggestions and in-app admin notifications commit together; identical pending ideas are deduplicated. Admins review, mark reviewed, or reopen ideas at `/admin/game-suggestions`.

Shopkeeper validates same-tier pairing at generation and whenever reading an unfinished round. Reviewed tiers live in `scripts/item-tiers.json`; catalog sync refuses unclassified IDs rather than guessing from recipe edges. Basic Boots are a component, upgraded boots have a separate pool, and Tear is a starter. Epic, legendary, starter, and consumable pools stay separate. Ties and repeated items are excluded. Legacy mixed-tier pairs are repaired deterministically only while unanswered. The client submits the displayed comparison token, and stale tabs receive HTTP 409 without consuming an attempt. Repaired comparisons retain their own artwork/price patch; answered history and rewards are preserved. Drag the mystery card 64 pixels left/right to commit, or use the focused card's arrow keys or the equivalent buttons. Short drags and cancelled touches do not submit. Gold and red cues include text; price tags reveal after the server accepts an answer. The six-slot coin tray tracks correct/missed comparisons, while the finale counts only the actual PE payout.

Champion Archive presents guesses as portraits with staggered clue stamps. See `apps/api/src/data/ARCHIVE_METADATA.md` for metadata sources and curation rules. Its suspect roster supports manual pins and eliminations, stored locally per account and round. These notes never submit guesses or automatically filter the answer. Completed rounds reveal the champion's splash; failed rounds also show the answer's clue values. Soundcheck uses illuminated pads with visible listen costs, a Web Audio waveform from the actual clip, a playback progress bar, and a finale that names the abilities and highlights the opened pads. Native audio controls remain available. Optional synthesized effects default off and share a device preference across games. Reduced-motion preferences disable decorative animations and the moving waveform.

To refresh assets, with Node and FFmpeg available:

```sh
node scripts/sync-game-catalog.cjs 16.10.1
node scripts/sync-game-catalog.cjs 16.18.1 --skins-only
node scripts/build-soundcheck-audio.cjs /path/to/ffmpeg
node scripts/sync-item-catalog.cjs 16.18.1
```

Review the generated catalog, audio manifest and every changed clip before release. The sync uses a pinned Data Dragon version and CommunityDragon's ability-video source metadata. Runtime games have no dependency on those metadata endpoints. Audio is bundled in the API image by its existing repository copy step; no FFmpeg dependency is needed in production.

`--skins-only` refreshes counts without changing the champion roster, clue attributes, or audio metadata. Skin counts currently use patch 16.18.1 (`skinVersion` in the catalog). Data Dragon includes chromas as separate entries; these are excluded using `parentSkin`, including chromas of the base appearance where the parent is zero. Skins that have chromas still count, as do separately listed prestige editions.

The item sync uses a curated standard-shop ID list, filtered to purchasable Summoner's Rift items with a positive total price. Review that list when new items arrive; mode variants and free transformations are excluded. Item icons are loaded from the pinned Data Dragon CDN version.

Collection font previews and equipped usernames use self-hosted font files in `apps/web/public/fonts`, loaded by `cosmetic-fonts.css`. Each family has its own SIL Open Font License under `fonts/licenses`. Browsers fetch a font only when the current page uses it.

Recipe Rush awards once when all three recipes have been crafted or revealed:
`max(0, floor(rewardOffer × crafted / 3) - 10 × mistakes)`, then applies
the current shared daily cap and rewards switch. At the default offer, each craft
is worth 20 PE and each mistake deducts 10 PE from the round, including mistakes
while preparing components. Wrong items and surplus copies count as mistakes;
each wrong item is charged only once per crafting step. Revealing skips the whole
remaining build and earns no share for that final item. New add requests include
the saved step and revision: retries and stale requests cannot add an extra copy,
charge again, or answer the next step. Cross-game answer endpoints are rejected.
The current step's target and final item are visible; unfinished ingredient lists
and future rounds stay server-only. Completed steps and results show recipes for
learning. Preparing components does not award a separate reward.

The daily forge is untimed. Free practice and the optional 90-second challenge
have separate resumable rounds and pay no PE. The challenge deadline is stored
on the server, survives reloads, and is checked before every action. Timeouts
reveal remaining recipes. Both modes count toward the existing 100-practice-round
limit. A practice URL retains its mode across reloads.

Refresh recipe data after syncing the item catalog:

```sh
node scripts/sync-recipe-catalog.cjs
```

The generator preserves direct Data Dragon recipe multiplicities (including
single-ingredient epic upgrades), pins item stat tags for decoy selection, checks
every ingredient against the curated shop catalog, and verifies all three stage pools.
Both catalogs must have the same patch. The generated forge backdrop lives in
`apps/web/public/assets/games/recipe-forge.png`; see its adjacent attribution file.

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
   Apply `20260911090000_item_price_game` before deploying Shopkeeper; it adds saved item puzzles and the configurable perfect-score reward.
   Apply `20260916120000_archive_clue_types` before deploying variable Archive clues, then regenerate Prisma and rebuild both API and web. Shopkeeper clients must send the current comparison token.
   Apply `20260916160000_recipe_rush` before deploying Recipe Rush; it adds saved forge puzzles and the independently configurable `recipeReward` (default 60). Regenerate Prisma and rebuild API/web together.
4. Check the economy dashboard and make any deliberate reward adjustments with an audit reason.

**Historical migration caveat:** replaying this repository's complete migration chain onto an empty database currently fails in pre-existing `0003_update_notification_system`, which references `Notification` before it exists. This change does not rewrite applied historical migrations. The new migration was separately verified against a schema generated from the preceding revision, with seeded legacy balance, counters, ownership and credits. Resolve fresh-install baselining separately; do not reset or `db push` a live database.

The `economy-safety` CI job uses an isolated PostgreSQL 15 service and the current schema for integration tests. To run the same suite locally, provision a dedicated database whose name ends in `_test`, push the schema into **that disposable database only**, and set `TEST_DATABASE_URL` to its local connection URL:

```sh
pnpm exec prisma generate --schema=prisma/schema.prisma
pnpm exec jest --runInBand --config jest.config.cjs --runTestsByPath apps/api/__tests__/recipeRush.test.ts apps/api/__tests__/archiveClues.test.ts apps/api/__tests__/dailyGames.test.ts apps/api/__tests__/itemPriceGame.test.ts apps/api/__tests__/economy.integration.test.ts
```

Without `TEST_DATABASE_URL`, the database suite is skipped. It deliberately refuses arbitrary database names/remote hosts and never falls back to `DATABASE_URL`. It modifies global reward settings temporarily, restores them afterward, and deletes only its own generated records. Do not share its database with a running application.
