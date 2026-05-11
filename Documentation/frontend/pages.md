# Frontend Pages

> Last updated: 2026-04-22  
> All pages in `apps/web/pages/`

## Page Inventory

| Page File | Route | Purpose |
|-----------|-------|---------|
| `_app.tsx` | — | App wrapper (QueryClient, Theme, Language, Auth, GlobalUI providers, Vercel Analytics), themed shell frame (`app-theme-shell`), runtime `theme-color` meta sync, Navbar, Footer, OnboardingWizard |
| `index.tsx` | `/` | Home/landing page |
| `feed.tsx` | `/feed` | LFD (Looking for Duo) feed with icon-backed filters, rank range slider, and post status banners |
| `create.tsx` | `/create` | Create new duo post |
| `lft.tsx` | `/lft` | Looking for Team feed |
| `coaching/index.tsx` | `/coaching` | Coaching marketplace (offer/seek coaching) |
| `matchups/index.tsx` | `/matchups` | Personal matchup library |
| `matchups/create.tsx` | `/matchups/create` | Create/edit matchup sheet |
| `matchups/marketplace.tsx` | `/matchups/marketplace` | Browse public matchup sheets |
| `matchups/[id].tsx` | `/matchups/:id` | Matchup detail view |
| `profile.tsx` | `/profile` | Own profile view |
| `profile/[username].tsx` | `/profile/:username` | Public profile view |
| `rate/[username].tsx` | `/rate/:username` | External shared rating flow with server-rendered share metadata |
| `login.tsx` | `/login` | Login page |
| `register.tsx` | `/register` | Registration page |
| `settings.tsx` | `/settings` | User settings (theme, language, profile, default-on Discord DM toggle) |
| `notifications.tsx` | `/notifications` | Notification center |
| `leaderboards.tsx` | `/leaderboards` | Leaderboards |
| `status.tsx` | `/status` | System status |
| `authenticate.tsx` | `/authenticate` | OAuth callback handler |
| `cookies.tsx` | `/cookies` | Cookie policy |
| `privacy.tsx` | `/privacy` | Privacy policy |
| `terms.tsx` | `/terms` | Terms of service |
| `communities/index.tsx` | `/communities` | Community discovery |
| `communities/register.tsx` | `/communities/register` | Register community |
| `communities/guide.tsx` | `/communities/guide` | Community guide |
| `communities/[id].tsx` | `/communities/:id` | Community detail |
| `admin/index.tsx` | `/admin` | Admin dashboard |
| `admin/users.tsx` | `/admin/users` | User management |
| `admin/reports.tsx` | `/admin/reports` | Report management |
| `admin/badges.tsx` | `/admin/badges` | Badge management |
| `admin/ads.tsx` | `/admin/ads` | Ad management |
| `admin/settings.tsx` | `/admin/settings` | Admin settings |
| `admin/broadcast.tsx` | `/admin/broadcast` | Discord DM embed broadcast builder with live preview |
| `share/post/[id].tsx` | `/share/post/:id` | Shareable duo post page with server-rendered OpenGraph metadata and matching copyable Discord image |
| `api/og/post/[id].tsx` | `/api/og/post/:id` | Dynamic OG image generation for duo posts (Edge API) |
| `api/og/app.tsx` | `/api/og/app` | Default app showcase OG image (Edge API) |
| `api/og/rating/[username].tsx` | `/api/og/rating/:username` | Dynamic OG image generation for external rating pages (Edge API) |
| `api/og/team/[id].tsx` | `/api/og/team/:id` | Dynamic OG image generation for team invite/share pages (Edge API) |

---

## Page Details

### Admin Users Page (`/admin/users`)

**Recent addition (2026-05-07):**
- The users table includes a **Discord** column showing whether a `DiscordAccount` is linked.
- Linked users show the Discord username when available and the Discord ID.
- Discord DM notification status remains separate because a user can be linked but have DMs disabled.

---

### Profile Page (`/profile`)

**Purpose**: Manage own profile identity, playstyle tags, and discoverability controls.

