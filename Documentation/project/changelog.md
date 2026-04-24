# Changelog

> Last updated: 2026-04-24

---

## 2026-04-24 - Discord /send-draft and Server-Backed Team Draft Library

### Objective: Allow Discord staff to send a saved RiftEssence draft directly into a Discord channel using guided menus and strict prerequisite checks

Overview: Added persistent team draft storage on the backend (instead of browser-only state) and introduced a new Discord bot slash command `/send-draft` that enforces account-link, team-membership, permission, and saved-draft prerequisites before posting a draft embed.

Changes:

- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added `/import-champion-emojis` slash command for bulk champion emoji import from Data Dragon.
  - Supports deterministic `batch` selection (`1` to `4`) and respects the guild's real emoji capacity based on boost tier.
  - Added optional `replace_existing` mode for re-imports.
  - Added import summary reporting (created/failed/skipped/capacity) and structured logging for troubleshooting.
- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added `TeamDraft` model with team relation, author relation, ban arrays, and pick JSON payload.
  - Linked `TeamDraft` to `Team` and `User` relations for ownership/audit and access control.
- Added [add_team_drafts.sql](add_team_drafts.sql):
  - SQL script to create the `TeamDraft` table and supporting indexes in PostgreSQL.
- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - Added authenticated team draft CRUD routes:
    - `GET /api/teams/:id/drafts`
    - `POST /api/teams/:id/drafts`
    - `PUT /api/teams/:id/drafts/:draftId`
    - `DELETE /api/teams/:id/drafts/:draftId`
  - Added bot-authenticated routes used by Discord `/send-draft`:
    - `GET /api/teams/discord-drafts/options`
    - `GET /api/teams/discord-drafts/:draftId`
  - Added defensive payload validation and explicit server-side rejection reasons for missing prerequisites.
- Updated [apps/web/pages/teams/drafts.tsx](apps/web/pages/teams/drafts.tsx):
  - Switched multi-draft save/load/delete from localStorage to backend API persistence per selected team.
  - Kept team-level draft library UX (save as new, overwrite, load, delete) while making drafts available cross-device and to the Discord bot.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added new `/send-draft` slash command.
  - Added interactive menu flow:
    - choose team,
    - choose saved draft,
    - post formatted draft embed to the current channel.
  - Enforced Discord-side permission gate (`Manage Server` or `Administrator`) and surfaced clear error messaging for account-link/team-membership/no-draft cases.

## 2026-04-24 - Teams Draft Room Tournament Layout and Suggestion Enhancements

### Objective: Correct draft UX flow for tournament-style picks, fix lane-role icon fidelity, and expose full champion selection coverage

Overview: Updated the Teams Draft Room to match tournament pick expectations (round-labeled lanes with blue-left and red-right picks), corrected role iconography to match existing project role visuals, added a local multi-draft library, made the champion picker include all available champions with search, and added draft suggestions derived from player champion pools.

Changes:

- Updated [apps/web/pages/teams/drafts.tsx](apps/web/pages/teams/drafts.tsx):
  - Replaced draft role icon rendering with the same lane visual set used elsewhere in the app (Top/Jungle/Mid/ADC/Support).
  - Normalized role icon coloring so every lane button now uses one neutral shared color instead of the previous yellow tint.
  - Swapped the ADC lane icon to the existing bot-lane asset used elsewhere in the app.
  - Switched pick panel presentation to tournament-style rows labeled `R1` through `R5`, with blue-side picks consistently on the left and red-side picks on the right.
  - Preserved true pick turn ordering metadata while improving side readability (`Turn 1` through `Turn 10`).
  - Removed champion picker truncation and now surfaces the full merged champion list.
  - Added champion search input for large-list usability.
  - Added a local draft library that can save multiple named drafts, reopen the last active draft, and delete or overwrite saved entries.
  - Added pool-based drafting suggestions section:
    - scores champions by tier-weighted presence across player pools,
    - highlights strongest available picks not yet used in bans/picks,
    - supports drag-and-drop directly from suggestions.
  - Auto-selects a hardcoded typical role when a champion is dropped into an unassigned pick slot.

Validation:

- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.

---

## 2026-04-23 - Owner Crown Decoupling and Draft Room Interaction Overhaul

### Objective: Decouple ownership from rigid team role constraints and align draft tooling with player-only, pick-order-first workflows

Overview: Updated team ownership behavior so ownership is represented as a crown/permission marker rather than a hard role constraint, while preserving role-based roster workflows. Reworked the Teams Draft Room to use player-only pools, tier-aware icon presentation, drag-and-drop interactions, and pick-order-first planning with icon-only role assignment controls.

Changes:

- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - Team creation now seeds the owner member record with a normal role (`SUBS`) while ownership permissions remain tied to `team.ownerId`.
  - Ownership transfer no longer force-overwrites both members into `MANAGER`/`OWNER` role states.
  - Added backward-compatibility conversion for legacy previous-owner `OWNER` role entries to `MANAGER` at transfer time.
  - Removed the API guard that blocked editing the team owner's role, so owners can hold normal player/staff roles.
- Updated [apps/web/pages/teams/[id].tsx](apps/web/pages/teams/[id].tsx):
  - Ownership transfer confirmation copy now reflects non-destructive role semantics.
  - Transfer target picker now excludes only the current owner (instead of filtering by `OWNER` role).
  - Added explicit owner crown badge next to owner usernames in roster rows.
  - Role editing UI no longer blocks owner rows based on role value.
  - Remove-member button visibility now correctly keys off `ownerId`, not `OWNER` role.
- Updated [apps/web/pages/teams/dashboard.tsx](apps/web/pages/teams/dashboard.tsx):
  - Dashboard role chips now present ownership as a crown marker while keeping the actual role visible (`Owner • <role>`).
- Reworked [apps/web/pages/teams/drafts.tsx](apps/web/pages/teams/drafts.tsx):
  - Champion pool source is now player-only (staff excluded).
  - Left panel now renders tier-grouped champion icons with tier-colored borders and discreet tier labels.
  - Added drag-and-drop champion assignment into bans and picks.
  - Draft flow now uses pick order slots instead of static role-member pairing.
  - Added icon-only role picker controls per pick slot (no text dropdown role selector).

Validation:

- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/api build` passes.

---

## 2026-04-23 - Team Draft Room with Centralized Champion Pools

### Objective: Add a dedicated Teams page for centralized member champion pools and scenario-based draft planning

Overview: Added a new Teams Draft Room page that mirrors existing team-selector patterns, aggregates each team member's champion pool into a centralized view, and provides an interactive draft imager for planning blue/red side picks and bans per scenario.

Changes:

- Added [apps/web/pages/teams/drafts.tsx](apps/web/pages/teams/drafts.tsx):
  - Added authenticated Teams Draft Room route at `/teams/drafts`.
  - Implemented team selector flow using existing `/api/teams` access pattern.
  - Added centralized member champion pool view by resolving member profile pools through `/api/user/profile?username=...`.
  - Added combined team-priority champion suggestions based on shared pool coverage.
  - Added interactive draft imager with:
    - blue/red side toggle,
    - five bans per side,
    - role-locked pick slots (`TOP`, `JGL`, `MID`, `ADC`, `SUP`),
    - per-slot member assignment,
    - slot-targeted champion quick-fill suggestions.
- Updated [apps/web/components/Navbar.tsx](apps/web/components/Navbar.tsx):
  - Added `Draft Room` link under Teams desktop dropdown.
  - Added `Draft Room` link in mobile Teams navigation list.
- Updated [apps/web/pages/teams/dashboard.tsx](apps/web/pages/teams/dashboard.tsx):
  - Added localized `draftRoom` label to page text dictionaries.
  - Added a new quick-action card linking to `/teams/drafts`.

Validation:

- Pending after code edits in this session.

---

## 2026-04-22 - Teams and Purse Localization, Matchup Tag Simplification, and Riot Branding

### Objective: Translate the remaining Teams and purse surfaces, simplify matchup marketplace featured labeling, and normalize Riot-branded auth buttons

Overview: Added localized copy coverage to the main Teams dashboard, Team Schedule, Team Discord settings, team detail header, purse overview, and purse gamble pages; removed the separate Trending/Best Rated marketplace sections in favor of inline tags; and replaced the login/register/settings Riot action styling with a Riot-branded button using the Riot logo.

Changes:

- Updated [apps/web/pages/teams/dashboard.tsx](apps/web/pages/teams/dashboard.tsx):
  - Added page-local bilingual copy for the primary Teams dashboard header, empty state, and quick action cards.
- Updated [apps/web/pages/teams/schedule.tsx](apps/web/pages/teams/schedule.tsx):
  - Added bilingual labels for the main schedule header, view toggles, and key action button.
- Updated [apps/web/pages/teams/discord.tsx](apps/web/pages/teams/discord.tsx):
  - Added bilingual labels for the main Discord settings header, empty state, webhook intro, and bot invite CTA.
- Updated [apps/web/pages/teams/[id].tsx](apps/web/pages/teams/[id].tsx):
  - Added localized title/fallback copy for the team detail header.
- Updated [apps/web/pages/purse.tsx](apps/web/pages/purse.tsx):
  - Added bilingual purse overview copy for the login state, hero section, summary cards, quests, quick actions, and transaction timeline.
- Updated [apps/web/pages/purse/gamble.tsx](apps/web/pages/purse/gamble.tsx):
  - Added bilingual game copy for the login card, page hero, available-games panel, round play panel, and last-result summary.
- Updated [apps/web/pages/matchups/marketplace.tsx](apps/web/pages/matchups/marketplace.tsx):
  - Removed the separate Trending and Best Rated featured sections.
  - Kept featured matchups as inline labels only.
- Added [apps/web/components/RiotBrand.tsx](apps/web/components/RiotBrand.tsx):
  - Added a reusable Riot-auth button with Riot logo styling.
- Updated [apps/web/pages/login.tsx](apps/web/pages/login.tsx), [apps/web/pages/register.tsx](apps/web/pages/register.tsx), and [apps/web/pages/settings.tsx](apps/web/pages/settings.tsx):
  - Swapped the Riot auth action buttons to the new Riot-branded button component.

Validation:

- Pending after code edits in this session.

---

## 2026-04-22 - French Locale Completion and Gameplay Glossary Alignment

### Objective: Complete and humanize French UI localization while keeping core gameplay terms in English

Overview: Finalized French locale quality in the web translation dictionary with more natural phrasing across major user flows, while enforcing a consistent glossary policy that keeps competitive League terminology in English for clarity.

Changes:

- Updated [apps/web/translations/index.ts](apps/web/translations/index.ts):
  - Polished FR wording for clearer, more natural user-facing language across auth, feed, LFT, coaching, profile, legal, and matchup surfaces.
  - Enforced glossary-driven English gameplay terms (for example: LFT, Duo/Flex, Top/Jungle/Mid/Bot/Support, rank names Iron through Unranked, Winrate/Elo/Tier, and coaching/matchup terms such as Wave Management, Teamfighting, Skill Matchup, and Items & Runes).
  - Preserved all translation key coverage and runtime placeholders used by the app.
  - Corrected FR `terms.section4Description1` so ownership/licensing meaning now matches EN legal text.

Validation:

- `pnpm --filter @lfd/web lint` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- Non-blocking lint warning observed:
  - Next.js ESLint plugin not detected in current ESLint configuration.

---

## 2026-04-22 - Profile Playstyle Tooltip Bubbles and Anonymous Discoverability Hint

### Objective: Improve profile clarity by exposing playstyle meanings and anonymous-mode discoverability impact without changing behavior

Overview: Added hover/focus tooltip bubbles for all playstyle cards in both edit and read-only profile modes using exact description mappings, and added an info icon tooltip beside the anonymous mode switch to clarify discoverability scope.

Changes:

- Updated [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx):
  - Added explicit playstyle description mappings for `FUNDAMENTALS`, `Scaling`, `Snowball`, `CoinFlips`, and `Controlled Chaos` using the provided copy.
  - Added hover/focus tooltip bubbles to every playstyle card in edit mode.
  - Added hover/focus tooltip bubbles to every playstyle card in read-only mode.
  - Added a small info icon next to the anonymous mode toggle with tooltip copy: `Controls public search/discoverability visibility.`
  - Kept existing selection, save, and anonymous mode toggle behavior unchanged.

Validation:

- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.
- Non-blocking build warnings observed:
  - Next.js ESLint plugin not detected in current ESLint configuration.
  - Custom webpack configuration disables webpack build worker by default.

---

## 2026-04-21 - Password Recovery SMTP Runtime Config Clarification

### Objective: Prevent false confusion where user email exists but reset mail is disabled by missing SMTP runtime config

Overview: Clarified and wired password-recovery SMTP runtime variables so deployments can enable forgot-password emails without code changes. The forgot-password flow correctly checks SMTP transport availability before checking account records, so these settings must be present in runtime env.

Changes:

- Updated [docker-compose.yml](docker-compose.yml):
  - Added API service environment passthrough/defaults for `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, and `PASSWORD_RESET_TOKEN_TTL_MINUTES`.
- Updated [.env.example](.env.example):
  - Added `FRONTEND_URL` sample value.
  - Added dedicated email recovery section documenting all SMTP/password-reset variables.

Validation:

- Compose/env shape validated by repository parsing (no application code path changes).

---

## 2026-04-21 - Accessibility Updates for Auth Recovery, Scrims Tutorial Placeholder, and Onboarding Flexibility

### Objective: Reduce login friction and remove hard blockers during first-time setup

Overview: Added end-to-end password recovery by email (with Riot sign-in still supported as an alternate recovery path), removed public editing of the scrims tutorial video URL in favor of an env-controlled placeholder, and made onboarding no longer block users who cannot link Riot immediately.

Changes:

- Updated [apps/api/src/validation.ts](apps/api/src/validation.ts):
  - Added `ForgotPasswordSchema` for email-based reset requests.
  - Added `ResetPasswordSchema` for token + new password reset submissions.
- Updated [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts):
  - Added `POST /api/auth/forgot-password` with non-enumerating account responses.
  - Added `POST /api/auth/reset-password` with expiring JWT reset tokens.
  - Added token fingerprint invalidation so reset links become unusable after password changes.
  - Added SMTP mailer integration for reset email dispatch.
- Updated [apps/api/src/env.ts](apps/api/src/env.ts):
  - Added optional SMTP/password-reset environment variable validation keys.
- Updated [apps/api/package.json](apps/api/package.json):
  - Added `nodemailer` dependency and `@types/nodemailer` dev dependency.
- Updated [apps/web/pages/login.tsx](apps/web/pages/login.tsx):
  - Added `Password Forgotten?` link.
  - Added explicit hint that Riot login can recover access and email recovery is available when linked.
- Added [apps/web/pages/forgot-password.tsx](apps/web/pages/forgot-password.tsx):
  - Implemented email recovery request UI.
  - Included Riot-vs-email recovery guidance messaging.
- Added [apps/web/pages/reset-password.tsx](apps/web/pages/reset-password.tsx):
  - Implemented reset link password update UI.
  - Added client-side password complexity checks before submit.
- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Removed public YouTube URL input.
  - Kept env-driven embed rendering via `NEXT_PUBLIC_SCRIMS_EXPLAINER_VIDEO_URL`.
  - Updated placeholder copy to communicate upcoming tutorial availability.
- Updated [apps/web/components/OnboardingWizard.tsx](apps/web/components/OnboardingWizard.tsx):
  - Made Riot-linking step skippable.
  - Added explicit `Link Riot Account Now` and `Skip Riot for Now` options.
  - Removed hard requirement that blocked closing onboarding without a Riot link.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.
