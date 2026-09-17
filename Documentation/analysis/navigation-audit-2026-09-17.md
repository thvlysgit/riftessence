# RiftEssence navigation audit and concepts

Date: 2026-09-17. Design exploration only; no navigation code changed.

## Scope and counting

The source of truth for this audit is `apps/web/pages`, `apps/web/components/Navbar.tsx`, `Footer.tsx`, `MatchupWorkspaceTabs.tsx`, `economy/EconomyLayout.tsx`, the home page, and the team dashboard. There are **63 page route templates** after excluding `_app.tsx`, `_document.tsx`, and the four `/api/og/*` image endpoints. The count includes 12 admin routes, a sitemap endpoint, legacy redirects, and public bridge/share routes. A dynamic route template can produce many actual URLs.

The table describes where a route currently sits in the user journey. “Direct” means a top-level desktop header item; “menu” means the Teams dropdown or account menu; “local” means a link inside a related page; “footer” and “deep link” have their usual meanings. These labels describe code paths, not measured traffic.

## Complete route map

### People, discovery, and competition (7)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/` | Landing page with feature cards and seven guided onboarding flows | Logo/home |
| `/feed` | Browse and filter looking-for-duo posts | Direct “LFD”; home |
| `/create` | Create a duo post | Local action on `/feed` |
| `/lft` | Browse team, player, and staff opportunity listings; create personal listings | Teams dropdown “LFT”; home/team dashboard |
| `/coaching` | Browse free coaching offers and requests; create either through modals | Direct “Coaching” |
| `/leaderboards` | Six leaderboard views: overall, feedback skill, personality, in-game rank, in-game skill, PE | Account menu/mobile list; linked from 1v1 |
| `/1v1` | Planned ranked 1v1 arena; page code exists, but the product is not implemented for launch yet | No global navigation link found; keep out of public menus for now |

### Team workspace (6)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/teams/dashboard` | Create/select teams and launch team tools | Teams dropdown/home/LFT |
| `/teams/[id]` | Team roster, recruiting, invites, and management | Team dashboard/listings/deep link |
| `/teams/schedule` | Team calendar, availability, events, and practice planning | Teams dropdown/team dashboard |
| `/teams/scrims` | Scrim availability, opponent discovery, proposals, results, and reviews | Teams dropdown/home/team dashboard |
| `/teams/drafts` | Champion pools and draft planning room | Teams dropdown/team dashboard |
| `/teams/discord` | Team Discord forwarding and bot configuration | Team dashboard; absent from desktop Teams dropdown |

### Communities (5)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/communities` | Browse communities and launch registration/guide | Account menu/mobile list/home |
| `/communities/[id]` | Community profile, members, invite and linked activity | Community list/deep link |
| `/communities/join/[id]` | Join invitation flow | Invitation deep link |
| `/communities/register` | Register a community | Local action on community list/guide |
| `/communities/guide` | Community setup and Discord guide | Local action on community list |

### Matchup knowledge (4 templates, 5 user-facing views)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/matchups` | My guide library; `?tab=collections` is the collections view | Direct “Matchups”; local workspace tabs |
| `/matchups/marketplace` | Public guide discovery; UI calls this “Discover” | Local matchup tab; old URL name retained |
| `/matchups/create` | Create or edit guide (`?id=` for edit) | Local action from library/discover/detail |
| `/matchups/[id]` | View a guide, with owner actions or public save/vote | Library/discover/deep link |

### Games and collection (5)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/games` | Four daily games and practice entry | Footer, wallet, economy subnav |
| `/games/[gameKey]` | Champion Archive, Shopkeeper, Recipe Rush, or Soundcheck | Games index/wallet/deep link |
| `/purse` | PE wallet, challenges, XP, recent activity, next cosmetic | Header PE icon/account menu; economy subnav |
| `/cosmetics` | Permanent PE cosmetics and collection | Economy subnav/wallet |
| `/purse/gamble` | Legacy redirect to `/games` | Old links only; should not appear in new navigation |

### Identity, account, and social follow-up (7)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/profile` | Own profile or another player via `?username=`; Riot accounts, champion pool, feedback, community context | Direct “Profile”; account menu; player links |
| `/profile/[username]` | Public SSR/SEO profile bridge that client redirects to `/profile?username=` | Search/share/deep link |
| `/bio/[slug]` | Alias that renders the profile page | Deep link |
| `/rate/[username]` | Rate a player | Local action on player profile |
| `/notifications` | Account notifications, including contact and scrim events | Header bell/account menu/mobile list |
| `/settings` | Language, theme, account, password, Discord consent, Riot linking | Account menu |
| `/authenticate` | Riot account linking flow | Profile/settings/onboarding |

