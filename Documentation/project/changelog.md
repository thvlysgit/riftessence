# Changelog

> Last updated: 2026-02-16

Chronological log of significant changes. Maintained by @DocumentationManager.

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