- Non-blocking environment warnings observed during web build:
  - Next.js ESLint plugin not detected in current ESLint config.
  - Custom webpack configuration disables webpack build worker by default.

---

## 2026-04-21 - Scrim Date Guardrails, Proposal OP.GG Source Fix, Queue Visibility Toggles, and Tier Label Renames

### Objective: Improve scrim UX safety/clarity and align champion tier naming with player expectations

Overview: Added both frontend and backend guardrails to prevent publishing scrim posts in the past, corrected proposal notification OP.GG source to use the proposing team instead of the target post context, introduced temporary hide/show controls for Winner Agreement Queue and Post-Scrim Reviews (session-only, no database persistence), renamed champion tier labels in Profile and LFT surfaces, and added a built-in YouTube explainer placeholder flow on the scrims page that accepts a link directly.

Changes:

- Updated [apps/api/src/routes/scrims.ts](apps/api/src/routes/scrims.ts):
  - Added server-side validation rejecting `startTimeUtc` values in the past for `POST /api/scrims/posts`.
  - Updated scrim proposal notification message content to include the proposing team identity and OP.GG multisearch URL when available.
  - Updated incoming proposal payload shaping so proposal OP.GG data uses proposer team OP.GG.
  - Updated bot-facing scrim proposal notification payload shaping so OP.GG references proposer team scouting data.
- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Added client-side guard against submitting past start times.
  - Added `min` datetime constraint on scrim post start time input.
  - Added temporary hide/show toggles for `Winner Agreement Queue` and `Post-Scrim Reviews` (resets on reload by design).
  - Added YouTube explainer block with:
    - direct URL input placeholder,
    - automatic YouTube URL-to-embed conversion,
    - session-only preview behavior,
    - optional persistent default via `NEXT_PUBLIC_SCRIMS_EXPLAINER_VIDEO_URL`.
- Updated [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx):
  - Added proposer OP.GG quick-access link to incoming scrim proposal cards.
- Updated [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx):
  - Renamed champion tier labels:
    - `S` → `Fully Mastered`
    - `A` → `Mains`
    - `B` → `Playable`
    - `C` → `Want to Train`
- Updated [apps/web/pages/lft.tsx](apps/web/pages/lft.tsx):
  - Applied the same champion tier label rename mapping on LFT champion pool cards.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.
- Non-blocking environment warnings observed during web build:
  - Next.js ESLint plugin not detected in current ESLint config.
  - Custom webpack configuration disables webpack build worker by default.

---

## 2026-04-20 - Scrim Lifecycle Automation, Host Match-Code Controls, and Discord Forwarding Channels

### Objective: Complete host-owned scrim code lifecycle, add automated/manual result resolution signaling, and ensure scrim lifecycle updates route cleanly across app + Discord

Overview: Implemented end-to-end scrim lifecycle upgrades across schema, API, web UI, and Discord bot so host teams own code generation/regeneration, opponents receive live code-version updates, and result handling supports both Riot auto-check and manual agreement with escalation guidance when conflicts persist. Also added an optional dedicated Discord webhook override for scrim code lifecycle forwarding while keeping existing schedule webhook as default fallback.

Changes:

- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added lifecycle notification enum values (`SCRIM_SERIES_ACCEPTED`, `SCRIM_MATCH_CODE_REGENERATED`, `SCRIM_RESULT_*`).
  - Added `ScrimAutoResultStatus` + `ScrimResultSource` enums.
  - Extended `ScrimSeries` with match-code versioning, auto-result tracking, lobby-code trust markers, conflict counters, and escalation timestamps.
  - Added optional `Team.discordScrimCodeWebhookUrl` override.
- Added [prisma/migrations/20260420103000_add_scrim_series_lifecycle_and_auto_result/migration.sql](prisma/migrations/20260420103000_add_scrim_series_lifecycle_and_auto_result/migration.sql):
  - Added guarded enum values/types and additive scrim lifecycle columns/indexes.
  - Added optional team scrim-code webhook column.
- Updated [apps/api/src/routes/scrims.ts](apps/api/src/routes/scrims.ts):
  - Added lifecycle fanout helper for team-event notifications plus in-app notifications.
  - Added host-only endpoints:
    - `POST /api/scrims/series/:seriesId/match-code/regenerate`
    - `POST /api/scrims/series/:seriesId/lobby-code-used`
  - Added periodic + on-demand Riot auto-result sweep and series-level auto state metadata.
  - Added manual conflict escalation flow with support guidance payload.
  - Corrected lifecycle team-event notification type values to match Prisma notification enum keys (`SCRIM_RESULT_*`).
- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - Added read/write/clear support for `scrimCodeWebhookUrl` with webhook validation metadata.
- Updated [apps/api/src/routes/discordFeed.ts](apps/api/src/routes/discordFeed.ts):
  - For `SCRIM_*` lifecycle items, routing now prefers `discordScrimCodeWebhookUrl` when configured.
  - Falls back to standard team schedule webhook when override is absent.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added dedicated embed rendering for `SCRIM_*` lifecycle notifications.
  - Added Scrim Finder link CTA for lifecycle events and skipped legacy attendance actions.
  - Corrected lifecycle notification key handling to `SCRIM_RESULT_*` naming.
- Updated [apps/web/pages/teams/discord.tsx](apps/web/pages/teams/discord.tsx):
  - Added optional scrim-code webhook override field with validation feedback.
  - Clarified default fallback behavior to the main schedule webhook.
- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Added no-reload pending-series refresh and match-code popup trigger by code-version marker.
  - Added host-only match-code regenerate/mark-lobby controls in agreement card + popup.
  - Added visible auto-result/manual/escalation status metadata and conflict guidance.
  - Improved modal instructions to reinforce host ownership + fallback winner agreement path.
- Updated [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx):
  - Added lifecycle notification type mappings for `SCRIM_SERIES_ACCEPTED`, `SCRIM_MATCH_CODE_REGENERATED`, and `SCRIM_RESULT_*` variants.
- Updated [Documentation/architecture/api-contracts.md](Documentation/architecture/api-contracts.md):
  - Synced contracts for host-only match-code/lobby endpoints, expanded pending-results payload, and conflict escalation response shape.
  - Added team Discord settings contract notes for optional scrim-code webhook override.
- Updated [Documentation/architecture/database-schema.md](Documentation/architecture/database-schema.md):
  - Synced enum/model docs for `SCRIM_RESULT_*`, `ScrimAutoResultStatus`, `ScrimResultSource`, and `ScrimSeries` lifecycle fields/index.
- Updated [Documentation/backend/integrations.md](Documentation/backend/integrations.md):
  - Added scrim lifecycle delivery routing notes and auto-result environment variable reference.
- Updated [RASPBERRY_PI_DEPLOYMENT.md](RASPBERRY_PI_DEPLOYMENT.md):
  - Added Pi-focused environment defaults/tuning guidance for scrim auto-result sweep and conflict escalation support routing.

Validation:

- `pnpm prisma generate` passes.
- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.
- `pnpm -C discord-bot build` passes.
- Non-blocking environment warnings observed during web build:
  - Next.js ESLint plugin not detected in current ESLint config.
  - Custom webpack configuration disables webpack build worker by default.

Operational Notes:

- Apply migration `20260420103000_add_scrim_series_lifecycle_and_auto_result` before deploying API/web/bot updates.
- Deploy API and Discord bot together so lifecycle event delivery and rendering stay protocol-compatible.

---

## 2026-04-20 - Scrim Winner Agreement UX Clarification and Notifications Theme Normalization

### Objective: Make winner agreement unambiguous, surface match code usage clearly, and align Notifications page visuals with standard theme tokens

Overview: Refined the Scrim Finder winner agreement experience so teams now interact with explicit Winner and Loser sections, while making match code more prominent through inline emphasis plus a dedicated popup with copy action and decision guidance. Also normalized Notifications page styling to stable theme variables so it follows the regular theme-dependent appearance without undefined-style artifacts.

Changes:

- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Reworked winner agreement cards with clear `Winner Section` and `Loser Section` blocks.
  - Added prominent match code card per pending series with copy action.
  - Added match code popup modal with explicit flow guidance:
    - Option A: create lobby with code.
    - Option B: skip lobby creation and submit winner/loser agreement.
  - Improved first-report status messaging to show reported winner context.
  - Updated submit CTA to reflect selected winner.
- Updated [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx):
  - Replaced legacy/undefined style tokens (`bg-main`, `bg-elevated`, `shadow-md`, etc.) with standard theme tokens (`color-bg-*`, `color-text-*`, `color-border`, `shadow`).
  - Ensured cards and containers render with regular theme-dependent surfaces/colors.

Validation:

- `pnpm --filter ./apps/web build` passes.
- Non-blocking warning remains:
  - `pages/teams/scrims.tsx`: unused `SCRIM_FORMATS` constant.

---

## 2026-04-19 - Scrim Finder Post Moderation, Result Agreement, Team Reviews, and Winrate Surface

### Objective: Complete post-scrim lifecycle with moderation controls, enemy multi.gg event autofill, winner consensus, and public team reputation

Overview: Expanded Scrim Finder from proposal matching into full post-scrim lifecycle handling. Teams can now remove listings with proper moderation permissions, accepted proposals bootstrap a shared scrim series with auto-created team events (enemy multi.gg prefilled), both teams must agree on winner before results finalize, one directed team-pair review can be submitted with 3 scored criteria plus comment, and team pages now expose aggregate winrate and review sentiment.

Changes:

- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added `ScrimSeries` model for accepted-proposal match tracking, winner agreement fields, match code, and linked events.
  - Added `ScrimTeamReview` model for one-review-per-directed-team-pair with criteria scoring and optional comment.
  - Added `ScrimPost.series` inverse relation and team review/series relations on `Team`.
- Added [prisma/migrations/20260419233000_add_scrim_series_reviews/migration.sql](prisma/migrations/20260419233000_add_scrim_series_reviews/migration.sql):
  - Creates `ScrimSeries` and `ScrimTeamReview` tables, indexes, and FK/unique constraints.
- Updated [apps/api/src/routes/scrims.ts](apps/api/src/routes/scrims.ts):
  - Added creator/manager/admin scrim post deletion endpoint: `DELETE /api/scrims/posts/:postId`.
  - Feed payload now includes per-post `canDelete` capability.
  - On accepted proposal, auto-initializes `ScrimSeries`, generates match code, and creates/reuses SCRIM events for both teams.
  - Added pending result agreement API: `GET /api/scrims/series/pending-results`.
  - Added winner reporting/consensus API: `POST /api/scrims/series/:seriesId/result`.
  - Added review candidate API: `GET /api/scrims/reviews/candidates`.
  - Added team review submit API: `POST /api/scrims/reviews`.
- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - `GET /api/teams/:id` now returns:
    - `scrimPerformance` (`totalSeries`, `wins`, `losses`, `winRate`)
    - `scrimReputation` (`averageRating`, `reviewCount`, `recentReviews`)
- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Upgraded post action button styling under feed cards.
  - Added delete action for authorized users.
  - Added winner agreement panel with reporting team + winner selection.
  - Added post-scrim review panel (Politeness/Punctuality/Gameplay 1-5 + comment).
- Updated [apps/web/pages/teams/[id].tsx](apps/web/pages/teams/[id].tsx):
  - Added Scrim Performance & Reputation section showing winrate, W/L record, average rating, and recent public review comments.
- Updated [Documentation/architecture/api-contracts.md](Documentation/architecture/api-contracts.md):
  - Synced scrim contracts for post deletion permissions, accepted-proposal series/event bootstrap, winner agreement endpoints, review endpoints, and `/api/teams/:id` scrim aggregate payload fields.
- Updated [Documentation/architecture/database-schema.md](Documentation/architecture/database-schema.md):
  - Synced schema architecture docs for `ScrimSeries`, `ScrimTeamReview`, scrim relations on `Team`, scrim enums, and `TeamEvent.enemyMultigg`.

Validation:

- `pnpm prisma generate` passes.
- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter ./apps/web build` passes (non-blocking lint warning remains in `pages/teams/scrims.tsx` for unused `SCRIM_FORMATS`).

---

## 2026-04-19 - Scrim Finder Workflow Corrections (Notifications Relocation, Single Active Post, Discord Decisions)

### Objective: Align Scrim Finder behavior with final UX/ops expectations for proposal handling, posting semantics, and Discord interaction

Overview: Moved actionable incoming scrim proposal decisions to Notifications, enforced single-active-post replacement per team, removed redundant scrim URL/time proposal fields, and introduced a scrim-specific Discord notification queue with Accept/Delay/Reject buttons that no longer depends on generic chat DM forwarding.

Changes:

- Updated [apps/api/src/routes/scrims.ts](apps/api/src/routes/scrims.ts):
  - Added a dedicated bot-auth scrim Discord queue API:
    - `GET /api/scrims/discord-notifications`
    - `PATCH /api/scrims/discord-notifications/:id/processed`
    - `POST /api/scrims/proposals/:proposalId/discord-decision`
  - Refactored proposal decisioning into a shared server helper so web and Discord button flows use the same rules.
  - Replaced scrim DM fanout through `discordDmQueue` with custom `ScrimDiscordNotification` queue writes.
  - Enforced one active scrim post per team (`AVAILABLE`/`CANDIDATES` posts are replaced on new publish).
  - Removed proposal start-time override from proposal submission path.
  - Added optional `averageLp` support for `MASTER`/`GRANDMASTER`/`CHALLENGER` scrim rank targeting.
  - Added fearless-aware feed filtering (`fearless=REGULAR|FEARLESS`) and expanded format set (`FEARLESS_BO1/3/5`).
  - Switched `proposalStats.averageResponseMinutes` to team-global response aggregation (not single-post-local).
- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added `ScrimDiscordNotificationType` enum and `ScrimDiscordNotification` model.
- Added optional `ScrimPost.averageLp` and extended `ScrimFormat` enum with fearless BO variants.
- Added [prisma/migrations/20260419193000_add_scrim_discord_notifications/migration.sql](prisma/migrations/20260419193000_add_scrim_discord_notifications/migration.sql):
  - Creates scrim Discord notification enum/table/indexes/FK.
- Added [prisma/migrations/20260419224000_scrim_lp_and_fearless_formats/migration.sql](prisma/migrations/20260419224000_scrim_lp_and_fearless_formats/migration.sql):
  - Adds `averageLp` to `ScrimPost` and extends `ScrimFormat` enum for fearless BO variants.
- Updated [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - Removed embedded incoming-proposals decision panel (moved to Notifications page).
  - Removed proposal alternate-time input.
  - Removed redundant Team multi.gg field/button path and kept OP.GG multisearch prefill.
  - Added explicit post-publish confirmation before creating a team schedule SCRIM event (50-minute duration), so schedule creation is opt-in.
  - Refreshed page visuals (hero, filter bar, feed cards) and elevated start-time + average-rank prominence for faster scanning.
  - Region filter now lists all supported regions and preselects the authenticated user region by default.
  - Added master+ LP input in publish form and fearless-only/regular-only filter options.
  - Replaced accepted/rejected counter tile with format-prominence tile using fearless vs regular color coding.
- Updated [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx):
  - Added actionable incoming scrim proposal cards with Accept/Delay/Reject actions.
- Updated [apps/api/src/routes/discordFeed.ts](apps/api/src/routes/discordFeed.ts):
  - Removed redundant Team multi.gg payload from outgoing scrim data.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added scrim-specific Discord notification polling loop and custom scrim embeds.
  - Added interactive scrim proposal button handling (`Accept`, `Delay`, `Reject`) wired to bot-auth scrim decision endpoint.
  - Removed redundant Team multi.gg rendering from scrim feed embeds.
- Updated [Documentation/architecture/api-contracts.md](Documentation/architecture/api-contracts.md):
  - Synced scrim contract docs for single-post replacement, no proposal-time override, and new bot-only scrim decision queue endpoints.

Validation:

- `pnpm prisma generate` passes.
- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm -C discord-bot build` passes.

