# Frontend Components

> Last updated: 2026-02-15

## Top-Level Components (`apps/web/components/`)

| Component | Purpose |
|-----------|---------|
| `Navbar` | Main navigation bar |
| `Footer` | Site footer |
| `GlobalUI` | Global modals/toasts container |
| `LoadingSpinner` | Loading indicator with custom animations per theme |
| `OnboardingWizard` | New user onboarding flow |
| `ConfirmModal` | Confirmation dialog |
| `FeedbackModal` | Feedback/rating modal |
| `ReportModal` | Report user modal |
| `Toast` | Toast notification |
| `BugReportButton` | Bug report floating button |
| `ChatWidget` | Floating chat interface (League of Legends style) |
| `AdSpot` | Ad placement component |
| `NoAccess` | Access denied page |
| `ProfileSkeleton` | Profile loading skeleton |
| `CreatePlayerLftModal` | Create LFT player post modal |
| `CreateTeamLftModal` | Create LFT team post modal |

### LoadingSpinner — Theme-Specific Animations

The `LoadingSpinner` component (`apps/web/components/LoadingSpinner.tsx`) renders unique custom animations for each theme:

| Theme | Animation Description |
|-------|----------------------|
| **Classic Dark** | Gold spinning circle with pulse effect |
| **Arcane Pastel** | Magic spinning ring with center sparkle fade |
| **Nightshade** | Pulsing moon with twinkling stars |
| **Infernal Ember** | Flickering animated flames with ember glow |
| **Radiant Light** | Simple spinning circle |
| **Ocean Depths** | Swirling water vortex with rising bubbles |
| **Forest Mystic** | 6 large rotating leaves around a glowing center core |
| **Sunset Blaze** | Pulsing sun core with 8 rotating gradient rays extending outward |
| **Shadow Assassin** | 6 swirling purple smoke trails spiraling around a glowing center |

Each animation uses theme-specific colors and CSS keyframes for smooth, engaging loading feedback. The settings page displays scaled previews of each spinner to help users choose their preferred theme. All animations are optimized for visibility with proper sizing, spacing, and opacity levels.

### ChatWidget — League of Legends-Style Chat Interface

The `ChatWidget` component (`apps/web/components/ChatWidget.tsx`) provides a floating chat interface inspired by the League of Legends client:

**Features:**
- **Floating button** — Fixed bottom-right corner with message icon SVG, pulses and glows when unread messages exist
- **Unread badge** — Red badge showing unread count (max display: 9+)
- **User avatars** — Profile icons from Data Dragon or gradient circles with initials throughout the interface
- **Rank badges** — Colored rank badges with icons (Iron, Bronze, Silver, Gold, etc.) using Community Dragon assets
- **Conversation list view** — Shows conversations with avatars, usernames, rank/region badges, relative timestamps ("2m ago"), and unread indicators
- **Message thread view** — Messages display sender avatars, names, and timestamps with smooth auto-scroll
- **Message input** — Textarea with 2000 character limit and visual counter
- **Back navigation** — Switch between conversation list and message thread
- **Real-time updates** — Messages appear automatically without page refresh:
  - **Message polling**: Checks for new messages every 2 seconds when conversation is open
  - **Conversation polling**: Updates conversation list every 5 seconds when widget is open
  - **Unread count polling**: Updates global unread count every 10 seconds via `/api/chat/unread-count`
  - Optimized: Only updates UI when changes detected (prevents unnecessary re-renders)
- **Themed styling** — Uses CSS variables for consistent theming across all 5 themes
- **Visual polish** — Hover effects, shadows, glows, pulse animations, and hierarchical layout

**Helper Components (internal):**
- `UserAvatar` — Displays user profile icon or gradient circle with initial (sm/md/lg sizes)
- `RankBadge` — Shows rank with color-coded badge and Community Dragon icon
- `getRankIcon` — Fetches rank icons from Community Dragon CDN
- `getRelativeTime` — Converts timestamps to relative format ("2m ago", "1h ago", "3d ago")

**State Management:**
- `isOpen` — Widget open/closed
- `conversations` — Array of user's conversations with full user data (avatar, rank, region)
- `selectedConversation` — Currently opened conversation object
- `messages` — Messages in selected conversation with sender data
- `messageInput` — Current message being composed
- `unreadCount` — Total unread count across all conversations
- `loading` — Loading state for message fetching

**API Integration:**
- `GET /api/chat/conversations` — Fetch conversations when widget opens (+ poll every 5s when open)
- `GET /api/chat/conversations/:id/messages` — Load messages when conversation selected (+ poll every 2s when open)
- `POST /api/chat/messages` — Send new message
- `GET /api/chat/unread-count` — Poll every 10 seconds for global unread count updates
- `POST /api/chat/conversations/with/:userId` — Create/get conversation with specific user

**Rendering:**
- Mounted in `_app.tsx` alongside `BugReportButton`
- Only visible when user is authenticated
- Z-index positioned above content but below modals

## Profile Sub-Components (`apps/web/components/profile/`)

| Component | Purpose |
|-----------|---------|
| `ChampionPool` | Champion pool display with tier-based organization (S/A/B/C tiers). Displays champion icons from Data Dragon alongside names, with hover effects and edit mode support. |
| `FeedbackList` | Ratings/feedback display |
| `RiotAccountCard` | Riot account card with rank + stats |

## Additional Components (`apps/web/src/components/`)

| Component | Purpose |
|-----------|---------|
| `IconPicker` | Icon selection component |

## Shared UI Package (`packages/ui/src/`)

| Component | Status |
|-----------|--------|
| `Button` | Defined but currently unused by web |
| `Card` | Defined but currently unused by web |
| `Tag` | Defined but currently unused by web |