### Public search and sharing entrances (3)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/role/[role]` | Search landing page for a duo role; leads to filtered feed | Search engine/deep link |
| `/region/[region]` | Search landing page for a duo region; leads to filtered feed | Search engine/deep link |
| `/share/post/[id]` | Public/shareable duo post with rich preview | Shared link |

### Authentication and restricted state (5)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/login` | Sign in | Header and access prompts |
| `/register` | Sign up | Home/onboarding/access prompts |
| `/forgot-password` | Request password reset | Login |
| `/reset-password` | Complete password reset | Email/deep link |
| `/banned` | Restricted-account notice | Auth redirect |

### Information, business, and technical pages (9)

| Route | Purpose | Current entry |
| --- | --- | --- |
| `/developer-api` | Developer API information and access | Footer |
| `/advertise` | Advertising inquiry | Footer |
| `/adspace` | Legacy redirect to `/advertise` | Old links only |
| `/riot` | Riot API review/product explanation | Footer |
| `/status` | API status page | Direct URL |
| `/privacy` | Privacy policy | Footer |
| `/terms` | Terms | Footer |
| `/cookies` | Cookie policy | Footer |
| `/sitemap.xml` | Search-engine sitemap | Machine endpoint, not a menu destination |

### Admin workspace (12)

These are staff-only and should remain outside consumer navigation except for one Admin entry for staff.

| Route | Purpose |
| --- | --- |
| `/admin` | Admin dashboard/tool launcher |
| `/admin/ads` | Advertising campaigns and requests |
| `/admin/badges` | Badge library and assignments |
| `/admin/broadcast` | Discord DM broadcast |
| `/admin/developer-api` | API applications, requests, keys, usage |
| `/admin/diagnostics` | API diagnostics |
| `/admin/game-suggestions` | Game idea review |
| `/admin/input-control` | Input/content control rules |
| `/admin/prismatic` | PE economy and grants |
| `/admin/reports` | Reports/moderation |
| `/admin/settings` | Platform settings |
| `/admin/users` | User management |

## Current navigation assessment

- Desktop header: LFD, Teams dropdown (LFT, dashboard, schedule, scrims, drafts), Matchups, Coaching, Profile; user-only search; PE icon; notification bell; account dropdown. The Teams dropdown omits `/teams/discord`.
- Mobile hamburger: a long flat list of LFD, five team links, Matchups, Coaching, Profile, Communities, Leaderboards, Wallet, and Notifications. Account settings remain in the separate avatar menu.
- The header search is labeled “Search summoners…” and searches **users only**; it cannot find features, teams, communities, or guides.
- The economy pages have a local Wallet / Games / Collection nav. Matchups have Library / Collections / Discover tabs. Teams have a dashboard of tool cards, but no consistent local workspace navigation across every team page.
- The homepage presents six feature cards and seven onboarding guides. Its primary signed-in hero action still opens the Duo feed, even though several user paths matter equally. The guides help first exploration but do not solve repeat navigation from another page.
- Route names and labels sometimes diverge: “LFD,” “LFT,” “Purse,” “Matchups Marketplace” URL versus “Discover” UI, and “Prismatic Essence” local nav. Terminology is harder for a new visitor than task verbs.
- Core products have uneven exposure: games are in the footer/economy area, communities and leaderboards in the account menu, and 1v1 has no global entry. The footer functions as a discovery surface for Daily games, although footers are better for supporting information.
- `/profile` appears both as a direct primary tab and inside the account menu. Most users can reach their profile from the avatar, freeing primary space for product areas.
- The public `/profile/[username]` bridge redirects in the browser to `/profile?username=...`, while the shared route gate requires an account for all `/profile` visits. This appears to block logged-out visitors from reaching the full public profile. Verify that flow before relying on profile links in any navigation redesign.

## Concept A: stable product areas (recommended starting point)

Five clear global destinations, each opening a short menu or hub. The logo returns home. Search, notifications, and account remain utilities.