Operational Notes:

- Apply migration `20260419193000_add_scrim_discord_notifications` before deploying API + bot.
- Deploy API and bot together so scrim notification polling and Discord button decisions remain protocol-compatible.

---

## 2026-04-19 - Teams Scrim Finder MVP, Proposal Lifecycle, and Discord Feed Expansion

### Objective: Launch an end-to-end scrim posting and proposal workflow under Teams with timezone-safe scheduling and Discord mirroring support

Overview: Added a new Teams Scrim Finder path with timezone-adaptive scheduling, team-prefilled post creation, proposal decisioning (Accept/Reject/Delay as low-priority fallback), auto-timeout for unanswered proposals, lifecycle notifications, and Discord feed/bot support for SCRIM mirror channels.

Changes:

- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added `ScrimFormat`, `ScrimPostStatus`, `ScrimProposalStatus` enums.
  - Added `ScrimPost` and `ScrimProposal` models with team/user relations and proposal response tracking.
  - Extended `FeedType` with `SCRIM`.
  - Extended `NotificationType` with scrim proposal lifecycle notification keys.
- Added [prisma/migrations/20260419150000_add_scrim_finder/migration.sql](prisma/migrations/20260419150000_add_scrim_finder/migration.sql):
  - Guarded enum updates and creation of Scrim tables/indexes/FKs.
- Added [apps/api/src/routes/scrims.ts](apps/api/src/routes/scrims.ts):
  - Added Scrim feed, team prefill, post creation, proposal creation, incoming proposal inbox, and decision endpoints.
  - Implemented 10-minute auto-timeout for unanswered proposals.
  - Implemented decision outcomes: `ACCEPT`, `REJECT`, `DELAY` (low-priority fallback behavior).
  - Implemented reliability gate checks (Discord link + DM opt-in) for posting/proposing.
  - Added notification + Discord DM queue fanout for proposal lifecycle outcomes.
- Updated [apps/api/src/routes/discordFeed.ts](apps/api/src/routes/discordFeed.ts):
  - Extended feed channel registration validation to include `SCRIM`.
  - Added outgoing SCRIM mirror payload endpoint and mirrored-ack endpoint.
- Updated [apps/api/src/index.ts](apps/api/src/index.ts):
  - Registered new scrim route module under `/api`.
- Added [apps/web/pages/teams/scrims.tsx](apps/web/pages/teams/scrims.tsx):
  - New Teams Scrim Finder page with filters, post publishing, proposal flow, and proposal inbox actions.
  - Start times are entered in local time and converted to UTC for universal viewer-local rendering.
  - Team prefill integration includes suggested windows and generated OP.GG multisearch helper.
- Updated [apps/web/pages/teams/dashboard.tsx](apps/web/pages/teams/dashboard.tsx):
  - Added Scrim Finder quick action card.
- Updated [apps/web/components/Navbar.tsx](apps/web/components/Navbar.tsx):
  - Added Scrim Finder route in Teams desktop and mobile navigation.
- Updated [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx):
  - Added Scrim proposal lifecycle notification rendering.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added SCRIM feed setup option in `/setup`.
  - Added outgoing SCRIM poll loop and embed mirroring delivery flow.

Validation:

- Pending in this session (to be run after code integration):
  - `pnpm --filter @lfd/api build`
  - `pnpm --filter @lfd/web build`
  - `pnpm -C discord-bot build`

Operational Notes:

- Apply Prisma migration before deploying API/bot updates.
- SCRIM Discord mirroring requires bot + API deployments together so setup and outgoing mirror paths stay compatible.

---

## 2026-04-17 - Gamble UX Refinement, Discord Settings Test Fix, and Reminder Availability Visibility

### Objective: Make gamble presentation less blunt, improve Teams Discord settings usability, and provide complete attendance visibility in reminders

Overview: Refined gamble copy and game variety with common formats, fixed Teams Discord test behavior and moved settings feedback closer to action controls, and expanded reminder payload/embed behavior so availability snapshots include Present/Absent/Unsure/No Response with unanswered-user prompts in DMs.

Changes:

- Updated [apps/api/src/routes/wallet.ts](apps/api/src/routes/wallet.ts):
  - Replaced gamble game lineup with `Coin Flip`, `Slot Machine`, and `Roulette`.
  - Implemented new outcome logic for the updated game keys.
  - Removed exposed house-edge/expected-return fields from game state and play result payloads.
- Updated [apps/web/pages/purse/gamble.tsx](apps/web/pages/purse/gamble.tsx):
  - Removed explicit house-edge messaging and RTP/edge stat display from the UI.
  - Updated loss feedback copy to neutral round-result language.
  - Synced frontend game/result types with updated API payload shape.
- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - `POST /api/teams/:id/discord/test` now accepts optional `webhookUrl` in body so owners can test unsaved webhook values.
  - Added clearer error response when no webhook target is available.
- Updated [apps/web/pages/teams/discord.tsx](apps/web/pages/teams/discord.tsx):
  - `Send Test` now posts the current webhook URL in the request body.
  - Moved success/error status messaging down near Save/Test actions instead of near the page top.
- Updated [apps/api/src/routes/discordFeed.ts](apps/api/src/routes/discordFeed.ts):
  - Team reminder feed now includes event attendance records (`userId`, `status`) for bot-side availability summaries.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Reminder embeds now include full availability buckets: Present, Absent, Unsure, and No Response.
  - DM reminders now explicitly prompt recipients who have not responded yet.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web build` passes.
- `pnpm -C discord-bot build` passes.

---

## 2026-04-17 - Purse Quick Actions Redesign, Quest Fixes, and Gamble Hub

### Objective: Improve Prismatic Purse UX, Fix Broken Quest Completion Rules, and Add Dedicated Solo Gamble Flows

Overview: Reworked Purse quick actions into clear navigation shortcuts, removed duplicated top-page cosmetics/adspace chips, fixed impossible quest criteria (Complete Profile + Join Support Server), added guided quest completion links, and introduced a dedicated single-player gamble page with explicit house-edge-disadvantaged games.

Changes:

- Updated [apps/web/pages/purse.tsx](apps/web/pages/purse.tsx):
  - Removed top-page cosmetics/adspace mini buttons.
  - Replaced old Quick Actions purchase list with better-styled navigation buttons to `Cosmetics`, `Adspace`, and `Gamble`.
  - Added per-quest helper links/buttons to guide users directly to completion destinations.
- Added [apps/web/pages/purse/gamble.tsx](apps/web/pages/purse/gamble.tsx):
  - New dedicated gamble hub with multiple single-player game modes.
  - Added wager controls, optional choice selectors per game, and result feedback panel.
  - Added clear UX messaging that all games are house-favored over time.
- Updated [apps/api/src/routes/wallet.ts](apps/api/src/routes/wallet.ts):
  - Updated `COMPLETE_PROFILE` quest criteria to require: linked Riot account, linked Discord account, champion pool set, and bio set.
  - Updated `JOIN_SUPPORT_SERVER` quest logic to include direct Discord guild membership verification (support guild `1051156621860020304`, plus configured support guild IDs) using bot credentials.
  - Added support-server membership caching to reduce repeated Discord API checks.
  - Added gamble API:
    - `GET /api/wallet/gamble/games`
    - `POST /api/wallet/gamble/:gameKey/play`
  - Added multiple one-player gamble modes with negative expected value by design.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.

Operational Notes:

- Support-server Discord quest verification requires a valid bot token at runtime (`DISCORD_BOT_TOKEN`).
- Optional guild overrides remain available via `SUPPORT_DISCORD_SERVER_IDS` and `SUPPORT_DISCORD_GUILD_ID`.

---

## 2026-04-17 - Team Region Preselect, Discord Ping Recurrence, and Team Event Reminders

### Objective: Improve Team Setup Defaults and Make Discord Team Delivery More Controllable

Overview: Added user-region-aware preselection in Team creation, introduced configurable Discord ping recurrence and pre-event reminders (channel + DM fanout), and aligned Communities guide LFT preview content between in-app and Discord mirror examples.

Changes:

- Updated [apps/web/pages/teams/dashboard.tsx](apps/web/pages/teams/dashboard.tsx):
  - Team creation region now defaults to the signed-in user profile region (or first valid linked Riot account region) instead of hardcoded `NA`.
- Updated [prisma/schema.prisma](prisma/schema.prisma):
  - Added team Discord recurrence/reminder settings fields.
  - Added `TeamEventReminder` model for due reminder queue processing.
- Added [prisma/migrations/20260417143000_add_team_discord_ping_recurrence_and_reminders/migration.sql](prisma/migrations/20260417143000_add_team_discord_ping_recurrence_and_reminders/migration.sql):
  - Database migration for new team Discord recurrence/reminder columns and reminder queue table.
- Updated [apps/api/src/routes/teams.ts](apps/api/src/routes/teams.ts):
  - Discord settings GET/POST/DELETE now support `pingRecurrence`, `remindersEnabled`, and `reminderDelaysMinutes`.
  - Added validation/sanitization for reminder delays and queue rebuild logic for upcoming events.
  - Event create/update now (re)queue reminder records according to team settings.
- Updated [apps/api/src/routes/discordFeed.ts](apps/api/src/routes/discordFeed.ts):
  - Team-event payload now includes ping recurrence state and last ping timestamp.
  - Added reminder polling and processed endpoints for the bot.
  - Processed endpoints can persist ping timestamp when mention ping was actually sent.
- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Enforced once-per-hour channel mention throttling when ping recurrence is disabled.
  - Added due reminder polling/delivery loop for channel + DM reminder fanout.
  - Added reminder embed formatting and processed acknowledgment with optional ping recording.
- Updated [apps/web/pages/teams/discord.tsx](apps/web/pages/teams/discord.tsx):
  - Added Discord settings controls for ping recurrence and multi-delay pre-event reminders.
  - Added reminder delay selection UI and save-time validation.
- Updated [apps/web/pages/communities/guide.tsx](apps/web/pages/communities/guide.tsx):
  - Fixed LFT mirroring preview inconsistency so Discord mirror content matches RiftEssence card persona/content.
- Updated [Documentation/backend/integrations.md](Documentation/backend/integrations.md):
  - Documented team event/reminder bot delivery and new bot-facing reminder endpoints.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web build` passes.
- `pnpm prisma generate` passes.
- `pnpm build` passes in `discord-bot` directory.

Operational Notes:

- Apply the new Prisma migration before deploying API/bot changes.
- Rebuild and redeploy both API and Discord bot services so reminder queue endpoints and runtime pollers are active.

---

## 2026-04-17 - Profile 500 Hardening and Global Standard Font Lock

### Objective: Eliminate Profile Bootstrap 500s From Cache/Data Shape Drift and Keep Typography Fully Uniform

Overview: Hardened `/api/user/profile` response serialization against Redis JSON date-shape differences and legacy/null account/community fields that could crash profile bootstrap, and switched all theme typography to a single standard system stack.

Changes:

- Updated [apps/api/src/routes/user.ts](apps/api/src/routes/user.ts):
  - Added date-safe serialization helper so cached string dates no longer throw on `.toISOString()`.
  - Added resilient Riot identity parsing for accounts with incomplete legacy name/tag fields.
  - Added defensive filtering for malformed/null badge/community entries.
  - Kept response schema stable while preventing whole-route failure on recoverable data irregularities.
  - Improved `/api/user/profile` error logging payload for faster production diagnosis.
- Updated [apps/web/styles/globals.css](apps/web/styles/globals.css):
  - Removed external custom webfont import.
  - Locked body and heading tokens to one standard system font stack across all themes.
- Updated [Documentation/frontend/theming.md](Documentation/frontend/theming.md):
  - Documented the standard system font stack behavior.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web lint` passes.
- `pnpm --filter @lfd/web build` passes.
- Local API runtime boot passes (`pnpm --filter @lfd/api start`), but endpoint smoke checks returned `503` in this environment because local DB host `db:5432` is unavailable.

Operational Notes:

- Production API service must be rebuilt/restarted to pick up the `/api/user/profile` hardening.

---

## 2026-04-17 - Typography Consistency and Theme Hydration Safety

### Objective: Keep Theme Personality Visual Without Font Drift and Reduce First-Render Route Instability

Overview: Applied a follow-up adjustment so theme switching no longer changes global heading/body typography, and switched theme state bootstrapping to a hydration-safe initialization path.

Changes:

- Updated [apps/web/styles/globals.css](apps/web/styles/globals.css):
  - Added a global `[data-theme]` typography override so all themes share the same `--font-body` and heading token set.
  - Preserved theme personality differences through color, shell motif, and ambient motion tokens.
- Updated [apps/web/contexts/ThemeContext.tsx](apps/web/contexts/ThemeContext.tsx):
  - Restored server-safe initial state (`classic`) and moved localStorage rehydration to mount effect.
  - Avoided client/server first-render divergence that can contribute to route-level hydration instability.
- Updated [Documentation/frontend/theming.md](Documentation/frontend/theming.md):
  - Documented globally consistent typography behavior.

Validation:

- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web lint` passes.
- `pnpm --filter @lfd/web build` passes.
- Runtime smoke check passes:
  - `pnpm --filter @lfd/web exec next start -p 4010`
  - `Invoke-WebRequest http://localhost:4010/profile` returns `200`
  - `Invoke-WebRequest http://localhost:4010/profile/testuser` returns `200`

---

## 2026-04-16 - Theming Documentation Parity Follow-up

### Objective: Keep Documentation Aligned With Implemented Theme Runtime Paths

Overview: Performed a documentation-only parity pass on frontend theming references and corrected stale/omitted references discovered after the 9-theme rollout.

Changes:

- Updated [Documentation/frontend/theming.md](Documentation/frontend/theming.md):
  - Added `apps/web/pages/_app.tsx` to the source-of-truth file list for runtime `theme-color` sync behavior.
- Updated [Documentation/frontend/components.md](Documentation/frontend/components.md):
  - Updated theme support wording from 5 themes to 9 themes for CSS-variable-based component theming.
- Updated [Documentation/frontend/pages.md](Documentation/frontend/pages.md):
  - Refreshed `_app.tsx` page inventory summary to include themed shell frame and runtime `theme-color` synchronization responsibilities.
- Updated [Documentation/README.md](Documentation/README.md):
  - Updated Theming navigation summary from 5 themes to 9 themes and registry/parity model.
- Updated [Documentation/project/overview.md](Documentation/project/overview.md):
  - Updated current-state key fact from 5 themes to 9 themes.

Validation:

- Verified documentation statements against implementation in `apps/web/utils/themeRegistry.ts`, `apps/web/contexts/ThemeContext.tsx`, `apps/web/pages/_document.tsx`, `apps/web/pages/_app.tsx`, and `apps/web/styles/globals.css`.

---

## 2026-04-16 - Web Theme Personality Expansion and 9-Theme Parity

### Objective: Make Every Theme Feel Distinct Without UX Drift

Overview: Expanded visual personality across all 9 themes with synchronized first-paint/runtime theming, theme-specific heading typography, global shell motifs, and per-theme ambient motion signatures while keeping existing user flows and page structure unchanged.

Changes:

- Added [apps/web/utils/themeRegistry.ts](apps/web/utils/themeRegistry.ts):
  - Centralized 9-theme registry and canonical theme order.
  - Shared CSS variable generation for both SSR bootstrap and client runtime.
  - Shared root variable application helper and theme name resolution.
- Updated [apps/web/contexts/ThemeContext.tsx](apps/web/contexts/ThemeContext.tsx):
  - Replaced inline theme map with registry-backed source of truth.
  - Applied theme via shared helper and root `data-theme` synchronization.
- Updated [apps/web/pages/_document.tsx](apps/web/pages/_document.tsx):
  - Replaced partial hardcoded pre-hydration map with full registry-backed variable bootstrap.
  - Ensured first paint supports all 9 themes consistently.
- Updated [apps/web/pages/_app.tsx](apps/web/pages/_app.tsx):
  - Added themed app shell wrapper (`app-theme-shell` / `app-theme-content`).
  - Added runtime sync for `theme-color` meta tag per active theme.
- Updated [apps/web/styles/globals.css](apps/web/styles/globals.css):
  - Added theme personality tokens for headings, shell motifs, and ambient motion.
  - Added per-theme selectors for all 9 themes.
  - Added section shell variants and reduced-motion fallbacks.
- Updated [apps/web/components/OnboardingWizard.tsx](apps/web/components/OnboardingWizard.tsx):
  - Expanded theme picker to all 9 themes.
  - Applied shell styling and responsive grid adjustments.
- Updated [apps/web/translations/index.ts](apps/web/translations/index.ts):
  - Added onboarding translation keys and values for newly exposed themes (EN/FR).
- Updated [apps/web/pages/settings.tsx](apps/web/pages/settings.tsx):
  - Applied shell variant classes to settings panels.
- Updated documentation:
  - [Documentation/frontend/theming.md](Documentation/frontend/theming.md)
  - [apps/web/utils/README-theming.md](apps/web/utils/README-theming.md)

Validation:

- `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
- `pnpm --filter @lfd/web lint` passes (no lint errors).
- `pnpm --filter @lfd/web build` passes and completes static generation.

Operational Notes:

- Next.js lint still reports the existing advisory about Next plugin detection; no blocking errors.
- Ambient and decorative theme motion now respects `prefers-reduced-motion` globally.

---

## 2026-04-16 - Prisma 5.22.0 Upgrade Alignment and Compatibility Validation

### Objective: Upgrade Prisma Safely Without Functional Regressions

Overview: Upgraded Prisma tooling and client dependencies to 5.22.0 and aligned all workspace Prisma client consumers to the same major version to avoid mixed engine/client behavior.

Changes:

- Updated [package.json](package.json):
  - `prisma` upgraded to `^5.22.0`.
  - `@prisma/client` upgraded to `5.22.0`.
- Updated [packages/types/package.json](packages/types/package.json):
  - `@prisma/client` upgraded from `^4.15.0` to `^5.22.0`.
- Updated [pnpm-lock.yaml](pnpm-lock.yaml):
  - Removed remaining Prisma 4.x graph references.
  - Locked all Prisma engine/client packages to 5.22.0.
- Regenerated Prisma client from [prisma/schema.prisma](prisma/schema.prisma).

Validation:

- `pnpm prisma generate --schema=prisma/schema.prisma` passes and generates Prisma Client `v5.22.0`.
- `pnpm --filter @lfd/types build` passes.
- `pnpm --filter @lfd/api build` passes.
- `pnpm -C discord-bot build` passes.

Operational Notes:

- Runtime verification is still required on Raspberry Pi Docker deployment after rebuilding images.

---

## 2026-04-16 - Database Performance Hardening Slice (Read-Path Optimization)

### Objective: Maximize DB Efficiency Under Real UI Burst Patterns

Overview: This slice focuses specifically on reducing database query volume and read amplification in hot endpoints, independent of the Prisma engine stability patches. Goal: materially improve throughput headroom and lower crash pressure as a secondary effect.

Changes:

- Added [apps/api/src/utils/requestCache.ts](apps/api/src/utils/requestCache.ts):
  - Single-flight cache loader to coalesce concurrent identical requests.
  - Shared `getOrSetCache` helper for short-lived read-path caching.
- Updated [apps/api/src/routes/user.ts](apps/api/src/routes/user.ts):
  - Added short-lived cached user-profile core lookup.
  - Added short-lived cached full profile response payload.
  - Added cached guard around daily password-reminder existence checks to avoid repeated notification table reads.
- Updated [apps/api/src/routes/communities.ts](apps/api/src/routes/communities.ts):
  - Added normalized-query keyed cache for community list endpoint.
- Updated [apps/api/src/routes/badges.ts](apps/api/src/routes/badges.ts):
  - Added cached badge-list response for highly repeated static reads.
- Updated [apps/api/src/routes/posts.ts](apps/api/src/routes/posts.ts):
  - Replaced N+1 sender lookups in `/api/notifications` with batched sender fetch.
  - Added short-lived cache for notification list payload.
- Updated [apps/api/src/routes/chat.ts](apps/api/src/routes/chat.ts):
  - Replaced full conversation scan in `/api/chat/unread-count` with aggregate sums.
  - Added short-lived per-user unread-count cache.
- Updated [docker-compose.yml](docker-compose.yml):
  - Tuned default Postgres Prisma pool URL (`connection_limit`, `pool_timeout`).
  - Added runtime env defaults for the new route cache TTL controls.

Validation:

- `pnpm --filter @lfd/api build` passes after the optimization slice.

Operational Notes:

- Rebuild and restart API container to apply runtime defaults and optimized code paths.
- These changes target DB pressure reduction first; improved crash behavior is expected as a secondary effect but must still be runtime-verified.

---

## 2026-04-16 - API Stability Follow-up: Prisma Socket Flap Mitigation and Poll Smoothing

### Fix: Prisma Retry Behavior and Query Pressure Control

Overview: Production logs still showed intermittent Prisma query-engine socket failures (`ECONNREFUSED 127.0.0.1:<port>`, `other side closed`) during concurrent route bursts.

Changes:

- Updated [apps/api/src/prisma.ts](apps/api/src/prisma.ts):
  - Expanded transient retry classification to include `UND_ERR_SOCKET` and socket-close patterns.
  - Replaced aggressive disconnect/reconnect reset behavior with connection-only recovery to avoid cascading in-flight query failures.
  - Added capped concurrent Prisma query execution with queueing (`PRISMA_MAX_CONCURRENT_QUERIES`) to reduce engine pressure spikes.
  - Increased default retry budget and added incremental retry delay.

### Fix: Discord Bot Poll Burst Smoothing

Overview: Bot polling loops were starting together and generating synchronized DB-heavy request bursts.

Changes:

- Updated [discord-bot/src/index.ts](discord-bot/src/index.ts):
  - Added guarded poll loop scheduler to prevent overlapping poll executions.
  - Staggered startup delays for poll loops so requests are spread over time.
- Updated [docker-compose.yml](docker-compose.yml):
  - Added safer default intervals for `DISCORD_LFT_POLL_INTERVAL_MS`, `DISCORD_DM_POLL_INTERVAL_MS`, and `DISCORD_TEAM_EVENT_POLL_INTERVAL_MS`.
  - Added runtime tuning env defaults for Prisma resilience controls and ban-check cache TTL.

Validation:

- `pnpm --filter @lfd/api build` passes.
- `pnpm -C discord-bot build` passes.

Operational Notes:

- Rebuild and restart both `api` and `discord-bot` services so updated runtime defaults and bot scheduler changes are applied.

---

## 2026-04-16 - API Resilience Follow-up for Prisma Engine Flapping and Riot 429

### Fix: Prisma Query Engine Self-Healing and Ban-Check Load Reduction

Overview: After the ARM binary-engine stabilization patch, API logs still showed intermittent `PrismaClientKnownRequestError` bursts with `connect ECONNREFUSED 127.0.0.1:<ephemeral-port>`, indicating query-engine subprocess restarts under concurrent load.

Changes:

- Updated [apps/api/src/prisma.ts](apps/api/src/prisma.ts) to add centralized Prisma middleware retry for transient engine errors (`ECONNREFUSED`, `P1001`, `P1002`, `P1017`) with controlled disconnect/reconnect recovery.
- Updated [apps/api/src/index.ts](apps/api/src/index.ts) to cache ban-check lookups (IP blacklist and account ban snapshot) for a short TTL to avoid repeated duplicate queries per burst request set.
- Updated [apps/api/src/index.ts](apps/api/src/index.ts) to return a controlled 503 (`BAN_CHECK_UNAVAILABLE`) when ban-check storage is temporarily unavailable instead of uncaught hook failure behavior.

### Fix: Riot Match API Rate-Limit Mitigation for Profile Activity/Role Detection

Overview: Profile refresh paths were repeatedly hitting Riot Match API 429s during role detection/activity updates, creating unnecessary retries and latency spikes.

Changes:

- Updated [apps/api/src/riotClient.ts](apps/api/src/riotClient.ts) with:
  - 429-aware request backoff with `Retry-After` support.
  - Match-list and match-details caching.
  - Detection/activity scan limits for bounded API pressure.
  - In-flight dedupe and cached output for preferred-role detection.
- Updated [apps/api/src/routes/user.ts](apps/api/src/routes/user.ts) to trigger preferred-role detection only when primary role is missing (instead of rerunning when secondary role is null).

Validation:

- `pnpm --filter @lfd/api build` passes after the change.

Operational Notes:

- Rebuild and redeploy API container so runtime picks up the updated code.
- Optional tuning env vars are now available in code defaults (retry attempts/delay and Riot scan/backoff controls) if further production tuning is required.

---

## 2026-04-16 - API Stability Fix for Purse Page Crash (ARM Docker)

### Fix: Prisma Engine Runtime Hardening

Overview: Resolved a runtime crash observed while loading Purse-related endpoints in ARM Docker deployments. The API process aborted with allocator errors (`malloc(): unaligned tcache chunk detected`) during concurrent wallet/profile requests.

Changes:

- Updated [apps/api/Dockerfile](apps/api/Dockerfile) to force Prisma engine mode to `binary` for both client runtime and CLI operations during build/runtime.
- Updated [docker-compose.yml](docker-compose.yml) API service environment to pin both `PRISMA_CLIENT_ENGINE_TYPE` and `PRISMA_CLI_QUERY_ENGINE_TYPE` to `binary`.

Validation:

- `pnpm --filter @lfd/api build` passes after the change.

Operational Notes:

- Rebuild and restart API container so new environment and image settings take effect.
- This targets known ARM allocator instability patterns with Prisma library engine under load.

---

## 2026-04-16 - AI Workflow and Audit Documentation System

### Added: Dated Audit Record

Overview: Added a canonical audit snapshot to preserve the latest verified findings from the production stability and architecture cleanup session.

Changes:

- Added [Documentation/analysis/2026-04-16-audit-findings.md](Documentation/analysis/2026-04-16-audit-findings.md)
- Updated [Documentation/analysis/codebase-audit.md](Documentation/analysis/codebase-audit.md) with pointer to latest dated findings

### Added: AI Vibe Coding Workflow Guide

Overview: Added a repeatable agent-first workflow for planning, implementation, review, documentation sync, and release validation.

Changes:

- Added [Documentation/guides/ai-vibe-workflow.md](Documentation/guides/ai-vibe-workflow.md)
- Updated [Documentation/README.md](Documentation/README.md) navigation for new guide and audit record

### Added: New Specialized Agents and Workspace Instructions

Overview: Added three new custom agents plus workspace-level Copilot instructions to keep docs live and enforce validation cadence during vibe coding.

Changes:

- Added [.github/agents/VibePlanner.agent.md](.github/agents/VibePlanner.agent.md)
- Added [.github/agents/DocsKeeper.agent.md](.github/agents/DocsKeeper.agent.md)
- Added [.github/agents/OpsPilot.agent.md](.github/agents/OpsPilot.agent.md)
- Updated [.github/agents/DocumentationManager.agent.md](.github/agents/DocumentationManager.agent.md) with one-prompt and no-assumption orchestration mode
- Added [.github/copilot-instructions.md](.github/copilot-instructions.md)

### Added: RiftFlow v1 Brand-New Agent System and One-Command Prompt

Overview: Introduced a fresh agent system independent of legacy flow, with a single slash command for end-to-end vibe coding.

Changes:

- Added [.github/agents/RiftConductor.agent.md](.github/agents/RiftConductor.agent.md)
- Added [.github/agents/RiftScope.agent.md](.github/agents/RiftScope.agent.md)
- Added [.github/agents/RiftShip.agent.md](.github/agents/RiftShip.agent.md)
- Added [.github/agents/RiftLedger.agent.md](.github/agents/RiftLedger.agent.md)
- Added [.github/agents/RiftSRE.agent.md](.github/agents/RiftSRE.agent.md)
- Added [.github/prompts/vibe-build.prompt.md](.github/prompts/vibe-build.prompt.md)
- Updated [Documentation/guides/ai-vibe-workflow.md](Documentation/guides/ai-vibe-workflow.md) to make RiftFlow v1 the preferred system
- Updated [.github/copilot-instructions.md](.github/copilot-instructions.md) with preferred /vibe-build and @RiftConductor entrypoint

---

## 2026-03-04 — Unique Page Titles and SVG Favicon

### Feature: Per-Page Browser Tab Titles (Task #5)

**Overview**: Every page in the app now has a distinct, descriptive browser tab title. Previously every page showed the same default French title.

**Architecture**: `_app.tsx` now contains a `ROUTE_TITLES` map with 28 static routes. The title resolution order is: `pageProps.ssrTitle` (GSSP pages like share) → `routeTitle` (static map) → fallback string. Dynamic pages set `document.title` via `useEffect` when their data loads.

**Changes** ([apps/web/pages/_app.tsx](apps/web/pages/_app.tsx)):
- Added `ROUTE_TITLES` map (28 routes) before the `App` component
- Updated fallback description to English
- Title resolution: `ssrTitle || routeTitle || 'RiftEssence - The League of Legends Community Platform'`

**Dynamic titles added**:
- [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx): `{username}'s Profile | RiftEssence` when viewing another user; `My Profile | RiftEssence` for own profile
- [apps/web/pages/communities/[id].tsx](apps/web/pages/communities/[id].tsx): `{community.name} | RiftEssence`
- [apps/web/pages/matchups/[id].tsx](apps/web/pages/matchups/[id].tsx): `{myChampion} vs {enemyChampion} | RiftEssence`

**Title format**: `{Feature} | RiftEssence` — consistent `|` separator, title-cased feature names.

### Feature: SVG Favicon (Task #6)

**Overview**: The app previously referenced `/favicon.png` in `_app.tsx` but the file didn't exist, causing a 404 and an empty browser tab icon.

**Changes** ([apps/web/public/favicon.svg](apps/web/public/favicon.svg)):
- New SVG favicon: dark `#06101F` rounded-rect background, gold `#C8AA6E` "R" lettermark in a bold path shape
- SVG scales crisply at all sizes (16×16 through 256×256)

**Changes** ([apps/web/pages/_app.tsx](apps/web/pages/_app.tsx)):
- `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` — primary (supported by Chrome, Firefox, Safari, Edge)
- `<link rel="alternate icon" type="image/png" href="/favicon.png" />` — fallback in case a PNG is added later

**Commit**: `08cafcb4`

---

## 2026-03-04 — Responsive Improvements for Critical Pages

### Feature: Mobile Responsiveness Pass

**Overview**: Comprehensive mobile layout fixes applied to `feed.tsx`, `lft.tsx`, `profile.tsx`, and `create.tsx`. Desktop layouts are completely unchanged. All changes use Tailwind base classes (mobile-first) with `sm:`/`md:` overrides for larger screens.

