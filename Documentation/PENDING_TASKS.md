# Pending Tasks - RiftEssence

> **Created**: 2026-03-02  
> **Purpose**: Temporary precise documentation for pending implementation tasks  
> **Status**: Some tasks completed, others require implementation  

---

## Task Status Overview

| # | Task | Status | Priority | Complexity |
|---|------|--------|----------|------------|
| 1 | Fix champion pool not being able to be saved | ✅ **DONE** | — | — |
| 2 | Make responsiveness better across the app | ⚠️ **PARTIAL** | MEDIUM | High |
| 3 | Rate limit the bug report button | ❌ **TODO** | MEDIUM | Low |
| 4 | Add shareable duo image (needs testing) | ✅ **DONE** | — | — |
| 5 | Make website titles consistent and coherent | ❌ **TODO** | MEDIUM | Low |
| 6 | Add an Icon to the browser tabs | ❌ **TODO** | LOW | Low |
| 7 | Implement Vercel analytics | ✅ **DONE** | — | — |
| 8 | Implement SEO changes | ⚠️ **PARTIAL** | HIGH | Medium |

---

## 1. Fix Champion Pool Not Being Able to Be Saved

### Current Status: ✅ **FIXED** (2026-03-02)

**Problem**: The champion pool feature has a known issue where users cannot save their champion pools. A tooltip in the UI explicitly states: *"Champion Pool feature is currently under development and not yet functional. We're working on a fix!"*

### Files Affected
- **Frontend**: [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx) (lines 356, 515, 658, 776, 855-926, 1666-1668)
- **Frontend Component**: [apps/web/components/profile/ChampionPool.tsx](apps/web/components/profile/ChampionPool.tsx)
- **Backend**: [apps/api/src/routes/user.ts](apps/api/src/routes/user.ts) (PATCH `/champion-pool` endpoint)
- **Database**: Prisma schema `User` model has `championPoolMode` and `championTierlist` fields

### Current Implementation Details

**Backend Endpoint** (apps/api/src/routes/user.ts):
```typescript
// PATCH /champion-pool endpoint exists
// Uses getUserIdFromRequest() for auth
// Accepts: { mode: 'TIERLIST', champions: { S: [], A: [], B: [], C: [] } }
// Updates User.championPoolMode and User.championTierlist
```

**Frontend State** (apps/web/pages/profile.tsx):
```typescript
const [championPoolMode, setChampionPoolMode] = useState<'TIERLIST'>('TIERLIST');
const [championTierlist, setChampionTierlist] = useState({ S: [], A: [], B: [], C: [] });
```

**Frontend UI**:
- ChampionPool component is rendered with `isEditMode`, `isValidChampion`, `onAddToTier`, `onRemoveFromTier` props
- Has input field + "Add" buttons for each tier (S, A, B, C)
- Has visual tier display with champion names
- **Issue tooltip** displayed at line 1668: `title="Champion Pool feature is currently under development..."`

### Investigation Required

1. **Check if backend endpoint works** - Test PATCH `/champion-pool` with valid JWT token
2. **Verify champion validation** - The `isValidChampion()` function needs to be working
3. **Check frontend save flow** - The `handleSaveProfile()` function (line 776) should trigger champion pool save
4. **Verify data persistence** - Check if data is actually being saved to database but not loading, or if save fails

### Implementation Steps

1. **Test backend endpoint**:
   ```bash
   curl -X PATCH http://localhost:3333/api/user/champion-pool \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"mode":"TIERLIST","champions":{"S":["Aatrox"],"A":[],"B":[],"C":[]}}'
   ```

2. **Add console logging** to profile.tsx `handleSaveProfile()` to track:
   - Champion pool data being sent
   - API response
   - Any errors

3. **Verify champion list** - Check if `championData.ts` utility is loading champion names correctly from Data Dragon

4. **Test save flow**:
   - Add champions to tiers
   - Click "Save Changes"
   - Check network tab for PATCH request
   - Verify response
   - Reload page to confirm persistence

5. **Fix identified issue(s)** and remove the "under development" tooltip

6. **Update documentation** once fixed

### Related Code Locations

- **Champion data utility**: [apps/web/utils/championData.ts](apps/web/utils/championData.ts) - Fetches champion list from Data Dragon
- **Save handler**: profile.tsx line 776 `handleSaveProfile()` function
- **Champion pool update**: profile.tsx lines 876-891
- **Database schema**: User model has `championPoolMode` (string) and `championTierlist` (JSON)