**Key Features**:
- **Playstyle Selection**: Up to 2 playstyles can be selected in edit mode.
- **Playstyle Explanations**: Each playstyle card shows a hover/focus tooltip bubble with explicit meaning text for `FUNDAMENTALS`, `Scaling`, `Snowball`, `CoinFlips`, and `Controlled Chaos`.
- **Anonymous Mode Helper**: A small info icon beside the anonymous toggle shows a hover/focus tooltip explaining that the setting controls public search/discoverability visibility.
- **Behavior Stability**: Existing profile save behavior remains unchanged (selection cap and anonymous toggle flow).

**Accessibility Notes**:
- Playstyle tooltips are exposed on hover and keyboard focus in both edit and read-only profile states.
- Anonymous info tooltip is exposed on hover and keyboard focus.

### Feed Page (`/feed`)

**Purpose**: Main Looking For Duo feed with server-side and client-side filtering.

**Key Features**:
- **Personalized Defaults**: Automatically pre-filters by user's region (from main Riot account) and languages (from profile)
- **Server-side Filters**: Regions, Roles, Languages, Voice Chat preference, Duo Type (applied via API query params)
- **Client-side Filters**: Rank range, divisions, LP threshold (Master+), winrate range, smurf status (applied after fetch)
- **Filter UX**: Region, role, language, voice chat, duo type, verification, rank, winrate, and smurf filters use icon/text affordances where practical; region/language/role filters render as wrapping checkbox chips so controls are not clipped.
- **Checkbox Rendering**: Filter chip checkboxes use app-drawn boxes and centered check marks instead of browser-native styling, keeping them visible across Classic Dark and other themes.
- **More Filters Drawer**: Voice chat preference, looking-for duration, and smurf status live behind a "More Filters" button so the default filter surface prioritizes account, rank, and winrate discovery.
- **Rank Range Slider**: Rank filtering uses a two-thumb slider from Iron to Master+ with icon-only tick marks; Master+ uses the Master emblem and full-span ranges are stored as empty filters so default queries stay clean.
- **Winrate Range Slider**: Winrate filtering uses a two-thumb 0-100 slider styled with the same red/orange/grey/blue/green/gold/purple winrate scale used by feed badges.
- **Active Filters Display**: Removable icon-backed pills showing current filters above the feed, including advanced filters.
- **Reload Scroll Reset**: The feed opts into manual scroll restoration and starts at the top on mount to avoid reloads restoring the user to the bottom of long duo feeds.
- **Pagination**: Load more button with "has more" indicator
- **Blocking**: Automatically filters out posts from blocked users (bidirectional)
- **Ad Integration**: Shows ads at regular intervals between posts (dismissible)
- **Real-time Updates**: Refreshing indicator when filters change
- **Share Button**: "Share Post" button visible only to post authors, copies shareable link to clipboard (links to `/share/post/:id`)
- **Verification Banner**: Post status banners keep the cursor glow at its last pointer position while hover fades, preventing the glow from jumping back to center on mouse leave.

**Filter Options**:
- **Regions**: NA, EUW, EUNE, KR, JP, OCE, LAN, LAS, BR, RU (multi-select checkboxes)
- **Roles**: TOP, JUNGLE, MID, ADC, SUPPORT, FILL (multi-select checkboxes)
- **Languages**: English, French, Spanish, German, Portuguese, Italian, Polish, Turkish, Russian, Korean, Japanese, Chinese (multi-select checkboxes)
- **Voice Chat**: ALWAYS, SOMETIMES, NEVER (single-select segmented buttons)
- **Looking For**: Short Term, Long Term, Both (single-select segmented buttons)
- **Rank Range**: Two-thumb Iron -> Master+ slider with division and LP filters
- **Winrate Range**: Two-thumb percentage slider (0-100%)
- **Smurf Filter**: Only Smurfs, No Smurfs, All (single-select)

**Post Card Actions**:
- **Non-authors**: "View Profile" and "Message" buttons
- **Authors**: "View Profile", "Message" (for viewing own post), and **"Share Post"** button
- **Share Post**: Generates shareable URL, copies to clipboard, shows success toast with hint to paste in Discord

**User Flow**:
1. User logs in → Feed loads with user's region and languages pre-selected
2. Posts are fetched and displayed with pagination
3. User can modify filters → Feed automatically refreshes
4. User can contact post authors (sends notification) or start direct chat
5. **Post authors can share their posts via "Share Post" button → Link copied → Paste in Discord for rich embed**
6. Admins can delete posts inline