**Commit**: `4cb00da7`

**Changes by file:**

**[apps/web/pages/feed.tsx](apps/web/pages/feed.tsx)**:
- Header row: `flex justify-between` → `flex flex-wrap justify-between gap-2` — prevents "Looking For Duo" title and "Create Post" button from overlapping on narrow screens
- Title: `text-3xl` → `text-2xl sm:text-3xl`
- Filter title: `text-lg` → `text-base sm:text-lg`
- Filter panel: `p-6` → `p-4 sm:p-6`
- Post cards: `p-6` → `p-4 sm:p-6`
- Post header row: `flex justify-between items-start` → `flex flex-wrap justify-between items-start gap-2`

**[apps/web/pages/lft.tsx](apps/web/pages/lft.tsx)**:
- Header row: `flex items-center justify-between` → `flex flex-wrap items-start justify-between gap-2` — "Looking For Team (LFT)" title is long, wraps cleanly now
- Title: `text-3xl font-extrabold` → `text-2xl sm:text-3xl font-extrabold`
- Section container: `p-6` → `p-4 sm:p-6`
- Post cards: `p-6` → `p-4 sm:p-6`
- Post card header: `flex items-center justify-between mb-4` → `flex flex-wrap items-center justify-between mb-4 gap-2`

**[apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)**:
- Action buttons row: `flex justify-end gap-3` → `flex flex-wrap justify-end gap-2` — refresh/edit buttons wrap on narrow screens
- Profile header card + all 9 section cards: `rounded-xl p-6` → `rounded-xl p-4 sm:p-6` (global replacement)
- Username heading: `text-3xl font-bold` → `text-2xl sm:text-3xl font-bold` (both view and edit modes)
- Riot account rows: `flex items-center justify-between` → `flex flex-wrap items-center justify-between gap-2`

**[apps/web/pages/create.tsx](apps/web/pages/create.tsx)**:
- Form card: `p-6` → `p-4 sm:p-6`
- Submit button: added `w-full sm:w-auto` — full width on mobile, auto on desktop

Chronological log of significant changes. Maintained by @DocumentationManager.

---

## 2026-03-02 — Champion Name Consistency Fix

### Bug Fix: Champion Names Now Display Correctly Across the Entire App

**Overview**: Champion names were inconsistent across the app. The `ChampionAutocomplete` dropdown (used in matchups creation) was showing DDragon internal IDs like `MonkeyKing`, `Kaisa`, `KogMaw` instead of proper display names like `Wukong`, `Kai'Sa`, `Kog'Maw`. This also caused champion validation in the profile tierlist to sometimes fail.

**Root Cause**: `utils/championData.ts` `fetchChampions()` was using `Object.keys(data.data)` which returns DDragon internal IDs, while `profile.tsx` was fetching inline using `c.name` which returns display names. These two sources were completely inconsistent.

**Changes** ([apps/web/utils/championData.ts](apps/web/utils/championData.ts)):
- `fetchChampions()` now uses `Object.values<any>(data.data).map((c) => c.name as string)` — returns proper display names everywhere
- Added missing entries to `championNameMap`: `Kog'Maw → KogMaw`, `Bel'Veth → Belveth`, `K'Sante → KSante`
- `normalizeChampionName()` fallback now strips non-alpha chars (`name.replace(/[^a-zA-Z]/g, '')`) — automatically handles champions with spaces (Miss Fortune, Dr. Mundo, Lee Sin) and other special chars
- Cache key bumped to `lfd_champions_cache_v2` to invalidate all stale cached DDragon ID data

**Changes** ([apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)):
- Removed duplicate local `getChampionIconUrl` function with its own separate `specialCases` map
- Added `import { getChampionIconUrl } from '../utils/championData'` — single source of truth

**Changes** ([apps/web/components/profile/ChampionPool.tsx](apps/web/components/profile/ChampionPool.tsx)):
- Added `import { getChampionIconUrl } from '../../utils/championData'`
- Replaced hardcoded inline URL with regex (`15.1.1/.../${champ.replace(...)}`) with `getChampionIconUrl(champ)` — now version-consistent and normalization-aware

**Files Modified**:
- [apps/web/utils/championData.ts](apps/web/utils/championData.ts)
- [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)
- [apps/web/components/profile/ChampionPool.tsx](apps/web/components/profile/ChampionPool.tsx)

---

## 2026-03-02 — Champion Pool Fix

### Bug Fix: Champion Pool Saving Now Works Consistently

**Overview**: The champion pool tierlist (S/A/B/C tiers) was silently failing to save in multiple scenarios. Three root-cause bugs were identified and fixed.

**Bug 1 — Primary: DDragon validation blocked valid saves** ([apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)):
- `handleSaveAllChanges()` validated all tier champions via `isValidChampion()` before saving
- `isValidChampion()` requires the `champions` state (fetched async from DDragon API) to be populated
- If DDragon hadn't loaded yet (slow network, CDN issues), `champions` was empty → all champions failed validation → save aborted with "Invalid champion(s)" error even for valid names
- **Fix**: Changed condition from `if (invalid.length)` to `if (champions.length > 0 && invalid.length > 0)` — skips validation when champion list hasn't loaded, since the input autocomplete already prevents invalid entries

**Bug 2 — Type mismatch: `championPoolMode` typed as literal `'TIERLIST'`** ([apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)):
- `UserProfile` interface had `championPoolMode: 'TIERLIST'` (literal type)
- `useState` was `useState<'TIERLIST'>('TIERLIST')`
- Multiple `setChampionPoolMode(data.championPoolMode || 'LIST')` calls were type-unsafe
- **Fix**: Updated both to `'LIST' | 'TIERLIST'`

**Bug 3 — "Under development" tooltip removed** ([apps/web/pages/profile.tsx](apps/web/pages/profile.tsx)):
- Champions section heading had an info icon with tooltip: "Champion Pool feature is currently under development and not yet functional"
- **Fix**: Removed the entire `<span>` element with the misleading tooltip

**Bug 4 — Debug artifacts in ChampionPool component** ([apps/web/components/profile/ChampionPool.tsx](apps/web/components/profile/ChampionPool.tsx)):
- Component had leftover diagnostic green/red box (`backgroundColor: '#00ff00', border: '3px solid #ff0000'`) in champion rendering
- **Fix**: Replaced with proper DDragon `<img>` icon matching the inline profile UI pattern

**Files Modified**:
- [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx) — Bugs 1, 2, 3
- [apps/web/components/profile/ChampionPool.tsx](apps/web/components/profile/ChampionPool.tsx) — Bug 4

**Note**: Backend endpoint `PATCH /api/user/champion-pool` was already correctly implemented and did not require changes.

---

## 2026-03-02 — Vercel Analytics Integration

### Analytics Implementation

**Overview**: Integrated Vercel Analytics to track user behavior, page views, and site performance metrics.

**Frontend Changes**:

**1. Package Addition** ([apps/web/package.json](apps/web/package.json)):
- Added `@vercel/analytics` (^1.4.1) to dependencies

**2. Analytics Integration** ([apps/web/pages/_app.tsx](apps/web/pages/_app.tsx)):
- Imported `Analytics` component from `@vercel/analytics/react`
- Added `<Analytics />` component at the end of the app tree (after Footer)
- Automatically tracks page views and Web Vitals

**Benefits**:
- Real-time analytics dashboard on Vercel
- Page view tracking across all routes
- Web Vitals monitoring (FCP, LCP, FID, CLS, TTFB)
- Zero configuration required
- Automatic integration with Vercel deployments

**Technical Details**:
- **Client-side only**: Analytics runs only in production browser environments
- **Privacy-friendly**: No cookies, GDPR-compliant
- **Performance**: Minimal bundle size impact (~1KB gzipped)
- **Zero Config**: Works automatically when deployed to Vercel

**Files Modified**:
- [apps/web/package.json](apps/web/package.json) — Added @vercel/analytics dependency
- [apps/web/pages/_app.tsx](apps/web/pages/_app.tsx) — Integrated Analytics component

---

## 2026-02-24 — Duo Post Sharing with Discord Embeds

### New Feature: Shareable Duo Posts with Rich Discord Previews

**Overview**: Users can now share their duo posts with beautiful Discord embeds that display all key information visually. When sharing a link in Discord, a custom-generated image appears showing the post details.

**Backend Changes**:

**1. New API Endpoint** ([apps/api/src/routes/posts.ts](apps/api/src/routes/posts.ts)):
- `GET /api/posts/:id` — Fetch a single duo post by ID
- **Authentication**: Not required (public endpoint for sharing)
- **Response Format**: Same as list endpoint, returns single post with:
  - Post details (role, region, message, VC preference, languages)
  - Author info (username, Discord, preferred roles)
  - Posting Riot account (gameName, tagLine, rank, division, LP, winrate)
  - Main account info (if posting with smurf)
  - Ratings (skill/personality averages)
  - Community info (if applicable)
- **Error Handling**: Returns 404 if post not found
- **Code Quality**: Extracted `formatPost()` helper function to avoid duplication between list and single endpoints

**Frontend Changes**:

**1. Share Button** ([apps/web/pages/feed.tsx](apps/web/pages/feed.tsx)):
- Added "Share Post" button visible only to post authors (`currentUserId === authorId`)
- Generates shareable URL: `{origin}/share/post/{postId}`
- Copy-to-clipboard functionality with user feedback toast
- Icon: Share/network SVG icon matching existing design
- Tooltip: "Share link copied to clipboard! Paste it in Discord to share your duo post."

**2. Share Page** ([apps/web/pages/share/post/[id].tsx](apps/web/pages/share/post/[id].tsx)):
- **Server-Side Rendering**: Uses `getServerSideProps` to fetch post data
- **OpenGraph Metadata**: Complete meta tags for Discord/Twitter/Facebook:
  - `og:title`: "{username} - Looking For Duo on {region}"
  - `og:description`: Dynamic description with account info and rank
  - `og:image`: Links to dynamic OG image API (`/api/og/post/{id}`)
  - `og:image:width` / `og:image:height`: 1200x630 (standard)
  - `twitter:card`: summary_large_image
  - `theme-color`: #C8AA6D (RiftEssence brand color)
- **Visual Display**: Shows full post details with same styling as feed:
  - Username, region, timestamp
  - Role badges with icons
  - Riot accounts (posting account + main account if smurf)
  - Rank badges with color-coding
  - Winrate badges (green ≥50%, red <50%)
  - Message content
  - VC preference and languages
- **Clear CTAs**:
  - "Browse More Duo Posts" → /feed
  - "Create Your Own Post" → /register
- **Error Handling**: User-friendly 404 page if post not found

**3. OG Image API** ([apps/web/pages/api/og/post/[id].tsx](apps/web/pages/api/og/post/[id].tsx)):
- **Edge Runtime**: Uses Next.js `ImageResponse` API for dynamic image generation
- **Image Dimensions**: 1200x630 pixels (OpenGraph standard)
- **Design Features**:
  - RiftEssence branded gradient background
  - Header with logo and "Looking For Duo" label
  - Username and region display
  - Role badges (primary + secondary)
  - Riot account cards:
    - Posting account (labeled as "Posting With (Smurf)" if applicable)
    - Main account (if different from posting account)
  - Rank badges with color-coding per tier:
    - Iron: #4A4A4A, Bronze: #CD7F32, Silver: #C0C0C0, Gold: #FFD700
    - Platinum: #00CED1, Emerald: #50C878, Diamond: #B9F2FF
    - Master: #9D4EDD, Grandmaster: #FF6B6B, Challenger: #F4D03F
  - Winrate display (green ≥50%, red <50%)
  - Post message (truncated to 120 chars)
  - VC preference with icon
  - RiftEssence branding footer
- **Error Handling**: 400 for missing ID, 404 for missing post, 500 for generation errors

**User Flow**:
1. User creates duo post on /feed or /create
2. "Share Post" button appears on their own posts
3. Click button → Link copied to clipboard
4. Paste link in Discord → Rich embed appears with custom image
5. Others click link → Redirected to share page with full post details
6. CTAs encourage browsing more posts or creating an account

**Technical Details**:
- **No Authentication Required**: Share links are publicly accessible
- **Privacy Preserved**: Respects anonymous mode (hides usernames/accounts)
- **SEO Optimized**: Proper meta tags for all social platforms
- **Performance**: Edge runtime for fast image generation
- **Scalability**: API endpoint can be cached/CDN'd for production

**Files Created**:
- [apps/web/pages/share/post/[id].tsx](apps/web/pages/share/post/[id].tsx) — Share page component
- [apps/web/pages/api/og/post/[id].tsx](apps/web/pages/api/og/post/[id].tsx) — OG image API route

**Files Modified**:
- [apps/api/src/routes/posts.ts](apps/api/src/routes/posts.ts) — Added GET /:id endpoint
- [apps/web/pages/feed.tsx](apps/web/pages/feed.tsx) — Added share button

**Impact**:
- ✅ Users can promote their duo posts organically via Discord/social media
- ✅ RiftEssence gains free marketing through beautiful share cards
- ✅ Increased visibility and user acquisition
- ✅ Professional appearance in Discord communities
- ✅ Easy one-click sharing with visual appeal

---

## 2026-02-16 — Coaching Offer Details Field Enhancement

### Enhancement: Extended Character Limit and Multi-line Support

**Change**: Coaching offer details text field now supports up to **1000 characters** (increased from 500) with proper newline handling.

**Frontend Changes** ([apps/web/components/CreateCoachingOfferModal.tsx](apps/web/components/CreateCoachingOfferModal.tsx)):
- Updated `maxLength` from 500 to 1000
- Character counter now displays `/1000` instead of `/500`
- Increased textarea `rows` from 4 to 6 for better visibility
- Added `whiteSpace: 'pre-wrap'` CSS to properly display newlines
- Updated validation error message to reflect new limit

**Backend Changes** ([apps/api/src/validation.ts](apps/api/src/validation.ts)):
- Updated `CreateCoachingPostSchema` validation: `details` field now accepts up to 1000 characters
- Updated error message: "Details too long (max 1000 characters)"

**Database**: No changes needed - PostgreSQL `TEXT` type already supports unlimited characters

**Impact**:
- ✅ Coaches can provide more detailed coaching descriptions
- ✅ Line breaks (Enter key) are preserved and displayed correctly
- ✅ Better formatting for structured coaching information (e.g., bullet points, sections)
- ✅ Consistent validation between frontend and backend

---

## 2026-02-16 — Matchup Library Bookmark System Implementation

### Major Refactor: Saved Matchups Instead of Copies

**Problem**: When users "downloaded" matchup guides from the marketplace, the system created full copies of the matchups with `isPublic: false` and `userId: <downloader>`. This meant:
- Downloaded guides appeared as owned matchups with full edit/delete permissions
- Users could edit guides they didn't create (showing "author: unknown" in library)
- Confusion between "your guides" and "saved guides from marketplace"
- Download tracking was conflated with ownership

**Solution**: Implemented a proper bookmark/save system where marketplace guides remain linked to their original authors.

**Architecture Changes**:

**Database**:
- Created `SavedMatchup` junction table with `userId` + `matchupId` (represents current library saves)
- Renamed `MatchupDownload` purpose to permanent analytics tracking only
- Added `savedBy` relation to `Matchup` model
- Added `savedMatchups` relation to `User` model

**API Endpoints**:
- `POST /api/matchups/:id/download` — Now creates `SavedMatchup` record instead of copying matchup
  - Still tracks in `MatchupDownload` for analytics (download count)
  - Returns `alreadySaved` flag if user already has it saved