| Global area | Main hub/first action | Local destinations |
| --- | --- | --- |
| **Find people** | Duo feed `/feed` | Create duo post `/create`; team opportunities `/lft`; free coaching `/coaching` |
| **Teams** | My teams `/teams/dashboard` | Team page; scrim finder; schedule; draft room; Discord settings |
| **Guides** | Discover guides `/matchups/marketplace` | My library, collections, create guide, guide detail; crosslink to coaching |
| **Play** | Daily games `/games` | Four games and leaderboards; add 1v1 when it launches |
| **Communities** | Browse `/communities` | Community detail, join, register, guide |

Account drawer: My profile, Collection, PE wallet, Notifications, Settings, staff-only Admin. Keep Profile and Collection easy to reach from the avatar. The same five area labels should appear on desktop and mobile. On mobile, use a five-item bottom bar or a compact top area switcher; use a separate account avatar and notification indicator. A bottom bar must not cover game controls or form actions.

Each area should have a persistent local subnav and a contextual primary action. Examples: Guides has Discover / My Library / Collections and “Create guide”; Teams has Overview / Schedule / Scrims / Drafts / Discord after choosing a team. A visitor without a team sees “Create or join a team,” not a dead-end calendar.

**Strength:** clear, predictable, scalable enough for current products. **Cost:** requires new area hubs/local nav and consistent mobile treatment. **Risk:** coaching crosses “Find people” and “Guides”; give it one primary location plus a crosslink.

## Concept B: task launcher plus personalized home

Global header becomes **Explore**, **My work**, universal search, notifications, account. The homepage becomes an action launcher: “Find a duo,” “Join a team,” “Organize a scrim,” “Read a matchup guide,” “Play today’s game,” “Find a community.” Returning users can pin 3–5 favorite tools and see recent team, guide, game, and active onboarding steps. `/explore` is a complete directory of all user-facing capabilities, searchable by task synonyms. `My work` groups personal posts, teams, guides, collection, wallet, and settings.

**Strength:** handles future feature growth and different user preferences. **Cost:** larger product build, search index, pin/recent state, and a truly useful home. **Risk:** a generic “Explore” menu adds a click unless task search and suggested actions are excellent. Do not rely on personalization alone for first-time visitors.

## Concept C: persona workspaces

Global mode switch: **Player**, **Team**, **Creator**, **Community**. Each mode has its own sidebar with only relevant tools. Player includes duo, LFT, coaching, games, profile, and collection. Team includes dashboard, recruitment, scrims, schedule, drafts, Discord. Creator includes matchup discovery, library, collections, publishing, and possibly coaching offers. Community includes directory, community management, and leaderboards.

**Strength:** very focused for users who live mostly in one role. **Cost:** more navigation and state complexity. **Risk:** features like coaching and LFT belong to multiple modes; switching modes to find a familiar task can feel arbitrary. Better as an optional workspace layer for power users than the first navigation rewrite.

## Shared design rules for any concept

1. Use words that state the task: **Find a duo**, **Find a team**, **Discover guides**, **My teams**, **Daily games**. Retain LFD/LFT as secondary vocabulary for experienced users and search aliases.
2. Make global search truly global if it looks global: users, teams, communities, guides, pages, and action names, grouped by type. Support keyboard and mobile entry; do not replace browsable menus with search alone.
3. Put primary actions where they belong: “Create duo post” on the duo feed, “Create guide” in Guides, “Register community” in Communities. A global Create button with several unrelated meanings adds a decision step.
4. Preserve all current URLs and incoming links during a navigation redesign. Routes such as `/adspace`, `/purse/gamble`, `/profile/[username]`, and `/matchups/marketplace` already have redirect/share/SEO roles. Menu labels can change independently of those paths.
5. Keep authentication requirements and return URLs intact. If a guest follows a task, explain the requirement and return them to the intended place after sign-in.
6. Give every page a visible area title, active item, and local way back. Handle query-based views such as `/matchups?tab=collections` in active states.
7. Keep admin, legal, advertising, developer API, Riot review, and machine endpoints out of primary consumer navigation. Put business/legal/status pages in a structured footer or Help area.
8. Test navigation with five tasks on desktop and mobile: find a duo, publish an LFT listing, schedule a team event, discover/save a guide, play a daily game. Measure first-click success, time to destination, and backtracking before judging by visual preference.

## Recommendation

Start with Concept A. It gives every major product a stable, memorable home while allowing different users to begin in different areas. Add the universal task search and optional favorites from Concept B once the area structure is established. Treat Concept C as an optional future power-user mode if usage shows strong player/team/creator clusters.

The owner confirmed that 1v1 is not implemented yet but is expected soon. Reserve its place in the Play area; do not expose it as a working destination until it launches.