**State Management**:
- Uses React hooks for local state (filters, posts, pagination)
- No global state/context (self-contained page)
- Memoized filtering logic for performance

---

### Create Post Page (`/create`)

**Purpose**: Form for creating a new duo post in the feed.

**Key Features**:
- **Auth Required**: Redirects to login if not authenticated, shows NoAccess component
- **Profile Pre-population**: Auto-fills form with user's main Riot account, region, preferred roles, and languages
- **Role Highlights**: Visual indicators (⭐) showing user's most-played and 2nd-most-played roles
- **TanStack Query Integration**: Uses useMutation for form submission with loading/error/success states
- **Validation**: Requires at least one linked Riot account to submit

**Form Fields**:
- **User**: Display-only field showing current username
- **Riot Account**: Dropdown to select which Riot account to post with (auto-selects main account)
- **Role**: Dropdown with TOP, JUNGLE, MID, ADC, SUPPORT (pre-selects user's preferred role)
- **Secondary Role**: Optional dropdown for secondary role (pre-selects user's secondary role)
- **Message**: Optional textarea (max 500 chars) for post description
- **Languages**: Display-only field showing user's profile languages (defaults to "English")
- **Voice Chat Preference**: Dropdown with ALWAYS, SOMETIMES, NEVER (defaults to SOMETIMES)
- **Looking For**: Dropdown for duo type with three options:
  - **Short Term Duo**: Quick games, casual play
  - **Long Term Duo**: Regular partner for climbing
  - **Both**: Open to either arrangement (default)

**User Flow**:
1. User clicks "Create Post" button from `/feed`
2. Form loads with pre-populated data from user's profile
3. User selects/confirms Riot account, roles, and preferences
4. User chooses duration preference (Short Term, Long Term, or Both)
5. User submits → API creates post → Success message displays post ID
6. User can navigate back to feed to see their post

**Validation**:
- At least one Riot account must be linked
- All required fields validated via Zod schema on backend
- Message length limited to 500 characters

**State Management**:
- Local state for form fields
- TanStack Query mutation for API call
- No global state/context

---

### Coaching Page (`/coaching`)

**Purpose**: Marketplace for free coaching services connecting Emerald+ coaches with students.

**Key Features**:
- **Two filtered tabs**: "Coaching Offers" and "Seeking Coaching"
- **Region Filter**: Dropdown to filter posts by region (ALL, NA, EUW, etc.)
- **Two CTA buttons**:
  - "Offer Your Coaching" — Validates Emerald+ rank requirement
  - "Request Coaching" — Available to all users
- **Post Feed**: Displays coaching posts in card format
- **Blocked Users Filter**: Automatically filters bidirectional blocks via `userId` query param
- **Admin Badge Detection**: Shows delete button to post owners and admins

**Coaching Offer Cards Display**:
- Coach username with rank badge (Emerald→Challenger)
- Role icons for roles being coached
- Specializations as color-coded pills:
  - Wave Management
  - Vision Control
  - Macro
  - Teamfighting
  - Lane Control
  - Champion Mastery
- Language badges (flag-style design)
- Availability badge (e.g., "Twice a Week")
- Details text (max 500 chars)
- Discord contact (username or manual tag)
- Action buttons: View Profile, Message, Delete (owner/admin)

**Coaching Request Cards Display**:
- Student username
- Roles requested (icons)
- Language badges
- Availability badge
- Details text
- Discord contact
- Action buttons: View Profile, Message, Delete (owner/admin)

**Create Offer Modal** (`CreateCoachingOfferModal.tsx`):
- **Emerald+ Validation**: Checks user's main Riot account rank before opening
- **Auto-populates**: Region, coach rank, roles, languages, Discord tag from profile
- **Form Fields**:
  - Region dropdown
  - Coach Rank (EMERALD/DIAMOND/MASTER/GRANDMASTER/CHALLENGER)
  - Division (I/II/III/IV — conditional on Emerald/Diamond)
  - Availability slider (theme-aware emoji indicators)
  - Roles (multi-select button grid with icons)
  - Specializations (multi-select: 6 preset options)
  - Languages (multi-select button grid)
  - Details textarea (500 char max with live counter)
  - Discord Tag input (50 char max with live counter)
- **Validation**: Required fields (region, rank, roles, languages), character limits
- **API**: `POST /api/coaching/posts` with auth header
- **Success**: Closes modal, refreshes feed, shows success toast
- **Error**: Shows friendly error toast

**Create Request Modal** (`CreateCoachingRequestModal.tsx`):
- **No Rank Requirement**: Available to all authenticated users
- **Auto-populates**: Region, roles, languages, Discord tag
- **Form Fields** (simpler than offer):
  - Region dropdown
  - Availability slider
  - Roles (multi-select)
  - Languages (multi-select)
  - Details textarea (500 char max)
  - Discord Tag input (50 char max)
- **Same validation and API patterns** as offer modal

**API Calls**:
- `GET /api/coaching/posts?region=[]&type=OFFERING|SEEKING&userId={id}` — Fetch posts with filters
- `POST /api/coaching/posts` — Create post (auth required)
- `DELETE /api/coaching/posts/:id` — Delete post (owner or admin)

**User Flow** (Offering Coaching):
1. Emerald+ user clicks "Offer Your Coaching"
2. Modal opens with pre-filled profile data
3. User selects specializations, edits details
4. Submits → Post appears in "Coaching Offers" feed
5. Other users can view profile, message via chat, or contact via Discord

**User Flow** (Seeking Coaching):
1. Any authenticated user clicks "Request Coaching"
2. Modal opens with pre-filled profile data
3. User describes what they want to learn
4. Submits → Post appears in "Seeking Coaching" feed
5. Coaches can reach out via message or Discord

**State Management**:
- Local state for filter selections (tab, region)
- Local state for post list, loading, error states
- Uses ChatContext for messaging functionality
- Uses AuthContext for user data and authentication status
- Uses LanguageContext for translations
- Uses GlobalUIContext for toast notifications

**Theme Integration**:
- All colors via CSS variables (`--color-bg-primary`, `--color-text-primary`, etc.)
- No hardcoded colors — fully theme-aware
- Left border color coding: Green for OFFERING, Blue for SEEKING
- Hover states with `var(--color-bg-tertiary)`

**Translations**:
- 38 translation keys in `coaching.*` namespace
- Full English and French support
- All user-facing text through `t()` function

**Security & Privacy**:
- Auth required for post creation/deletion
- NoAccess component for unauthenticated users attempting actions
- Bidirectional blocking respected (can't see posts from blocked users)
- Owner or admin authorization for deletion
- Input validation and sanitization

---

### Matchups System Pages (`/matchups`)

The matchups system allows users to create, manage, and share detailed champion-vs-champion matchup guides.

#### Personal Library (`/matchups`)

**Purpose**: User's private matchup sheet collection.

**Key Features**:
- Grid/List view of all user's matchup sheets
- "Create New Matchup" button → `/matchups/create`
- Search box to filter by champion name (searches both myChampion and enemyChampion)
- Dropdown filters:
  - **Role**: ALL, TOP, JUNGLE, MID, ADC, SUPPORT
  - **Difficulty**: ALL + 7 difficulty levels (FREE_WIN → FREE_LOSE)
- Each matchup card displays:
  - Champion icons (myChampion VS enemyChampion) from Riot Data Dragon
  - Role badge with icon
  - Difficulty badge (color-coded: green for easy, yellow for skill, red for hard)
  - Preview of laning notes (truncated to ~100 chars)
  - Edit button → `/matchups/create?id={matchupId}`
  - Delete button (with confirmation dialog)
  - Public/Private indicator badge
  - Stats (likes, downloads) if public
- Pagination with "Load More" button
- Empty state: "No matchups yet. Create your first matchup guide!"

**API Calls**:
- `GET /api/matchups` with filters (myChampion, role, limit, offset)
- `DELETE /api/matchups/:id` for deletion

**User Flow**:
1. User views their saved matchup sheets
2. Can filter by champion or role to find specific matchups
3. Click Edit to modify or Delete to remove
4. Click "Create New" to add more matchups

**State Management**: Local state with React hooks, no global state

---

#### Create/Edit Form (`/matchups/create`)

**Purpose**: Workspace-style form for creating new or editing existing matchup sheets.

**Key Features**:
- **Edit Mode Detection**: Query param `?id=xxx` triggers edit mode
- **Auth Required**: Shows NoAccess component if not authenticated
- **Form Fields**:
  1. Role selector (radio buttons with League icons)
  2. My Champion (ChampionAutocomplete component)
  3. Enemy Champion (ChampionAutocomplete component)
  4. Difficulty Slider (7 levels, default: SKILL_MATCHUP)
  5. Laning Phase Notes (`MatchupSmartTextarea`, max 2000 chars with live counter and Data Dragon autocomplete)
  6. Team Fight Notes (`MatchupSmartTextarea`, max 2000 chars with live counter and Data Dragon autocomplete)
  7. Items & Builds Notes (`MatchupSmartTextarea`, max 2000 chars with live counter and Data Dragon autocomplete)
  8. Power Spikes Notes (`MatchupSmartTextarea`, max 2000 chars with live counter and Data Dragon autocomplete)
  9. **Public Sharing Toggle** (checkbox: "Make this matchup public")
  10. **If Public** (conditional):
      - Title (max 100 chars, **required** if public)
      - Description (max 500 chars)
- **Editor Layout**:
  - Two-column desktop layout with setup/notes on the left and sticky preview/sharing controls on the right
  - Shared Matchups workspace tabs are visible at the top
  - Champion preview updates as selected champions change
- **Autocomplete Behavior**:
  - Typing Q/W/E/R suggests the selected champion's spells with icons and inserts `Q - Spell Name`
  - Typing item names suggests current Data Dragon items with icons and inserts `**Item Name**`
  - Typing rune names suggests current Data Dragon runes with icons and inserts `**Rune Name**`
  - Data is cached in localStorage for 24 hours and uses the latest Data Dragon version endpoint
- **Action Buttons**:
  - "Save" / "Update" (depending on create vs edit mode)
  - "Cancel" (returns to `/matchups`)
- **Validation**:
  - Requires: role, mychampion, enemyChampion
  - If isPublic is true, requires title
  - Character limits enforced with real-time counters
  - Shows error toast if validation fails

**API Calls**:
- Create: `POST /api/matchups`
- Update: `PUT /api/matchups/:id`
- Load for edit: `GET /api/matchups/:id`

**Champion Data**:
- Uses `championData.ts` utility to fetch champions from Riot Data Dragon API
- Champions cached in localStorage for 24 hours
- ChampionAutocomplete component provides searchable dropdown with icons
- Uses `matchupKnowledgeData.ts` to fetch latest Data Dragon items, runes, and selected champion spells for smart notes

**User Flow**:
1. User clicks "Create New Matchup" from library page
2. Selects role, both champions, difficulty level
3. Writes detailed notes in all 4 sections with spell/item/rune autocomplete
4. Optionally enables public sharing with title/description
5. Saves → Redirected to library page with success toast

**State Management**: Local state for form fields, loading states

---

#### Public Discover (`/matchups/marketplace`)

**Purpose**: Discover and save free community-shared matchup sheets. The route remains `/matchups/marketplace` for compatibility, but user-facing copy should say Discover/Discover Guides rather than Marketplace.

**Key Features**:
- **No Auth Required** to browse (auth needed for actions)
- Shared workspace tabs link between My Library, Collections, and Discover
- Search bar: "Search by champion..." (searches myChampion and enemyChampion)
- Filters:
  - Role dropdown (ALL + 5 roles)
  - Difficulty dropdown (ALL + 7 difficulty levels)
  - **Sort By**:
    - Newest (default)
    - Most Liked
    - Most Saved
- Grid of public matchup cards showing:
  - **Author username** (with link to profile)
  - Champion matchup (icons with VS)
  - Role and difficulty badges
  - Title and description
  - **Vote Buttons** (Like 👍 / Dislike 👎):
    - Requires auth
    - Toggle mechanism: Click again to remove vote
    - Click opposite to change vote (like→dislike or vice versa)
    - Disabled on own matchups
    - Shows net likes count (e.g., "+15" for 20 likes, 5 dislikes)
  - **Save Button**:
    - Saves the public guide to the user's library by reference
    - Disabled if already saved
    - Increments original's download/save analytics count only the first time that user saves it
  - **View Details**: Click on card → `/matchups/:id`
- Pagination with Load More button
- Empty state: "No public matchups found. Be the first to share!"

**API Calls**:
- Browse: `GET /api/matchups/public` (with filters: myChampion, enemyChampion, role, difficulty, sortBy, limit, offset)
- Vote: `POST /api/matchups/:id/vote` body: `{isLike: boolean}`
- Save: `POST /api/matchups/:id/download` (legacy endpoint name, saves by reference)

**User Flow**:
1. User browses public matchup marketplace
2. Filters by champion, role, or difficulty
3. Sorts by popularity or recency
4. Votes on helpful guides (like/dislike)
5. Saves guides they want to keep in their library
6. Clicks on card to see full details

**State Management**: Local state for matchups, filters, pagination, loading states

---

#### Matchup Collections (`/matchups?tab=collections`)

**Purpose**: Group matchup cards for one champion into shareable champion-level collections.

**Key Features**:
- Rendered as a tab inside the Matchups workspace
- Auth required
- Users can create a collection with:
  - Champion
  - Optional role
  - Title
  - Description
  - Public/private sharing toggle
- Collections list shows title, champion, optional role, visibility, author, and guide count
- Library matchup cards expose "Add to Collection"
- Add-to-collection only offers owned collections where `collection.champion === matchup.myChampion`

**API Calls**:
- List: `GET /api/matchup-collections`
- Create: `POST /api/matchup-collections`
- Add card: `POST /api/matchup-collections/:id/items`

**User Flow**:
1. User opens Matchups -> Collections
2. Creates a collection for one champion, e.g. Aatrox
3. Returns to My Library
4. Adds owned or saved/public Aatrox matchup cards to that collection
5. Optionally marks the collection public for sharing

---

#### Detail View (`/matchups/:id`)

**Purpose**: Full view of a single matchup sheet with all details.

**Key Features**:
- **Access Control**:
  - Private matchups: Only owner can view
  - Public matchups: Anyone can view
  - Auth required for private matchups
- **Header Section**:
  - Large champion icons (myChampion VS enemyChampion)
  - Large role badge
  - Color-coded difficulty badge
  - **Author info** (if public): username with profile link
  - **Stats**: Like count (green), Dislike count (red), Net likes (+/-), save count
- **Context-Aware Action Buttons**:
  - **Own Matchups**:
    - Edit button → `/matchups/create?id={id}`
    - Delete button (with confirmation) → deletes and redirects to `/matchups`
    - Toggle Public button → switches visibility, updates immediately
  - **Other's Public Matchups**:
    - Like button (👍)
    - Dislike button (👎)
    - Save button -> saves to personal library by reference
- **Notes Sections** (tabs or collapsible):
  - Laning Phase (full text or "No notes provided")
  - Team Fights (full text or "No notes provided")
  - Items & Builds (full text or "No notes provided")
  - Power Spikes (full text or "No notes provided")
- **Back Button**:
  - Returns to `/matchups` if own matchup
  - Returns to `/matchups/marketplace` if public matchup

**API Calls**:
- Fetch: `GET /api/matchups/:id`
- Vote: `POST /api/matchups/:id/vote`
- Save: `POST /api/matchups/:id/download` (legacy endpoint name, saves by reference)
- Delete: `DELETE /api/matchups/:id`
- Toggle public: `PUT /api/matchups/:id` with isPublic flipped

**User Flow**:
1. User navigates from library or marketplace
2. Views full matchup details with all notes
3. Takes action based on ownership (edit/delete vs like/download)
4. Returns to previous page

**State Management**: Local state for matchup data, loading states, user actions

---

### Matchups Components

**Reusable components created for the matchups system:**

1. **`DifficultySlider`** (`apps/web/components/DifficultySlider.tsx`)
   - Interactive 7-level slider with color gradient
   - Visual feedback (green → yellow → red)
   - Props: `value`, `onChange`, `label`

2. **`ChampionAutocomplete`** (`apps/web/components/ChampionAutocomplete.tsx`)
   - Searchable champion dropdown with fuzzy filtering
   - Champion icons from Riot Data Dragon
   - Click-outside-to-close functionality
   - Props: `value`, `onChange`, `label`, `placeholder`

3. **`MatchupCard`** (`apps/web/components/MatchupCard.tsx`)
   - Displays matchup summary with champion icons
   - Role and difficulty badges
   - Stats display (likes, downloads)
   - Edit/Delete action buttons (conditional)
   - Props: `matchup`, `onEdit`, `onDelete`, `showAuthor`, `editable`

**Champion Data Utility** (`apps/web/utils/championData.ts`):
- Fetches all champions from Riot Data Dragon API (v14.23.1)
- 24-hour localStorage cache
- Name normalization for special cases (Wukong→MonkeyKing, Kai'Sa→Kaisa, etc.)
- Helper functions: `fetchChampions()`, `getCachedChampions()`, `normalizeChampionName()`, `getChampionIconUrl()`

---

### Share Post Page (`/share/post/:id`)

**Purpose**: Shareable duo post page with rich OpenGraph metadata for Discord/social media embeds.

**Key Features**:
- **Server-Side Rendering**: Uses `getServerSideProps` to fetch post data from API and emit per-post `ssrTitle`, `ssrDescription`, `ssrOgImage`, and `ssrUrl`
- **Public Access**: No authentication required (shareable links)
- **Rich OpenGraph Tags**: Custom meta tags for Discord/Twitter/Facebook:
  - Dynamic title: "{username} - Looking For Duo on {region}"
  - Description with account info and rank
  - Custom OG image via `/api/og/post/{id}`
  - Proper dimensions (1200x630)
  - Discord theme color (#C8AA6D)
- **Visual Post Display**:
  - Renders the same `/api/og/post/:id` image that Discord receives, so the on-page preview and embed cannot drift
  - Snapshot panel with Riot ID, role, region, and rank
- **Share Actions**:
  - Native share when supported
  - Copy link fallback
  - Copy image to clipboard for Discord channels that benefit from an attached image
- **Error Handling**: User-friendly 404 page if post not found

**API Calls**:
- Fetch: `GET /api/posts/:id` (server-side)

**User Flow**:
1. User clicks "Share Post" button on their duo post in `/feed`
2. Share page opens with the final Discord card already rendered
3. User can copy/share the link or copy the image directly
4. User pastes link in Discord → Rich embed appears with the same custom image
5. Others click link → Redirected to share page with post summary and feed CTA

**State Management**: Server-side initial data with small client state for copy/share feedback

---

### OG Image API (`/api/og/post/:id`)

**Purpose**: Dynamic OpenGraph image generation for duo post sharing.

**Key Features**:
- **Edge Runtime**: Uses Next.js `ImageResponse` API for fast image generation
- **Dynamic Content**: Fetches post data from backend and renders custom image
- **Image Dimensions**: 1200x630 pixels (OpenGraph standard)
- **Branded Design**:
  - RiftEssence gradient background
  - Logo and "Looking For Duo" header
  - Username and region display
  - Role badges (primary + secondary)
  - Riot account cards with rank/winrate
  - Smurf detection (labels posting account as "Posting With (Smurf)")
  - Main account display (if different)
  - Post message (truncated to 120 chars)
  - VC preference with icon
  - RiftEssence branding footer
- **Color Coding**:
  - Rank badges: Tier-specific colors (Iron→Challenger)
  - Winrate: Green (≥50%) / Red (<50%)
  - Accent: RiftEssence gold (#C8AA6D)

**Rank Colors**:
- Iron: #4A4A4A, Bronze: #CD7F32, Silver: #C0C0C0, Gold: #FFD700
- Platinum: #00CED1, Emerald: #50C878, Diamond: #B9F2FF
- Master: #9D4EDD, Grandmaster: #FF6B6B, Challenger: #F4D03F

**API Calls**:
- Fetch: `GET /api/posts/:id` (internal API call)

**Error Handling**:
- 400: Missing post ID
- 404: Post not found
- 500: Image generation failed

**Usage**: Automatically invoked by OpenGraph crawlers when share links are posted in Discord/social media

**Performance**: Edge runtime ensures fast generation, images can be cached/CDN'd in production

---