- `DELETE /api/matchups/:id/saved` — New endpoint to remove saved matchup from library (unbookmark)
- `GET /api/matchups` (library) — Now returns both owned matchups AND saved matchups
  - Each matchup has `isOwned` and `isSaved` flags
  - Sorted by updatedAt/createdAt, paginated
- `GET /api/matchups/marketplace` — Updated to check `SavedMatchup` table for `isDownloaded` status

**Frontend Changes**:
- `MatchupCard.tsx`: 
  - Added `isSaved` and `isOwned` fields to `Matchup` interface
  - Added `onRemove` callback for saved matchups
  - Edit/Delete buttons only shown for owned matchups (`isOwned === true`)
  - "Remove from Library" button shown for saved matchups (`isSaved === true, isOwned === false`)
- `pages/matchups/index.tsx` (library):
  - Added `handleRemove()` function calling `DELETE /api/matchups/:id/saved`
  - Passes `onRemove` to MatchupCard for saved guides
- `pages/matchups/marketplace.tsx`:
  - Updated `handleRemove()` to call new endpoint (removed old logic finding copies by champion matching)
  - Simplified remove logic (just delete SavedMatchup record)

**Translations**: Used existing keys (`matchups.removeFromLibrary`, `matchups.removedFromLibrary`)

**Files Modified**:
- [prisma/schema.prisma](prisma/schema.prisma) — SavedMatchup model, relations
- [apps/api/src/routes/matchups.ts](apps/api/src/routes/matchups.ts) — All endpoint logic
- [apps/web/components/MatchupCard.tsx](apps/web/components/MatchupCard.tsx) — Permission-based buttons
- [apps/web/pages/matchups/index.tsx](apps/web/pages/matchups/index.tsx) — Library with remove handler
- [apps/web/pages/matchups/marketplace.tsx](apps/web/pages/matchups/marketplace.tsx) — Simplified remove logic