---

## 2. Make Responsiveness Better Across the App

### Current Status: ⚠️ **PARTIALLY IMPLEMENTED**

**Context**: The app has some responsive design patterns but needs comprehensive mobile/tablet optimization without breaking the desktop experience.

### Current Responsive Implementation

**Navbar** ([apps/web/components/Navbar.tsx](apps/web/components/Navbar.tsx)):
- ✅ Has responsive design (comment: "Full-featured responsive Navbar")
- ✅ Mobile menu implemented
- ✅ Desktop/mobile breakpoints exist

**Styling Framework**:
- ✅ Tailwind CSS with responsive utilities (`sm:`, `md:`, `lg:`, `xl:`)
- ✅ CSS variables for theming (works across devices)
- ⚠️ Many components use fixed widths/heights without responsive variants

### Pages Requiring Responsive Audit

Priority order based on user traffic and complexity:

1. **High Priority** (Most Used):
   - [x] [apps/web/pages/feed.tsx](apps/web/pages/feed.tsx) - Duo post feed with filters
   - [ ] [apps/web/pages/profile.tsx](apps/web/pages/profile.tsx) - User profiles with stats
   - [ ] [apps/web/pages/lft.tsx](apps/web/pages/lft.tsx) - Team posts
   - [ ] [apps/web/pages/index.tsx](apps/web/pages/index.tsx) - Landing page
   - [ ] [apps/web/pages/create.tsx](apps/web/pages/create.tsx) - Create duo post form

2. **Medium Priority** (Secondary Features):
   - [ ] [apps/web/pages/communities/index.tsx](apps/web/pages/communities/index.tsx)
   - [ ] [apps/web/pages/matchups/marketplace.tsx](apps/web/pages/matchups/marketplace.tsx)
   - [ ] [apps/web/pages/coaching/index.tsx](apps/web/pages/coaching/index.tsx)
   - [ ] [apps/web/pages/settings.tsx](apps/web/pages/settings.tsx)
   - [ ] [apps/web/pages/notifications.tsx](apps/web/pages/notifications.tsx)

3. **Low Priority** (Admin/Less Frequent):
   - [ ] Admin pages (already desktop-focused, okay to remain)
   - [ ] Policy pages (simple text, less critical)

### Common Responsive Issues to Address

**Grid Layouts**:
```tsx
// Current (desktop-only):
<div className="grid grid-cols-5 gap-4">

// Responsive pattern:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
```

**Fixed Widths**:
```tsx
// Current:
<div className="w-96">

// Responsive:
<div className="w-full md:w-96">
```

**Padding/Margins**:
```tsx
// Current:
<div className="px-8 py-6">

// Responsive:
<div className="px-4 sm:px-6 md:px-8 py-4 md:py-6">
```

**Font Sizes**:
```tsx
// Current:
<h1 className="text-4xl">

// Responsive:
<h1 className="text-2xl sm:text-3xl md:text-4xl">
```

**Filters/Sidebars**:
- Desktop: Side-by-side filters
- Mobile: Collapsible accordion or drawer

### Testing Strategy

1. **Breakpoint Testing**:
   - Mobile: 375px (iPhone SE)
   - Tablet: 768px (iPad)
   - Desktop: 1280px, 1920px

2. **Chrome DevTools**:
   - Use responsive design mode
   - Test touch interactions
   - Test landscape/portrait orientations

3. **Key UI Elements**:
   - Forms remain usable
   - Buttons stay accessible
   - Overflow is scrollable (not hidden)
   - Images scale properly
   - Text remains readable

### Implementation Approach

**Phase 1** - Critical Pages (Week 1):
1. Feed page - Make filter columns stack on mobile
2. Profile page - Stack sections vertically on mobile
3. Create post form - Full-width on mobile

**Phase 2** - Secondary Pages (Week 2):
4. LFT page - Similar to feed responsive patterns
5. Communities/Matchups/Coaching - Grid → Flex responsive layouts

**Phase 3** - Polish (Week 3):
6. Settings page - Stack settings sections
7. Chat widget - Optimize for mobile (smaller on mobile)
8. Modals - Full-screen on mobile, centered on desktop

### Implementation Pattern (Example)

```tsx
// Before:
<div className="flex gap-6 px-8">
  <div className="w-64">Filters</div>
  <div className="flex-1">Content</div>
</div>

// After:
<div className="flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 md:px-6 lg:px-8">
  <div className="w-full lg:w-64">
    {/* Filters - collapsible on mobile */}
  </div>
  <div className="flex-1 min-w-0">{/* Content */}</div>
</div>
```

