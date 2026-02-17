# Frontend Pages

> Last updated: 2026-02-16  
> All pages in `apps/web/pages/`

## Page Inventory

| Page File | Route | Purpose |
|-----------|-------|---------|
| `_app.tsx` | — | App wrapper (QueryClient, Theme, Language, Auth, GlobalUI providers), Navbar, Footer, OnboardingWizard |
| `index.tsx` | `/` | Home/landing page |
| `feed.tsx` | `/feed` | LFD (Looking for Duo) feed with filters (regions, roles, languages, VC, rank, etc.) |
| `create.tsx` | `/create` | Create new duo post |
| `lft.tsx` | `/lft` | Looking for Team feed |
| `coaching/index.tsx` | `/coaching` | Coaching marketplace (offer/seek coaching) |
| `matchups/index.tsx` | `/matchups` | Personal matchup library |
| `matchups/create.tsx` | `/matchups/create` | Create/edit matchup sheet |
| `matchups/marketplace.tsx` | `/matchups/marketplace` | Browse public matchup sheets |
| `matchups/[id].tsx` | `/matchups/:id` | Matchup detail view |
| `profile.tsx` | `/profile` | Own profile view |
| `profile/[username].tsx` | `/profile/:username` | Public profile view |
| `login.tsx` | `/login` | Login page |
| `register.tsx` | `/register` | Registration page |
| `settings.tsx` | `/settings` | User settings (theme, language, profile) |
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

---

## Page Details

### Feed Page (`/feed`)

**Purpose**: Main Looking For Duo feed with server-side and client-side filtering.

**Key Features**:
- **Personalized Defaults**: Automatically pre-filters by user's region (from main Riot account) and languages (from profile)
- **Server-side Filters**: Regions, Roles, Languages, Voice Chat preference, Duo Type (applied via API query params)
- **Client-side Filters**: Rank range, divisions, LP threshold (Master+), winrate range, smurf status (applied after fetch)
- **Active Filters Display**: Removable pills showing current filters above the feed
- **Pagination**: Load more button with "has more" indicator
- **Blocking**: Automatically filters out posts from blocked users (bidirectional)
- **Ad Integration**: Shows ads at regular intervals between posts (dismissible)
- **Real-time Updates**: Refreshing indicator when filters change

**Filter Options**:
- **Regions**: NA, EUW, EUNE, KR, JP, OCE, LAN, LAS, BR, RU (multi-select checkboxes)
- **Roles**: TOP, JUNGLE, MID, ADC, SUPPORT, FILL (multi-select checkboxes)
- **Languages**: English, French, Spanish, German, Portuguese, Italian, Polish, Turkish, Russian, Korean, Japanese, Chinese (multi-select checkboxes)
- **Voice Chat**: ALWAYS, SOMETIMES, NEVER (single-select dropdown)
- **Looking For**: Short Term, Long Term, Both (single-select dropdown)
- **Rank Range**: Min/Max rank with division and LP filters (dropdowns)
- **Winrate Range**: Min/Max percentage sliders (0-100%)
- **Smurf Filter**: Only Smurfs, No Smurfs, All (single-select)

**User Flow**:
1. User logs in → Feed loads with user's region and languages pre-selected
2. Posts are fetched and displayed with pagination
3. User can modify filters → Feed automatically refreshes
4. User can contact post authors (sends notification) or start direct chat
5. Admins can delete posts inline

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

**Purpose**: Form for creating new or editing existing matchup sheets.

**Key Features**:
- **Edit Mode Detection**: Query param `?id=xxx` triggers edit mode
- **Auth Required**: Shows NoAccess component if not authenticated
- **Form Fields**:
  1. Role selector (radio buttons with League icons)
  2. My Champion (ChampionAutocomplete component)
  3. Enemy Champion (ChampionAutocomplete component)
  4. Difficulty Slider (7 levels, default: SKILL_MATCHUP)
  5. Laning Phase Notes (textarea, max 2000 chars with live counter)
  6. Team Fight Notes (textarea, max 2000 chars with live counter)
  7. Items & Builds Notes (textarea, max 2000 chars with live counter)
  8. Power Spikes Notes (textarea, max 2000 chars with live counter)
  9. **Public Sharing Toggle** (checkbox: "Make this matchup public")
  10. **If Public** (conditional):
      - Title (max 100 chars, **required** if public)
      - Description (max 500 chars)
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

**User Flow**:
1. User clicks "Create New Matchup" from library page
2. Selects role, both champions, difficulty level
3. Writes detailed notes in all 4 sections
4. Optionally enables public sharing with title/description
5. Saves → Redirected to library page with success toast

**State Management**: Local state for form fields, loading states

---

#### Public Marketplace (`/matchups/marketplace`)

**Purpose**: Browse and download community-shared matchup sheets.

**Key Features**:
- **No Auth Required** to browse (auth needed for actions)
- Search bar: "Search by champion..." (searches myChampion and enemyChampion)
- Filters:
  - Role dropdown (ALL + 5 roles)
  - Difficulty dropdown (ALL + 7 difficulty levels)
  - **Sort By**:
    - Newest (default)
    - Most Liked
    - Most Downloaded
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
  - **Download Button**:
    - Creates private copy in user's library
    - Disabled if already downloaded (duplicate check by role+myChampion+enemyChampion)
    - Increments original's download count
  - **View Details**: Click on card → `/matchups/:id`
- Pagination with Load More button
- Empty state: "No public matchups found. Be the first to share!"

**API Calls**:
- Browse: `GET /api/matchups/public` (with filters: myChampion, enemyChampion, role, difficulty, sortBy, limit, offset)
- Vote: `POST /api/matchups/:id/vote` body: `{isLike: boolean}`
- Download: `POST /api/matchups/:id/download`

**User Flow**:
1. User browses public matchup marketplace
2. Filters by champion, role, or difficulty
3. Sorts by popularity or recency
4. Votes on helpful guides (like/dislike)
5. Downloads guides they want to keep privately
6. Clicks on card to see full details

**State Management**: Local state for matchups, filters, pagination, loading states

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
  - **Stats**: Like count (green), Dislike count (red), Net likes (+/-), Download count
- **Context-Aware Action Buttons**:
  - **Own Matchups**:
    - Edit button → `/matchups/create?id={id}`
    - Delete button (with confirmation) → deletes and redirects to `/matchups`
    - Toggle Public button → switches visibility, updates immediately
  - **Other's Public Matchups**:
    - Like button (👍)
    - Dislike button (👎)
    - Download button → copies to personal library
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
- Download: `POST /api/matchups/:id/download`
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