**Impact**:
- ✅ Saved matchups are read-only (can't edit/delete)
- ✅ Only show "Remove from Library" for saved guides
- ✅ Own matchups show "Edit" and "Delete" buttons
- ✅ Download count tracking remains accurate (permanent in MatchupDownload)
- ✅ No more "author: unknown" in library (saves reference to original)
- ✅ Clear separation of owned vs saved content

**Migration Note**: Existing users may have old copied matchups in their library. These will show as owned matchups and can be safely deleted if they want to re-save from marketplace.

---

## 2026-02-16 — Matchup Card Preview Fix

### Bug Fix: Library Matchup Cards Show Title Instead of Laning Phase

**Issue**: Matchup guides displayed in library and marketplace were showing the "laning phase" content in the preview section instead of the matchup title and description.

**Fix**: Updated `MatchupCard.tsx` component to display proper preview information:
- **Title**: Shows the matchup's `title` field, or falls back to "{myChampion} vs {enemyChampion}"
- **Description**: Shows the matchup's `description` field, or falls back to `laningNotes` if no description exists
- Updated `Matchup` interface to include optional `title` and `description` fields (matching Prisma schema)

**Files Modified**:
- [apps/web/components/MatchupCard.tsx](apps/web/components/MatchupCard.tsx)

**Impact**: 
- Library and marketplace views now show meaningful titles and descriptions
- Private matchups without titles still display champion names
- Improved user experience when browsing matchup guides

---

## 2026-02-16 — Matchup Download Tracking Final Fix

### Bug Fix: Proper Download Count & Button State Management

**Issues Fixed**:
1. **Download count not updating in real-time** - Frontend was incrementing count locally instead of using backend value
2. **Button showing wrong state after reload** - `isDownloaded` was based on MatchupDownload table (permanent) instead of current library contents
3. **Can add guide multiple times** - Frontend state wasn't properly updating after download

**Solution**:
Separated two distinct concepts:
- **hasDownloadedBefore** (MatchupDownload table) - Used to determine if download count should increment
- **isInLibrary** (current Matchup copies) - Used to determine button display state

**API Changes**:
- `isDownloaded` status now checks if user **currently has a copy** in their library (not whether they've ever downloaded)
- Download endpoint returns actual `downloadCount` and `isFirstDownload` flag
- Download count only increments for first-time downloads (tracked in MatchupDownload table)

**Frontend Changes**:
- `handleDownload` now uses backend-returned `downloadCount` instead of local increment
- Button correctly shows "Add to Library" when no copy exists, "Remove from Library" when copy exists
- State updates properly reflect backend status

**Files Modified**:
- [apps/api/src/routes/matchups.ts](apps/api/src/routes/matchups.ts)
- [apps/web/pages/matchups/marketplace.tsx](apps/web/pages/matchups/marketplace.tsx)

**Impact**:
- Download counts accurately track unique users
- Button state correctly reflects whether user has a copy in their library
- Users can remove and re-add without inflating counts
- Real-time updates work properly

---

## 2026-02-16 — Matchup Download Count Fix (v2)

### Bug Fix: Proper Download Tracking with MatchupDownload Table

**Issue**: Previous fix attempted to check if user currently has a matchup copy, but this failed when users removed and re-added guides. Download counts continued to inflate.

**Root Cause**: 
- Download tracking was based on whether user currently owns a copy of the matchup
- When user deleted their copy and re-downloaded, the check returned false
- No persistent record of "this user has downloaded this guide before"

**Solution**: Added dedicated `MatchupDownload` junction table to track downloads permanently:
- Schema: `userId + matchupId` unique constraint
- Download count only increments on first-ever download per user
- Re-downloading after deletion doesn't inflate the count
- Provides accurate "unique downloads" metric

**Database Changes**:
- Added `MatchupDownload` model with `userId`, `matchupId`, `createdAt`
- Added `matchupDownloads` relation to User model
- Added `downloads` relation to Matchup model

**Files Modified**:
- [prisma/schema.prisma](prisma/schema.prisma) - New MatchupDownload model
- [apps/api/src/routes/matchups.ts](apps/api/src/routes/matchups.ts) - Updated download endpoint

**Impact**:
- Download counts now accurately reflect unique users who downloaded each guide
- Users can delete and re-add guides without inflating metrics
- Marketplace "Most Downloaded" sorting is now reliable

---

## 2026-02-16 — Matchup Download Count Fix

### Bug Fix: Duplicate Download Count When Re-adding to Library

**Issue**: When a user adds a matchup to their library, removes it, then adds it back, the download count on the original matchup was incorrectly incremented multiple times for the same user.

**Note**: This fix was incomplete - see "Matchup Download Count Fix (v2)" above for the proper solution.

---

## 2026-02-16 — Matchup Card Author Display

### Enhancement: Show Author Name Instead of Description

**Change**: Matchup cards now display the author's name under the title instead of showing the description or laning phase content.

**Implementation**:
- Added `useAuth` to MatchupCard component to access current user
- Author display shows "you" (localized) if the current user is the author
- Shows the author's username for other users' matchups
- Added `common.you` translation key in both English ("you") and French ("vous")

**Files Modified**:
- [apps/web/components/MatchupCard.tsx](apps/web/components/MatchupCard.tsx)
- [apps/web/translations/index.ts](apps/web/translations/index.ts)

**User Experience**:
- Clearer attribution in library and marketplace views
- Users can immediately identify their own matchups with "Author: you"
- More compact card design focusing on title and authorship

---

## 2026-02-16 — Open Graph Meta Tags & SEO

### New Feature: Rich Social Media Embeds

**Feature**: Implemented Open Graph and Twitter Card meta tags for rich social media previews when sharing RiftEssence links on Discord, Twitter, Facebook, etc.

**Overview**:
When a RiftEssence URL is shared on social platforms, it now displays a professional embed card with title, description, and image instead of a plain text link.

**Global Meta Tags** (`apps/web/pages/_app.tsx`):
- Open Graph tags: `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:image:width/height`, `og:site_name`, `og:locale`
- Twitter Card tags: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
- Standard meta tags: `description`, `keywords`, `theme-color`
- Favicon link and mobile theme color

**SEO Component** (`apps/web/components/SEOHead.tsx`):
- Reusable component for page-specific meta tag overrides
- Props: `title`, `description`, `ogImage`, `path`
- Auto-generates full title, URL, and fallbacks to defaults
- Used across all main pages (home, coaching, LFD, LFT, matchups)

**Page-Specific Meta Tags**:
- **Home** (index.tsx): Default RiftEssence platform description
- **Coaching** (coaching/index.tsx): "Coaching Gratuit League of Legends" focused on free Emerald+ coaching
- **LFD** (feed.tsx): "Looking for Duo" with advanced filtering description
- **LFT** (lft.tsx): "Looking for Team" emphasizing recruitment and profiles
- Each page has custom French descriptions optimized for Discord audience

**OG Image Template** (`apps/web/public/assets/og-image-template.html`):
- Standalone HTML template for generating 1200x630px Open Graph image
- Features:
  - RiftEssence logo with gradient gold styling
  - "Plateforme Communautaire League of Legends" tagline
  - Feature badges: 🤝 LFD, 👥 LFT, 🎓 Coaching, 📊 Matchups
  - "BÊTA" badge in top-right
  - Matches Classic Dark theme aesthetic
- Includes step-by-step instructions for screenshot capture
- Expected output: `/public/assets/og-image.png`

**SEO Benefits**:
- **Discord Embeds**: Rich previews when sharing links in Discord servers/DMs
- **Twitter Cards**: Expanded link previews with image on Twitter
- **Facebook/LinkedIn**: Proper link previews on other social platforms
- **Search Engines**: Better indexing with structured meta descriptions
- **Professional Appearance**: Increases click-through rates and perceived legitimacy for beta launch

**DevTunnel Configuration**:
- OG image URL points to DevTunnel: `https://qpnpc65t-3333.uks1.devtunnels.ms/assets/og-image.png`
- Will need update to production URL post-deployment

**Technical Notes**:
- OG image: 1200x630px (recommended by Facebook/Discord/Twitter)
- Image format: PNG recommended for quality and transparency support
- All URLs use absolute paths for proper social crawler resolution
- French-first descriptions targeting francophone League community

---

## 2026-02-16 — Coaching System

### New Feature: Coaching Marketplace

**Feature**: Free coaching system allowing Emerald+ players to offer coaching and any user to request coaching.

**Overview**:
Users ranked Emerald or higher can create posts offering free coaching services, specifying their specializations, available roles, languages, and availability. Any user regardless of rank can create posts seeking coaching. The system facilitates connections between coaches and students through direct messaging.

**Database Schema** (`prisma/schema.prisma`):
- **`CoachingPost` model**: 
  - `type`: OFFERING or SEEKING (enum)
  - `region`, `roles[]`, `languages[]`: Filtering fields
  - `availability`: TeamAvailability enum (reused from LFT)
  - `details`: free-text description (max 500 chars)
  - `discordTag`: optional Discord contact
  - OFFERING-specific: `coachRank` (EMERALD+), `coachDivision`, `specializations[]`
  - Relations: → User (author), Community (optional)
  - Indexes: `[type, createdAt]`, `[region, type, createdAt]`, `[authorId]`, `[communityId]`
  - Cascade delete on User deletion
- **`CoachingPostType` enum**: OFFERING, SEEKING
- Updated `User` model with `coachingPosts` relation
- Updated `Community` model with `coachingPosts` relation

**Backend API** (`apps/api/src/routes/coaching.ts`):
3 REST endpoints:
1. `GET /api/coaching/posts` - Fetch coaching posts with filters (region, type, blocked users)
2. `POST /api/coaching/posts` - Create coaching post (auth required, validates Emerald+ for offers)
3. `DELETE /api/coaching/posts/:id` - Delete coaching post (owner or admin only)

**Backend Validation** (`apps/api/src/validation.ts`):
- **`CreateCoachingPostSchema`**: Zod schema with custom refinement for Emerald+ rank requirement on OFFERING type
- Validates region, roles, languages, availability, details (max 500), discordTag (max 50)
- Specializations array validation for OFFERING posts

**Frontend Pages** (`apps/web/pages/coaching/index.tsx`):
- **Main Coaching Page** (`/coaching`):
  - Two tabs: "Coaching Offers" and "Seeking Coaching"
  - Region filter dropdown (all regions supported)
  - Two CTA buttons:
    - "Offer Your Coaching" (validates Emerald+ rank, shows error if not met)
    - "Request Coaching" (no rank requirement)
  - Post feed with bidirectional blocked users filter
  - Post cards display:
    - OFFERING: Rank badge, specializations pills, roles, languages, availability, details, Discord contact
    - SEEKING: Roles, languages, availability, details, Discord contact
  - Action buttons: View Profile, Message (via ChatContext), Delete (owner/admin)
  - Loading states, empty states, error handling
  - Auth-gated: NoAccess component for unauthenticated users

**Frontend Components** (`apps/web/components/`):
- **`CreateCoachingOfferModal.tsx`**: 
  - Form for Emerald+ users to offer coaching
  - Auto-populates: region, rank, roles, languages, Discord tag from user profile
  - Fields: Region, Coach Rank (EMERALD→CHALLENGER), Division (conditional), Availability slider, Roles (multi-select), Specializations (6 preset options), Languages, Details (500 char with counter), Discord Tag (50 char with counter)
  - Theme-aware slider with emoji indicators
  - Validation: Required fields, character limits
  - Success/error toasts

- **`CreateCoachingRequestModal.tsx`**:
  - Simpler form for users seeking coaching
  - Auto-populates: region, roles, languages, Discord tag
  - Fields: Region, Availability slider, Roles, Languages, Details, Discord Tag
  - Same validation and toast patterns

**Navigation** (`apps/web/components/Navbar.tsx`):
- Added "Coaching" link to desktop navbar (after Matchups)
- **Moved "Communities" from navbar to user dropdown menu**
- Added "Coaching" link to mobile menu
- Updated both English and French translations

**Translations** (`apps/web/translations/index.ts`):
- Added 38 translation keys in `coaching` section (English and French):
  - `coaching.title`, `coaching.offerCoaching`, `coaching.seekCoaching`
  - `coaching.filters`, `coaching.coachingOffers`, `coaching.seekingCoaching`
  - `coaching.noListings`, `coaching.createOffer`, `coaching.createRequest`
  - `coaching.specializations`, `coaching.availability`, `coaching.roles`, `coaching.languages`
  - `coaching.details`, `coaching.discordTag`, `coaching.coachRank`
  - `coaching.emeraldRequired`, 6 specialization keys (waveManagement, visionControl, macro, teamfighting, laneControl, championMastery)
  - `coaching.viewProfile`, `coaching.deletePost`, `coaching.contactCoach`, `coaching.contactStudent`
  - `coaching.postType`, `coaching.offering`, `coaching.seeking`
  - `coaching.detailsPlaceholder`, success/error messages

**Design Patterns**:
- Follows same patterns as LFT system (bidirectional blocking, admin checks, region filtering)
- Reuses components: NoAccess, LoadingSpinner, role icons, rank badges, language badges
- CSS variables for theme support (no hardcoded colors)
- All text through translation system (i18n support)
- Consistent error handling and toast notifications

**Business Logic**:
- Emerald+ rank requirement enforced both frontend (UI validation) and backend (Zod schema refinement)
- One active post per type per user (prevents spam)
- Discord account or manual Discord tag required for contact
- Specializations: Wave Management, Vision Control, Macro, Teamfighting, Lane Control, Champion Mastery
- Availability levels: TeamAvailability enum (ONCE_A_WEEK → EVERYDAY)

**Security & Privacy**:
- Auth required for all post creation/deletion
- Bidirectional blocking respected (users can't see posts from blocked users or users who blocked them)
- Owner or admin authorization for deletion
- Input sanitization and validation on all fields

---

## 2026-02-16 — Matchups System

### New Feature: Matchups System

**Feature**: Comprehensive matchup note-taking and sharing system for champion-vs-champion matchup guides.

**Overview**:
Users can create detailed matchup sheets documenting how to play specific champion matchups, including laning strategies, team fight tactics, item builds, and power spikes. They can keep these private or share them publicly in a community marketplace where others can download, like/dislike, and learn from them.

**Database Schema** (`prisma/schema.prisma`):
Two new models added (schema was already implemented):
- **`Matchup`**: Stores matchup sheets with role, myChampion, enemyChampion, difficulty level, detailed notes (laning, teamfights, items, spikes), public/private visibility, title/description for public sharing
- **`MatchupLike`**: Tracks likes/dislikes on public matchups with unique constraint per user-matchup pair
- **`MatchupDifficulty` enum**: FREE_WIN, VERY_FAVORABLE, FAVORABLE, SKILL_MATCHUP, HARD, VERY_HARD, FREE_LOSE

**Backend API** (`apps/api/src/routes/matchups.ts`):
9 REST endpoints fully implemented:
1. `GET /api/matchups` - User's personal library (with filters)
2. `POST /api/matchups` - Create new matchup
3. `GET /api/matchups/:id` - Get single matchup (with ownership checks)
4. `PUT /api/matchups/:id` - Update matchup (owner only)
5. `DELETE /api/matchups/:id` - Delete matchup (owner only)
6. `GET /api/matchups/public` - Browse public marketplace (with filters and sorting)
7. `POST /api/matchups/:id/vote` - Like/dislike public matchup (toggle mechanism)
8. `POST /api/matchups/:id/download` - Copy public matchup to personal library

**Frontend Components** (`apps/web/components/`):
- **`DifficultySlider.tsx`**: Interactive 7-level difficulty slider with color gradient (green → yellow → red)
- **`ChampionAutocomplete.tsx`**: Searchable champion dropdown with icons from Riot Data Dragon API
- **`MatchupCard.tsx`**: Reusable matchup display card with stats, badges, and action buttons

**Frontend Utilities** (`apps/web/utils/`):
- **`championData.ts`**: Champion fetching from Data Dragon with 24-hour localStorage caching, name normalization (Wukong→MonkeyKing, Kai'Sa→Kaisa, etc.), icon URL generation

**Frontend Pages** (`apps/web/pages/matchups/`):

1. **Personal Library** (`/matchups`):
   - Grid view of user's matchup sheets
   - Search by champion name
   - Filters: Role (6 roles), Difficulty (7 levels)
   - "Create New Matchup" button
   - Edit/Delete actions on each card
   - Pagination with Load More
   - Empty state with call-to-action

2. **Create/Edit Form** (`/matchups/create`):
   - Edit mode via `?id=xxx` query param
   - Role selector with icons
   - Champion autocomplete for myChampion and enemyChampion
   - Difficulty slider (default: SKILL_MATCHUP)
   - 4 text areas (2000 char max each) with live character counters:
     - Laning Phase Notes
     - Team Fight Notes
     - Items & Builds Notes
     - Power Spikes Notes
   - Public sharing toggle with conditional title/description fields
   - Full client-side validation
   - Auth required (NoAccess component)

3. **Public Marketplace** (`/matchups/marketplace`):
   - Browse community matchup sheets
   - No auth required to browse (auth required for actions)
   - Search by champion name (searches both myChampion and enemyChampion)
   - Filters: Role, Difficulty, Sort By (Newest/Most Liked/Most Downloaded)
   - Grid of public matchup cards with:
     - Author username
     - Like/Dislike buttons (toggle mechanism, disabled on own matchups)
     - Net likes display (+/- count)
     - Download button (creates copy in personal library)
     - Click card to view detail
   - Pagination
   - Empty state message

4. **Detail View** (`/matchups/:id`):
   - Full matchup sheet display
   - Large header: Champion VS Champion with role and difficulty badges
   - Author info for public matchups
   - Stats: Like count, Dislike count, Download count
   - Context-aware action buttons:
     - Own matchups: Edit, Delete, Toggle Public
     - Public matchups: Like, Dislike, Download
   - Tabbed notes sections (Laning/Teamfights/Items/Spikes)
   - Auth required for private matchups (only owner can view)
   - Back button navigation

**Navigation** (`apps/web/components/Navbar.tsx`):
- Added "Matchups" link to desktop navigation bar
- Added "Matchups" link to mobile menu
- Positioned between "LFT" and "Leaderboards"

**Translations** (`apps/web/translations/index.ts`):
- Added 75 new translation keys in `matchups` section
- Complete English and French translations
- Covers all UI elements, form labels, buttons, messages, difficulty levels

**Key Features**:
- **Champion Data Integration**: Uses Riot Data Dragon API (v14.23.1) for champion names and icons
- **Smart Caching**: 24-hour localStorage cache reduces API calls
- **Vote System**: Toggle mechanism (click again to remove vote, click opposite to change vote)
- **Download Protection**: Prevents duplicate matchups (same role + myChampion + enemyChampion)
- **Access Control**: Private matchups only visible to owner, public matchups visible to all
- **Responsive Design**: Mobile-friendly layouts throughout
- **Theme Compliance**: All colors use CSS variables for full theming support
- **Error Handling**: Toast notifications for all user actions
- **Real-time Character Counters**: Live feedback on text area limits

**User Flows**:

1. **Create Private Guide**:
   - Navigate to /matchups → "Create New Matchup"
   - Select role, champions, difficulty
   - Write notes in text areas
   - Leave "Make Public" unchecked
   - Save → Appears in personal library

2. **Share Public Guide**:
   - Edit existing matchup or create new
   - Toggle "Make Public"
   - Add title and description
   - Save → Now visible in marketplace

3. **Download Community Guide**:
   - Browse marketplace → Find useful guide
   - Click "Download" → Creates private copy in personal library
   - Edit copy as needed for personal use

4. **Vote on Guides**:
   - Browse marketplace
   - Click Like (👍) or Dislike (👎)
   - Click again to remove vote
   - Vote changes reflected in net likes count

**Technical Highlights**:
- **Zero Backend Changes Required**: Database schema and API were pre-implemented
- **Reusable Components**: All components follow RiftEssence patterns
- **TypeScript Compliance**: No errors, full type safety
- **Performance Optimized**: Database indexes on common queries, pagination everywhere
- **Security**: JWT auth, ownership checks, input validation (Zod schemas)

**Files Modified**:
- Created: 8 new files (4 pages, 3 components, 1 utility)
- Modified: 2 files (Navbar.tsx, translations/index.ts)
- Lines Added: ~2,000+ lines

---

## 2026-02-15 — Feed Language Filter & Visual Enhancements

### Feed: Language Filter

**Feature**: Added language filter to the Looking For Duo feed, allowing users to filter posts by language preference.

**Implementation**:
- **Backend** (`apps/api/src/routes/posts.ts`):
  - Added `language` query parameter support to GET `/api/posts` endpoint
  - Uses Prisma's `hasSome` operator to match posts that have at least one selected language
  - Supports multiple languages via array parameter (e.g., `?language=English&language=French`)

- **Frontend** (`apps/web/pages/feed.tsx`):
  - Added `languages` array to filter state
  - New Languages filter column in Primary Filters section (5-column grid layout)
  - Scrollable checkbox list with 12 languages: English, French, Spanish, German, Portuguese, Italian, Polish, Turkish, Russian, Korean, Japanese, Chinese
  - Active language filters display as removable pills above the feed
  - Filter changes trigger automatic feed refresh via useEffect dependency
  - **User's region and languages are pre-selected on page load** based on their profile settings (main account region + profile languages)

**User Experience**:
- Users can select multiple languages to see posts from people who speak any of those languages
- **Feed automatically pre-filters based on user's own region and languages** for personalized results
- Useful for multilingual players or those looking for duo partners who speak specific languages
- Works seamlessly with existing region, role, and other filters
- Users can easily modify or clear pre-selected filters to broaden their search

---

### Visual Enhancement: Champion Pool Icons

**Feature**: Added champion icons to champion pool display for better visual appeal.

**Implementation** (`apps/web/pages/profile.tsx`):
- Champion icons now display from Data Dragon CDN (version 14.23.1)
- Each champion shows a 32x32px icon next to their name (w-8 h-8 classes)
- Helper function `getChampionIconUrl()` handles:
  - Name normalization for Data Dragon API compatibility
  - Special cases mapping (Wukong → MonkeyKing, Kai'Sa → Kaisa, etc.)
- Icons hide on error (graceful fallback to just showing name)
- Works in both view mode and edit mode

**Special Cases Handled**:
- Wukong → MonkeyKing
- Kai'Sa → Kaisa
- Kha'Zix → Khazix
- Cho'Gath → Chogath
- Vel'Koz → Velkoz
- LeBlanc → Leblanc
- Rek'Sai → RekSai
- Bel'Veth → Belveth
- K'Sante → KSante
- Renata Glasc → Renata
- Nunu & Willump → Nunu

**User Experience**:
- Champion pool is more visually appealing and easier to scan
- Icons make champions instantly recognizable
- Consistent with League of Legends visual language

---

### Real-Time Chat Updates

**Feature**: Added polling mechanism for real-time message updates without page refresh.

**Implementation**:
- **Message Polling** (`apps/web/components/ChatWidget.tsx`):
  - Polls for new messages every 2 seconds when a conversation is open
  - Compares message count and last message ID to detect changes
  - Only updates UI when new messages are detected (prevents unnecessary re-renders)
  - Automatically marks messages as read and updates unread counts

- **Conversation List Polling**:
  - Polls for conversation updates every 5 seconds when chat widget is open
  - Keeps conversation list fresh with latest message previews and timestamps
  - Updates unread counts across all conversations

- **Existing Unread Count Polling**:
  - Already polling every 10 seconds for global unread count
  - Shows badge with unread count on chat button

**User Experience**:
- Messages appear in real-time without manual refresh
- Unread counts update automatically
- Smooth, responsive chat experience
- Works with existing REST API endpoints (no backend changes needed)

**Future Enhancement**: Can be upgraded to WebSockets for even lower latency and reduced server load.

---

### Fixed Badge Management System

**Problems**:
1. **Badge Assignment Broken**:
   - Badge assignment (POST `/api/user/assign-badge`) failing with 401 Unauthorized
   - Badge removal (POST `/api/user/remove-badge`) failing with 401 Unauthorized
   - Frontend missing Authorization Bearer token headers

2. **Poor User Search Experience**:
   - Only supported exact username or user ID lookups
   - Required clicking "Load User" button after typing
   - No dropdown results, difficult to discover users
   - No partial username matching or search-as-you-type

**Fixes Applied**:
- **Frontend** (`apps/web/pages/admin/badges.tsx`):
  - ✅ Added `getAuthHeader()` to badge assignment POST request
  - ✅ Added `getAuthHeader()` to badge removal POST request
  - ✅ Implemented real-time user search using existing `/api/user/search` endpoint
  - ✅ Added search-as-you-type with 300ms debounce
  - ✅ Added dropdown showing up to 10 matching users with badges and verification status
  - ✅ Click outside dropdown to close (improved UX)
  - ✅ Minimum 2 characters required for search
  - ✅ Search cleanup on component unmount

**User Experience**:
- Badge assignment now works correctly with proper authentication
- Admins can start typing any username and see instant results
- Search results show user badges and verification status for quick identification
- Selecting a user from dropdown pre-fills and loads their full profile

---

## 2026-02-15 — Admin Broadcast System & Chat System Improvements

### CRITICAL SECURITY FIXES (Batch 3): Feedback & Report System Authentication

**Severity: MEDIUM** — Fixed missing authentication headers and authorization logic in feedback system.

**Problems**:
1. **Missing Authorization Headers**:
   - Feedback submission (POST `/api/feedback`) missing Authorization Bearer token
   - Feedback deletion (DELETE `/api/feedback/:id`) missing Authorization Bearer token  
   - Report submission (POST `/api/report`) missing Authorization Bearer token
   - Frontend passing redundant `raterId`, `reporterId`, `userId` in request body

2. **Overly Restrictive Permissions**:
   - Feedback deletion endpoint only allowed admins
   - Users couldn't delete their own feedback, getting 403 Forbidden error

3. **Content-Type Header Issue**:
   - DELETE request sending 'Content-Type: application/json' with no body
   - Caused Fastify content parser to return 400 Bad Request

**Symptoms**:
- Users submitting feedback got "Authorization header missing" error
- Deleting own feedback failed with 403 Forbidden "You must be an admin to delete feedback"
- After auth fix, DELETE requests failed with 400 Bad Request
- Reporting users failed with authentication error

**Fixes Applied**:
- **Frontend** (`apps/web/pages/profile.tsx`):
  - ✅ Added `getAuthHeader()` to feedback submission (POST)
  - ✅ Added `getAuthHeader()` to feedback deletion (DELETE)
  - ✅ Removed 'Content-Type: application/json' header from DELETE (no body sent)
  - ✅ Added `getAuthHeader()` to report submission (POST)
  - ✅ Removed redundant `raterId`, `reporterId`, `userId` from request bodies (backend extracts from JWT)
  - ✅ Removed unnecessary `currentUserId` dependency checks

- **Backend** (`apps/api/src/index.ts`):
  - ✅ Updated DELETE `/api/feedback/:id` authorization logic
  - ✅ Users can now delete their own feedback (where `raterId === userId`)
  - ✅ Admins can delete any feedback (existing behavior preserved)
  - ✅ Improved error message: "You can only delete your own feedback or must be an admin"

**Files Modified**:
- `apps/web/pages/profile.tsx` (lines 984-1091: handleSubmitFeedback, handleSubmitReport, handleDeleteFeedback)
- `apps/api/src/index.ts` (lines 495-546: DELETE /api/feedback/:id endpoint)

---

### CRITICAL SECURITY FIXES (Batch 2): Discord OAuth Authentication & Redirect

**Severity: MEDIUM** — Fixed authentication and redirect issues in Discord OAuth flow.

**Problems**:
1. **Missing Authorization Headers**: Discord link/unlink endpoints required JWT authentication but frontend wasn't sending Authorization Bearer token
2. **Hardcoded Redirect URL**: After successful Discord OAuth, callback redirected to `http://localhost:3000` instead of using environment-configured frontend URL (tunnel URL for remote access)
3. **Undefined userId Variable**: After unlinking Discord, profile refresh used undefined `userId` variable causing "userid not defined" error

**Symptoms**:
- Users clicking "Link Discord" got "Authorization header missing" error
- Discord OAuth callback would redirect to localhost instead of tunnel URL for remote users
- After unlinking Discord account, got JavaScript error "userid not defined"

**Fixes Applied**:
- **Frontend** (`apps/web/pages/profile.tsx`):
  - ✅ Added `getAuthHeader()` to Discord login GET request
  - ✅ Added `getAuthHeader()` to Discord unlink DELETE request
  - ✅ Fixed profile refresh after unlink to use JWT auth instead of undefined userId variable
  - ✅ Removed manual userId extraction and query params (now handled by JWT)
  
- **Backend** (`apps/api/src/routes/discord.ts`):
  - ✅ Callback now uses `process.env.FRONTEND_URL` for redirect instead of hardcoded localhost
  - ✅ Fallback to `http://localhost:3000` if FRONTEND_URL not set (dev environment)

- **Configuration**:
  - ✅ Added `FRONTEND_URL` to `.env` (set to tunnel URL for testing)
  - ✅ Added `FRONTEND_URL` to `docker-compose.yml` environment variables

**Files Modified**:
- `apps/web/pages/profile.tsx` (lines 1871, 1879, 1915)
- `apps/api/src/routes/discord.ts` (lines 123-124)
- `.env` (added FRONTEND_URL)
- `docker-compose.yml` (added FRONTEND_URL env var)

---

### CRITICAL SECURITY FIXES (Batch 1): User Profile API Authentication

**Severity: HIGH** — Fixed data leak vulnerability where users could see/modify other users' profile data.

**Problem**: Multiple user profile API endpoints were using `prisma.user.findFirst()` as a fallback when authentication failed, causing the API to return the first user in the database regardless of who made the request. This allowed users to:
- View other users' champion pools, playstyles, languages, and anonymous settings
- Modify other users' profile data by sending requests without authentication
- Example: Friend added Aatrox to champion pool but saw the first user's pool pre-selected

**Root Causes**:
1. **Backend**: 5 endpoints (champion-pool, playstyles, languages, anonymous, refresh-riot-stats) not using `getUserIdFromRequest()` for authentication
2. **Frontend**: profile.tsx sending API requests without Authorization Bearer token headers

**Fixes Applied**:
- **Backend** (`apps/api/src/routes/user.ts`):
  - ✅ PATCH `/champion-pool` — Now requires JWT authentication via `getUserIdFromRequest()`
  - ✅ PATCH `/playstyles` — Now requires JWT authentication
  - ✅ PATCH `/languages` — Now requires JWT authentication (removed query param fallback)
  - ✅ PATCH `/anonymous` — Now requires JWT authentication
  - ✅ POST `/refresh-riot-stats` — Now requires JWT authentication (removed query param fallback)
  - Removed all `findFirst()` fallbacks and `userId` query parameters
  - All endpoints now return 401 Unauthorized if no valid JWT token is present

- **Frontend** (`apps/web/pages/profile.tsx`):
  - ✅ Added `getAuthHeader()` to all champion-pool, playstyles, languages, and anonymous API calls
  - ✅ Removed userId query parameters (now handled by JWT token)
  - ✅ Added check to only call refresh-riot-stats when not viewing other profiles

**Impact**: 
- Users can now only view/modify their own profile data
- All profile-related API calls require valid authentication
- Previous security hole is completely closed

**Files Modified**:
- `apps/api/src/routes/user.ts` (lines 489-689)
- `apps/web/pages/profile.tsx` (lines 633, 712, 769, 794, 828, 906)

---

## 2026-02-15 — Admin Broadcast System & Chat Improvements (morning session)

### New Feature: Admin Broadcast System Message
- **Backend API**: POST /api/admin/broadcast-message endpoint
  - Requires admin badge verification
  - Creates/uses System user (username: "System", profileIconId: 29)
  - Broadcasts message to all users except admin and system user
  - Returns statistics: totalUsers, conversationsCreated, messagesSent
  - Full admin audit logging
  - **Files modified**: `apps/api/src/index.ts`, `apps/api/src/validation.ts`
  - **Schema**: BroadcastMessageSchema (10-2000 characters)
  
- **Frontend Admin UI**: `/admin/broadcast` page
  - Admin-protected broadcast form with character counter
  - Real-time message preview showing System user appearance
  - Confirmation dialog before sending
  - Success statistics display (users messaged, conversations created)
  - Full i18n support (English/French)
  - League of Legends themed styling with CSS variables
  - **Files created**: `apps/web/pages/admin/broadcast.tsx`
  - **Files modified**: `apps/web/pages/admin/index.tsx` (menu item), `apps/web/translations/index.ts` (11 new keys)

### Chat System Bug Fixes & Visual Improvements

### Bugs Fixed
- **profileIconId schema mismatch** — Chat API tried to select profileIconId from User model, but field only exists on RiotAccount
  - Fixed GET /api/chat/conversations to select profileIconId from riotAccounts relation
  - Fixed GET /api/chat/conversations/:conversationId/messages to select profileIconId from riotAccounts
  - Fixed POST /api/chat/messages to include profileIconId from riotAccounts
  - Added response transformation to flatten profileIconId for frontend compatibility
  - This fixed 500 Internal Server Error when fetching conversations
  - **Files modified**: `apps/api/src/routes/chat.ts` (lines 37-95, 122-176, 237-295)

- **Missing database tables** — Chat tables (Conversation, Message) were not created in the database
  - Ran `prisma db push` to create missing tables
  - Applied Conversation and Message models to PostgreSQL database
  - Restarted API server to reload Prisma client
  
- **Message button context triggering** — Fixed React context not re-triggering for same user
  - Changed `conversationToOpen` from string to object with timestamp
  - Ensures message button always triggers even when clicking same user multiple times
  - Added comprehensive console logging for debugging
  - **Files modified**: `apps/web/contexts/ChatContext.tsx`, `apps/web/components/ChatWidget.tsx`

### Visual Improvements
- **User avatars throughout chat interface** — Profile icons from Data Dragon or gradient circles with initials
  - Conversation list: 40px avatars for each user
  - Message bubbles: 32px avatars for incoming messages
  - Header: 40px avatar when conversation is open
  
- **Rank and region badges** — Colored rank badges with Community Dragon icons
  - Rank badges show in conversation list and header
  - Region badges display alongside ranks
  - Rank-specific colors (Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster, Challenger)
  
- **Enhanced conversation list**
  - Relative timestamps ("2m ago", "1h ago", "3d ago")
  - Hover effects with scale transform
  - Unread conversations have golden glow effect
  - Better visual hierarchy and spacing
  
- **Improved message bubbles**
  - Sender names above incoming messages
  - Subtle box shadows for depth
  - Better spacing and padding
  - Avatar integration for context
  
- **Floating button animations**
  - Pulse animation when unread messages exist
  - Golden glow effect for unread indicator
  - Smooth scale transform on hover
  
- **Backend API updates** — Added `profileIconId` to chat endpoints
  - Updated `/api/chat/conversations` to include user `profileIconId`
  - Updated `/api/chat/conversations/:id/messages` to include sender `profileIconId`
  - Updated `/api/chat/messages` POST to include sender `profileIconId`
  
- **Files modified**: `apps/api/src/routes/chat.ts`, `apps/web/components/ChatWidget.tsx`

---

## 2026-02-12 — Chat System Implementation

### Features Added
- **Real-time chat system** — Direct messaging between users with League of Legends-style floating chat widget
- **Floating chat button** — Bottom-right corner button with unread count badge, matching LoL client design
- **Message buttons on profiles** — "Message" button added to user profiles alongside "Leave Feedback"
- **Message buttons on posts** — "Message" button added to feed posts and LFT posts next to "View Profile"
- **Conversation management** — Tracks conversations between users, displays recent conversations with unread counts
- **Unread count polling** — Automatically checks for new unread messages every 10 seconds

### Database Schema
- **Conversation model** — Tracks 1-to-1 conversations with `user1`/`user2`, `unreadCountUser1`/`unreadCountUser2`, `lastMessageAt`
- **Message model** — Stores individual messages with `conversationId`, `senderId`, `content`, `read` status
- Added chat relations to **User model** — `conversationsInitiated`, `conversationsReceived`, `messagesSent`

### API Endpoints
- `GET /api/chat/conversations` — Fetch all conversations for current user with `otherUser` data
- `GET /api/chat/conversations/:conversationId/messages` — Get messages in conversation (last 100), marks as read
- `POST /api/chat/messages` — Send message (creates conversation if doesn't exist), increments recipient's unread count
- `GET /api/chat/unread-count` — Sum of unread counts across all conversations
- `POST /api/chat/conversations/with/:userId` — Get or create conversation with specific user

### Security
- Block checking — Cannot message users who blocked you or whom you've blocked
- Transaction safety — Conversation creation and unread count management uses Prisma transactions
- Auth required — All endpoints require JWT authentication via `getUserIdFromRequest` middleware

### UI Components
- **ChatWidget** (`apps/web/components/ChatWidget.tsx`) — 400+ line component with conversation list and message thread views
- **Auto-scroll to latest message** — New messages automatically scroll into view
- **2000 character message limit** — Client-side validation with char count display
- **Themed styling** — Uses CSS variables for consistent theming across all 5 themes

### Files Modified
- `prisma/schema.prisma` — Added Conversation and Message models (⚠️ **Migration not yet applied**)
- `apps/api/src/routes/chat.ts` — NEW FILE with complete chat API
- `apps/api/src/index.ts` — Registered `/api/chat` routes
- `apps/web/components/ChatWidget.tsx` — NEW FILE with floating chat UI
- `apps/web/pages/_app.tsx` — Added ChatWidget to layout
- `apps/web/pages/profile.tsx` — Added Message button to user profiles
- `apps/web/pages/feed.tsx` — Added Message button to feed posts
- `apps/web/pages/lft.tsx` — Added Message button to LFT posts

### Next Steps
⚠️ **User Action Required**: Run database migration to create chat tables:
```bash
pnpm exec prisma migrate dev --name add_chat_system
```
(Note: Migration could not be applied automatically due to database connection issues during implementation)

---

## 2026-02-11 — Security Improvements (Pre-Production)

### Security Fixes
- **Fixed feedback race condition vulnerability** — Wrapped cooldown checks and duplicate rating checks in Prisma transaction to prevent concurrent requests from bypassing 5-minute cooldown or creating duplicate ratings
- **Removed user enumeration vulnerability** — Changed login error message from "This account uses Riot login only" to generic "Invalid credentials" to prevent attackers from determining which accounts exist

### Impact
- Prevents abuse scenario where attackers could spam feedback by sending multiple concurrent requests
- Prevents username enumeration attacks where attackers could discover valid accounts
- No breaking changes — existing functionality preserved

---

## 2026-02-12 — New Themes & Custom Spinner Animations

### 4 New Themes Added
- **Ocean Depths** (`ocean-depths`) — Deep navy/teal oceanic theme with cyan/turquoise accents
- **Forest Mystic** (`forest-mystic`) — Nature-inspired dark green theme with lime/emerald accents
- **Sunset Blaze** (`sunset-blaze`) — Warm orange/brown sunset theme with gold accents
- **Shadow Assassin** (`shadow-assassin`) — Ultra-dark purple/black stealth theme with violet accents

### Custom Spinner Animations
- **Ocean Depths** — Swirling water vortex with rising bubbles (watery fluid motion)
- **Forest Mystic** — 6 rotating leaves in circular pattern with floating animation
- **Sunset Blaze** — Pulsing sun with 8 rotating gradient rays and glow effects
- **Shadow Assassin** — Swirling smoke/shadow shapes with spiral rotation and purple glow

### Theme Preview Enhancement
- **Settings page now shows actual LoadingSpinner previews** for each theme
- Each theme card displays the real animated spinner (scaled to 50%) in a preview container
- Uses ThemeContext.Provider to temporarily apply each theme for accurate preview
- Users can now see the complete theme experience (colors + custom spinner) before switching

### Bug Fixes
- **Fixed LoadingSpinner preview overlay bug** — Added `compact` prop to LoadingSpinner component to remove full-screen wrapper and background color
- **Fixed LoadingSpinner centering issues** — All spinner animations now properly centered in their containers
  - Compact mode now uses explicit dimensions (w-20 h-20 = 80px)
  - Infernal Ember flame animation wrapped in centered container for consistent sizing
  - Removed redundant wrapper div in settings page preview
- **Fixed multi-element animation transform origins**:
  - **Sunset Blaze**: Rays now properly rotate around sun center point (added `-translate-x-1/2 -translate-y-1/2`, adjusted transform origin to `center center`)
  - **Forest Mystic**: Leaves now properly rotate around center core (added proper centering translation)
  - **Shadow Assassin**: Smoke trails now properly spiral around center point (fixed transform origin)
  - All rotating elements now use `transformOrigin: 'center center'` for accurate rotation
- **Improved animation visibility and spacing**:
  - **Forest Mystic**: Larger leaves (18px x 24px), bigger center core (32px), simplified rotation without conflicting animations
  - **Sunset Blaze**: Rays pushed further from sun (translateY -32px), smaller sun core (40px), longer rays (28px), gradient direction fixed for better visibility
  - **Shadow Assassin**: Larger smoke trails (36px x 10px), bigger center core (24px), higher opacity (0.5-0.9), reduced blur for clarity
- **Fixed rotation axis for radial animations**:
  - **Complete redesign**: Changed from rotating parent container to individual element animations
  - **Forest Mystic**: Each 18x24px leaf uses `translate(-50%, -50%)` for perfect centering before rotation and radial translation of 32px
  - **Sunset Blaze**: Each 3x28px ray uses `translate(-50%, -50%)` before rotation, pushed 38px from center (increased from 32px for better spacing from sun core)
  - **Shadow Assassin**: Each 36x10px smoke trail centered with `translate(-18px, -5px)` before rotation; simplified animation (removed chaotic opacity changes from orbit keyframes)
  - Animation delays calculated based on initial angle to create smooth circular formation during rotation
  - All animations now use percentage-based centering (`translate(-50%, -50%)`) for accurate positioning regardless of element size
- Preview mode displays only the spinner animation without layout interference
- Resolves visual overflow and displacement issues in settings page theme cards

### Translations
- Added theme name translations for all 4 new themes in both English and French
- English: Ocean Depths, Forest Mystic, Sunset Blaze, Shadow Assassin
- French: Abysses Océaniques, Forêt Mystique, Brasier du Couchant, Assassin des Ombres

### Files Modified
- `apps/web/contexts/ThemeContext.tsx` — Added 4 complete theme definitions, updated ThemeName type, exported ThemeContext
- `apps/web/components/LoadingSpinner.tsx` — Added 4 custom spinner animations with unique designs, added `compact` prop for preview mode
- `apps/web/pages/settings.tsx` — Shows real LoadingSpinner component for each theme (scaled preview with compact mode)
- `apps/web/translations/index.ts` — Added translation keys for new themes

---

## 2026-02-11 — Theme Compliance Audit & Fixes

### Theme System Improvements
- **Complete theme audit** across all pages - found 100+ hardcoded color violations
- **Fixed all admin pages** (index, badges, users, settings) - removed slate/purple hard-coding (~85 color replacements)
- **Fixed settings page** - removed conflicting hardcoded  backgrounds
- **Profile page fixes** - Replaced undefined `--bg-main` CSS variable with `--color-bg-primary` (3 occurrences)
- **NoAccess modal fix** - Removed hardcoded `bg-black` overlay
- Admin pages now properly respect all 5 themes (Classic Dark, Arcane Pastel, Nightshade, Infernal Ember, Radiant Light)

### Documentation & Agent System
- Created centralized `Documentation/` folder structure with 20 organized files
- Set up 5 custom Copilot agents (DocumentationManager, FrontendExpert, BackendExpert, ArchitectureExpert, Reviewer)
- Implemented **hybrid workflow**: custom agents serve as instruction templates for temporary subagents
- DocumentationManager delegates via `runSubagent`, including specialist instructions from `.github/agents/*.agent.md`
- Organized documentation from root-level .md files and .copilot/ into Documentation/ tree

## 2025-12-29 — P0 Quick Wins (from P0_QUICK_WINS_IMPLEMENTATION.md)
- CSRF protection fix
- Deep health check endpoint (`/health/deep`)
- Enhanced .dockerignore
- Feed query composite index
- JWT_SECRET validation on startup
- Pre-commit hook for .env files

## 2024-12-12 — Code Quality Improvements (from CHANGES_SUMMARY.md)
- Extracted auth routes to separate module
- Removed localStorage userId dependency
- Added DOMPurify sanitization
- Added 30+ user-friendly error messages