### Design Constraints

❗ **CRITICAL**: Do NOT change desktop layouts. Responsive changes must only apply below breakpoints:
- Use `md:` prefix for tablet+ (768px)
- Use `lg:` prefix for desktop+ (1024px)
- Base classes apply to mobile only

---

## 3. Rate Limit the Bug Report Button

### Current Status: ❌ **NO RATE LIMITING**

**Problem**: The bug report button ([apps/web/components/BugReportButton.tsx](apps/web/components/BugReportButton.tsx)) has no rate limiting, allowing users to spam bug reports to the Discord webhook.

### Current Implementation

**File**: [apps/web/components/BugReportButton.tsx](apps/web/components/BugReportButton.tsx)

**Current Flow**:
1. User clicks floating bug button (bottom-right)
2. Modal opens with text area
3. User submits → POST to Discord webhook
4. No cooldown, no submission tracking
5. Users can submit unlimited reports

**Existing State**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [bugDescription, setBugDescription] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```

### Implementation Strategy

**Option 1: Client-Side Rate Limiting** (Simplest)
- Store last submission timestamp in localStorage
- Enforce 5-minute cooldown
- Show toast if user tries to submit too soon
- **Pros**: No backend changes, immediate implementation
- **Cons**: Can be bypassed by clearing localStorage

**Option 2: Backend Rate Limiting** (Recommended)
- Create new endpoint: `POST /api/bug-report`
- Store submission timestamps in database (BugReport model)
- Enforce 5-minute cooldown per user
- Discord webhook called from backend (keeps webhook URL secret)
- **Pros**: Secure, cannot bypass, webhook URL not exposed
- **Cons**: Requires database schema change

**Option 3: Hybrid Approach** (Best UX)
- Client-side check for instant feedback (localStorage)
- Backend validation for security (database)
- Both checks enforce 5-minute cooldown

### Recommended Implementation (Option 2)

#### Step 1: Database Schema

```prisma
// Add to prisma/schema.prisma
model BugReport {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  description String   @db.Text
  userAgent   String
  currentUrl  String
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}

// Add to User model:
bugReports BugReport[]
```

Run migration:
```bash
pnpm exec prisma migrate dev --name add_bug_report_rate_limit
```

#### Step 2: Backend Endpoint

```typescript
// apps/api/src/routes/bug-report.ts
import { FastifyInstance } from 'fastify';
import { getUserIdFromRequest } from '../utils/auth';

export default async function bugReportRoutes(fastify: FastifyInstance) {
  // POST /api/bug-report - Submit bug report with rate limiting
  fastify.post('/bug-report', async (request, reply) => {
    const userId = getUserIdFromRequest(request, fastify);
    const { description, userAgent, currentUrl } = request.body as {
      description: string;
      userAgent: string;
      currentUrl: string;
    };

    // Validation
    if (!description || description.length < 10 || description.length > 2000) {
      return reply.status(400).send({ error: 'Description must be 10-2000 characters' });
    }

    // Rate limit check: 5-minute cooldown
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentReport = await fastify.prisma.bugReport.findFirst({
      where: {
        userId,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentReport) {
      const waitSeconds = Math.ceil((recentReport.createdAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000);
      return reply.status(429).send({ 
        error: `Please wait ${Math.ceil(waitSeconds / 60)} more minute(s) before submitting another report` 
      });
    }

    // Create bug report record
    await fastify.prisma.bugReport.create({
      data: {
        userId,
        description,
        userAgent,
        currentUrl,
      },
    });

    // Fetch user details for Discord embed
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        discordAccount: true,
        riotAccounts: { where: { isMain: true } },
      },
    });

    // Send to Discord webhook (from environment variable)
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_BUG_WEBHOOK;
    if (DISCORD_WEBHOOK_URL) {
      const embed = {
        title: '🐛 Bug Report',
        description,
        color: 15158332,
        fields: [
          {
            name: '👤 User',
            value: user?.username || 'Unknown',
            inline: true,
          },
          {
            name: '📍 Page',
            value: currentUrl,
            inline: false,
          },
          {
            name: '🖥️ User Agent',
            value: userAgent.substring(0, 200),
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    return reply.send({ success: true });
  });
}
```

Register in `apps/api/src/index.ts`:
```typescript
import bugReportRoutes from './routes/bug-report';
// ...
app.register(bugReportRoutes, { prefix: '/api' });
```

#### Step 3: Frontend Changes

```typescript
// apps/web/components/BugReportButton.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!bugDescription.trim()) {
    showToast(t('bug.pleaseDescribe'), 'error');
    return;
  }

  setIsSubmitting(true);
  try {
    const userAgent = window.navigator.userAgent;
    const currentUrl = window.location.href;

    const response = await fetch(`${API_URL}/api/bug-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(), // JWT authentication
      },
      body: JSON.stringify({
        description: bugDescription,
        userAgent,
        currentUrl,
      }),
    });

    if (response.status === 429) {
      const data = await response.json();
      showToast(data.error, 'error');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to submit bug report');
    }

    showToast(t('bug.submitSuccess'), 'success');
    setBugDescription('');
    setIsOpen(false);
  } catch (error) {
    showToast(t('bug.submitError'), 'error');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Step 4: Translation Keys

Add to `apps/web/translations/index.ts`:
```typescript
bug: {
  rateLimitError: 'Please wait before submitting another bug report',
  // ... existing keys
}
```

### Testing Checklist

- [ ] Submit bug report successfully
- [ ] Try submitting again immediately → Should see rate limit error
- [ ] Wait 5 minutes → Should be able to submit again
- [ ] Check Discord webhook receives reports
- [ ] Verify database stores BugReport records
- [ ] Test with non-authenticated users (should require login)

---

## 4. Add Shareable Duo Image

### Current Status: ✅ **COMPLETED** (Needs Testing)

**Implementation Date**: 2026-02-24 (from changelog)

### Features Implemented

1. **Share Button on Duo Posts** ([apps/web/pages/feed.tsx](apps/web/pages/feed.tsx))
   - Shows on user's own posts only
   - Copy-to-clipboard functionality
   - Generates URL: `{origin}/share/post/{postId}`

2. **Share Page** ([apps/web/pages/share/post/[id].tsx](apps/web/pages/share/post/[id].tsx))
   - Server-Side Rendering with `getServerSideProps`
   - OpenGraph metadata for Discord/Twitter/Facebook
   - Links to dynamic OG image API
   - Full post details display
   - CTAs to browse more posts or register

3. **OG Image API** ([apps/web/pages/api/og/post/[id].tsx](apps/web/pages/api/og/post/[id].tsx))
   - Edge Runtime with Next.js `ImageResponse`
   - 1200x630px OpenGraph standard
   - Displays: username, region, role badges, rank, winrate, message, VC preference
   - Color-coded rank badges per tier
   - RiftEssence branded design

### Testing Required

**Manual Testing Checklist**:
- [ ] Create a duo post on `/feed` or `/create`
- [ ] Verify "Share Post" button appears on own post
- [ ] Click button → URL copied to clipboard
- [ ] Paste URL in Discord → Check if rich embed appears with image
- [ ] Click link → Redirected to `/share/post/:id` page
- [ ] Verify all post details display correctly
- [ ] Test with different rank tiers (Iron → Challenger)
- [ ] Test with/without voice chat preference
- [ ] Test with smurf accounts (posting account + main account)
- [ ] Test anonymous posts (should hide username)
- [ ] Test 404 handling for deleted/invalid post IDs

**Discord Embed Testing**:
1. Share link in Discord server or DM
2. Verify image appears (1200x630px)
3. Check rank colors match tier
4. Verify text is readable
5. Test on mobile Discord (iOS/Android)

**OG Image API Testing**:
```bash
# Test direct API access
curl http://localhost:3000/api/og/post/{POST_ID}

# Should return 1200x630 PNG image
```

**Known Issues**:
- None reported yet, but needs comprehensive testing

### Files to Check

- [apps/web/pages/feed.tsx](apps/web/pages/feed.tsx) - Line with "Share Post" button
- [apps/web/pages/share/post/[id].tsx](apps/web/pages/share/post/[id].tsx) - Full share page
- [apps/web/pages/api/og/post/[id].tsx](apps/web/pages/api/og/post/[id].tsx) - OG image generation
- [apps/api/src/routes/posts.ts](apps/api/src/routes/posts.ts) - GET /:id endpoint

---

## 5. Make Website Titles Consistent and Coherent

### Current Status: ❌ **INCONSISTENT**

**Problem**: All pages currently share the same global title from `_app.tsx`. Individual pages need unique, descriptive titles for better UX and SEO.

### Current Implementation

**Global Title** ([apps/web/pages/_app.tsx](apps/web/pages/_app.tsx) line 35):
```tsx
<title>RiftEssence - Plateforme Communautaire League of Legends</title>
```

**Issue**: Every page shows this same title in browser tab, making it hard to distinguish between open tabs.

### Implementation Strategy

**Use `<Head>` Component Per Page**:

```tsx
import Head from 'next/head';

export default function PageName() {
  return (
    <>
      <Head>
        <title>Page Title | RiftEssence</title>
        <meta name="description" content="Page-specific description" />
      </Head>
      {/* Page content */}
    </>
  );
}
```

### Recommended Titles Per Page

**Format**: `{Feature} | RiftEssence` or `{Action} - {Feature} | RiftEssence`

#### Public Pages
- `/` → **"Find Your Duo - League of Legends | RiftEssence"**
- `/feed` → **"Duo Feed | RiftEssence"** or **"Looking for Duo | RiftEssence"**
- `/create` → **"Create Duo Post | RiftEssence"**
- `/lft` → **"Looking for Team | RiftEssence"**
- `/coaching` → **"Free Coaching | RiftEssence"**
- `/matchups` → **"My Matchups | RiftEssence"**
- `/matchups/marketplace` → **"Matchup Marketplace | RiftEssence"**
- `/matchups/create` → **"Create Matchup Guide | RiftEssence"**
- `/matchups/:id` → **"{MyChamp} vs {EnemyChamp} | RiftEssence"** (dynamic)
- `/communities` → **"Communities | RiftEssence"**
- `/communities/:id` → **"{CommunityName} | RiftEssence"** (dynamic)
- `/leaderboards` → **"Leaderboards | RiftEssence"**
- `/notifications` → **"Notifications | RiftEssence"** (add unread count: "Notifications (3) | RiftEssence")

#### User Pages
- `/profile` → **"My Profile | RiftEssence"**
- `/profile/:username` → **"{Username}'s Profile | RiftEssence"** (dynamic)
- `/settings` → **"Settings | RiftEssence"**

#### Auth Pages
- `/login` → **"Login | RiftEssence"**
- `/register` → **"Sign Up | RiftEssence"**
- `/authenticate` → **"Connecting... | RiftEssence"**

#### Admin Pages
- `/admin` → **"Admin Dashboard | RiftEssence"**
- `/admin/users` → **"User Management | RiftEssence"**
- `/admin/reports` → **"Reports | RiftEssence"**
- `/admin/badges` → **"Badge Management | RiftEssence"**
- `/admin/ads` → **"Ad Management | RiftEssence"**
- `/admin/settings` → **"Admin Settings | RiftEssence"**
- `/admin/broadcast` → **"Broadcast Message | RiftEssence"**

#### Policy Pages
- `/terms` → **"Terms of Service | RiftEssence"**
- `/privacy` → **"Privacy Policy | RiftEssence"**
- `/cookies` → **"Cookie Policy | RiftEssence"**

#### Share Pages
- `/share/post/:id` → **"{Username} - Looking For Duo | RiftEssence"** (dynamic, already implemented)

### Implementation Steps

1. **Create title utility function** (optional, for consistency):

```typescript
// apps/web/utils/titles.ts
export const createTitle = (pageTitle: string): string => {
  return `${pageTitle} | RiftEssence`;
};

export const createDynamicTitle = (parts: string[]): string => {
  return [...parts, 'RiftEssence'].join(' | ');
};
```

2. **Update each page** with unique title:

```tsx
// Example: apps/web/pages/feed.tsx
import Head from 'next/head';

export default function Feed() {
  return (
    <>
      <Head>
        <title>Duo Feed | RiftEssence</title>
        <meta name="description" content="Find your perfect duo partner for League of Legends ranked games." />
      </Head>
      {/* ... rest of page */}
    </>
  );
}
```

3. **Dynamic titles** for profile pages:

```tsx
// apps/web/pages/profile/[username].tsx
<Head>
  <title>{user?.username ? `${user.username}'s Profile` : 'Profile'} | RiftEssence</title>
</Head>
```

4. **Keep default title** in `_app.tsx` as fallback (already set)

### Translation Support

For multilingual titles, use translation keys:

```tsx
const { t } = useLanguage();

<Head>
  <title>{t('titles.feed')} | RiftEssence</title>
</Head>
```

Add title keys to `apps/web/translations/index.ts`:
```typescript
titles: {
  feed: 'Duo Feed', // EN
  feed_fr: 'Flux Duo', // FR
  lft: 'Looking for Team',
  lft_fr: 'Recherche d\'Équipe',
  // ... etc
}
```

### Priority Order

**Phase 1** (High Traffic):
1. Feed page
2. Profile pages
3. LFT page
4. Create page
5. Login/Register

**Phase 2** (Secondary):
6. Communities
7. Matchups
8. Coaching
9. Settings
10. Notifications

**Phase 3** (Admin/Policy):
11. Admin pages
12. Policy pages

### Verification

After implementation, test:
- Open multiple tabs with different pages
- Check browser tab titles are unique and descriptive
- Verify dynamic titles work (profile usernames, matchup champions)
- Test translations if implemented

---

## 6. Add an Icon to the Browser Tabs

### Current Status: ❌ **FAVICON MISSING**

**Problem**: The app references `favicon.png` in `_app.tsx` but the file doesn't exist in `/public`, causing a 404 error and showing default browser icon.

### Current Reference

**File**: [apps/web/pages/_app.tsx](apps/web/pages/_app.tsx) line 42
```tsx
<link rel="icon" type="image/png" href="/favicon.png" />
```

**Issue**: `/public/favicon.png` does not exist. The `/public` folder only contains an `assets/` subdirectory with:
- `BotLane.png`
- `og-image-template.html`
- `og-image.png`

### Implementation Steps

#### Step 1: Create Favicon Files

**Required favicon files** (for full browser/device support):

1. **favicon.ico** (32x32, 16x16 multi-resolution) - Legacy browsers
2. **favicon.png** (196x196) - Modern browsers
3. **apple-touch-icon.png** (180x180) - iOS devices
4. **favicon-16x16.png** (16x16) - Browser tabs
5. **favicon-32x32.png** (32x32) - Browser tabs
6. **favicon-192x192.png** (192x192) - Android Chrome

**Design Requirements**:
- Must be recognizable at 16x16 pixels
- Should match RiftEssence brand colors (gold #C8AA6E)
- Could be:
  - Stylized "R" or "RE" logomark
  - League of Legends inspired icon (avoid copyright issues)
  - Simplified version of full logo
  - Abstract symbol representing duo/teamwork

**Tools for Creation**:
- Use [favicon.io](https://favicon.io) - Generate from text, image, or emoji
- Use [Figma](https://figma.com) - Design custom icon
- Use [RealFaviconGenerator](https://realfavicongenerator.net) - Generate all sizes

#### Step 2: Place Files in `/public`

```
apps/web/public/
├── favicon.ico
├── favicon.png (196x196)
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-192x192.png
├── apple-touch-icon.png (180x180)
└── assets/
```

#### Step 3: Update `_app.tsx` with Complete Favicon Links

```tsx
// apps/web/pages/_app.tsx
<Head>
  {/* Favicons - Multiple sizes for best compatibility */}
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  
  {/* Manifest for PWA (optional) */}
  <link rel="manifest" href="/site.webmanifest" />
  
  {/* Theme Color for Mobile Browsers */}
  <meta name="theme-color" content="#C8AA6E" />
</Head>
```

#### Step 4: (Optional) Create `site.webmanifest`

```json
// apps/web/public/site.webmanifest
{
  "name": "RiftEssence",
  "short_name": "RiftEssence",
  "description": "League of Legends Community Platform",
  "icons": [
    {
      "src": "/favicon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#C8AA6E",
  "background_color": "#0A0A0D",
  "display": "standalone"
}
```

### Quick Solution (Minimal)

If time-constrained, at minimum:

1. **Create a simple favicon.ico**:
   - Go to [favicon.io/favicon-generator](https://favicon.io/favicon-generator/)
   - Text: "RE"
   - Font: Bold
   - Background: #0A0A0D (dark theme background)
   - Font Color: #C8AA6E (gold accent)
   - Download and place in `/public/favicon.ico`

2. **Update _app.tsx**:
```tsx
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

### Testing

After implementation:
- [ ] Clear browser cache
- [ ] Visit `http://localhost:3000`
- [ ] Check browser tab shows icon
- [ ] Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Check bookmarks show icon
- [ ] Verify no console errors for favicon

---

## 7. Implement Vercel Analytics

### Current Status: ✅ **COMPLETED** (2026-03-02)

### Implementation Summary

**Package Installed**:
- `@vercel/analytics` (^1.4.1) added to `apps/web/package.json`

**Integration**:
- `<Analytics />` component added to [apps/web/pages/_app.tsx](apps/web/pages/_app.tsx)
- Placed at end of component tree (after Footer)

**Automatic Tracking**:
- Page views across all routes
- Web Vitals (FCP, LCP, FID, CLS, TTFB)
- Zero configuration required
- Works automatically when deployed to Vercel

**Documentation Updated**:
- [Documentation/project/changelog.md](Documentation/project/changelog.md) - Added 2026-03-02 entry
- [Documentation/project/overview.md](Documentation/project/overview.md) - Added to tech stack table
- [Documentation/frontend/pages.md](Documentation/frontend/pages.md) - Updated _app.tsx description

### Next Steps

- ✅ Deploy to Vercel to enable analytics
- ✅ Access Vercel dashboard to view analytics
- No further implementation needed

---

## 8. Implement SEO Changes to Show Up in Google Searches

### Current Status: ⚠️ **PARTIALLY IMPLEMENTED**

**Completed**:
- ✅ Open Graph meta tags (global in `_app.tsx`)
- ✅ Share page OG metadata for duo posts
- ✅ Theme color meta tag
- ✅ Basic meta description

**Missing**:
- ❌ Page-specific meta tags (see Task #5)
- ❌ `sitemap.xml`
- ❌ `robots.txt`
- ❌ Structured data (JSON-LD)
- ❌ SSR for key pages (feed, profiles, communities)
- ❌ Performance optimizations (images, lazy loading)

### Priority SEO Tasks

#### Priority 1: Quick Wins (High Impact, Low Effort)

**A. Create `sitemap.xml`** 

```xml
<!-- apps/web/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://riftessence.app/</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/feed</loc>
    <priority>0.9</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/lft</loc>
    <priority>0.8</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/communities</loc>
    <priority>0.8</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/matchups/marketplace</loc>
    <priority>0.7</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/coaching</loc>
    <priority>0.7</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/login</loc>
    <priority>0.6</priority>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>https://riftessence.app/register</loc>
    <priority>0.6</priority>
    <changefreq>monthly</changefreq>
  </url>
  <!-- Add more static pages -->
</urlset>
```

**Dynamic sitemap generation** (advanced):
Create `pages/sitemap.xml.tsx`:
```tsx
// Server-side generated sitemap with user profiles, public posts, etc.
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Fetch dynamic content (profiles, posts, communities)
  const profiles = await fetchPublicProfiles();
  const communities = await fetchCommunities();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${profiles.map(p => `<url><loc>https://riftessence.app/profile/${p.username}</loc></url>`).join('')}
      ${communities.map(c => `<url><loc>https://riftessence.app/communities/${c.id}</loc></url>`).join('')}
    </urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default function Sitemap() {}
```

**B. Create `robots.txt`**

```txt
# apps/web/public/robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /settings
Disallow: /notifications

# Sitemap
Sitemap: https://riftessence.app/sitemap.xml

# Crawl rate
Crawl-delay: 1
```

**C. Add Structured Data (JSON-LD)**

```tsx
// apps/web/pages/_app.tsx (add to <Head>)
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "RiftEssence",
      "url": "https://riftessence.app",
      "description": "League of Legends duo finder, team recruitment, and community platform",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://riftessence.app/feed?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    })
  }}
/>
```

**D. Page-Specific Meta Tags** (see Task #5)

Every page needs unique:
- `<title>` tag
- `<meta name="description">` tag
- Open Graph tags (`og:title`, `og:description`, `og:url`)

#### Priority 2: Medium Effort (Significant Impact)

**E. Implement SSR for Key Pages**

Currently, all pages are client-side only. Consider adding `getServerSideProps` for:

1. **Feed Page** (`/feed`):
```tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Fetch initial posts server-side for SEO
  const res = await fetch('http://localhost:3333/api/posts?limit=20');
  const posts = await res.json();
  
  return { props: { initialPosts: posts } };
};
```

2. **Public Profiles** (`/profile/[username].tsx`):
```tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  const username = context.params?.username as string;
  const res = await fetch(`http://localhost:3333/api/user/profile/${username}`);
  const profile = await res.json();
  
  return { props: { profile } };
};
```

3. **Communities** (`/communities/index.tsx` & `[id].tsx`)
4. **Matchup Marketplace** (`/matchups/marketplace.tsx`)

**Benefits**:
- Google can crawl actual content (not just loading spinners)
- Faster perceived load time
- Better SEO rankings

**F. Performance Optimizations**

1. **Image Optimization**:
```tsx
// Replace <img> with Next.js Image component
import Image from 'next/image';

<Image
  src="/assets/BotLane.png"
  alt="Bot Lane"
  width={64}
  height={64}
  loading="lazy"
/>
```

2. **Lazy Loading**:
```tsx
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('../components/ChatWidget'), {
  ssr: false,
  loading: () => <div>Loading chat...</div>
});
```

3. **Code Splitting**:
- Already using Next.js (automatic code splitting)
- Consider dynamic imports for heavy components

#### Priority 3: Long-Term (SEO Strategy)

**G. Content Optimization**

1. **Keyword Research**:
   - Target: "league of legends duo finder"
   - Target: "lol looking for team"
   - Target: "league of legends coaching"
   - Target: "lol matchup guides"

2. **On-Page SEO**:
   - Use proper heading hierarchy (H1 → H2 → H3)
   - Add descriptive alt text to images
   - Internal linking between pages
   - Breadcrumb navigation

3. **Landing Page Content**:
   - Add more text content to homepage (`index.tsx`)
   - Explain features with keywords
   - Add FAQ section
   - Add "How it works" section

**H. Create Blog/Guide Section** (Future)

```
/guides/
  ├── how-to-find-duo
  ├── best-roles-for-duo-queue
  ├── climbing-with-a-duo
  └── league-teamfinding-tips
```

**I. Technical SEO Monitoring**

1. **Google Search Console**:
   - Verify site ownership
   - Submit sitemap
   - Monitor crawl errors
   - Track search performance

2. **Google Analytics** (or Vercel Analytics):
   - Monitor traffic sources
   - Track user behavior
   - Identify popular pages

3. **PageSpeed Insights**:
   - Test Core Web Vitals
   - Optimize load times
   - Fix performance issues

### Implementation Roadmap

**Week 1**: Quick Wins
- [ ] Create `sitemap.xml` (static)
- [ ] Create `robots.txt`
- [ ] Add JSON-LD structured data
- [ ] Add page-specific meta tags (top 5 pages)

**Week 2**: Medium Effort
- [ ] Implement SSR for feed page
- [ ] Implement SSR for public profiles
- [ ] Optimize images with Next.js Image
- [ ] Add proper heading hierarchy

**Week 3**: Long-Term Setup
- [ ] Register with Google Search Console
- [ ] Submit sitemap to Google
- [ ] Add more content to landing page
- [ ] Set up performance monitoring

**Week 4+**: Content Strategy
- [ ] Create guide/blog section
- [ ] Write SEO-optimized articles
- [ ] Build backlinks (community engagement)
- [ ] Monitor and iterate

### Testing SEO Changes

**Tools**:
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse) - SEO audit
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Structured data validation
- [PageSpeed Insights](https://pagespeed.web.dev/) - Performance + SEO
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) - Site crawl analysis

**Checklist**:
- [ ] Run Lighthouse audit (target: 90+ SEO score)
- [ ] Validate structured data with Google tool
- [ ] Check sitemap loads: `https://riftessence.app/sitemap.xml`
- [ ] Check robots.txt: `https://riftessence.app/robots.txt`
- [ ] Test mobile responsiveness
- [ ] Verify meta tags in page source
- [ ] Check Core Web Vitals scores

---

## Additional Notes

### Related Documentation

- [Documentation/project/changelog.md](Documentation/project/changelog.md) - Historical changes and feature implementations
- [Documentation/frontend/pages.md](Documentation/frontend/pages.md) - Complete page inventory
- [Documentation/frontend/components.md](Documentation/frontend/components.md) - Component documentation
- [Documentation/architecture/system-design.md](Documentation/architecture/system-design.md) - Overall architecture
- [Documentation/guides/anti-patterns.md](Documentation/guides/anti-patterns.md) - What to avoid

### Development Workflow

1. **Create a branch** for each task:
   ```bash
   git checkout -b fix/champion-pool-save
   ```

2. **Follow existing patterns** (see FrontendExpert instructions in `.github/agents/`)

3. **Test thoroughly** before committing

4. **Update documentation** when completing tasks:
   - Update this file with completion status
   - Add entry to changelog
   - Update relevant docs in Documentation/

5. **Delete this file** once all tasks are completed

---

**Last Updated**: 2026-03-02  
**Maintained By**: @DocumentationManager  
**File Purpose**: Temporary task tracking - DELETE after completion
