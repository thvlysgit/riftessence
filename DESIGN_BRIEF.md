# 🎨 RiftEssence Design Brief

## Quick Summary for Your Designer

RiftEssence is a League of Legends esports/community platform. It has solid technical foundations with 9 themes but needs visual polish.

---

## 🔴 HIGH PRIORITY (Start Here)

### 1. Logo & Brand Identity
**Current:** Text "LFD" with gradient  
**Need:** Professional logo (horizontal, stacked, icon variants)  
**Files:** `apps/web/public/favicon.svg`, `apps/web/public/icon-*.png`  
**Deliverables:** SVG logo, favicon 32x32, app icons (60, 128, 192, 275px)

### 2. Button & Component Design System
**Current:** 2 button variants (primary gradient, secondary)  
**Need:** 6+ variants (primary, secondary, danger, ghost, text, icon-only)  
**Files:** `apps/web/styles/globals.css` (lines 232-273)  
**Include:** All states (hover, focus, active, disabled, loading)

### 3. Modal Dialog Templates
**Current:** 6 functional modals with minimal styling  
**Need:** Consistent modal design with animations  
**Files:** 
- `apps/api/components/CreatePlayerLftModal.tsx`
- `apps/api/components/CreateTeamLftModal.tsx`
- `apps/api/components/CreateCoachingOfferModal.tsx`
- `apps/api/components/CreateCoachingRequestModal.tsx`
- `apps/api/components/FeedbackModal.tsx`
- `apps/api/components/ReportModal.tsx`

### 4. Card Components
**Current:** Basic card layouts  
**Need:** Consistent card design system (user cards, matchup cards, team cards, coaching cards)  
**Files:** `apps/api/components/MatchupCard.tsx`

---

## 🟡 MEDIUM PRIORITY

### 5. Landing Page Hero
**Current:** Minimal gradient logo placeholder  
**Need:** Professional hero section (animated background, feature showcase)  
**File:** `apps/web/pages/index.tsx` (lines 36-77)

### 6. Form Inputs Design
**Current:** Basic `.input-themed` class  
**Need:** All input states (focus, error, disabled) with validation UI  
**File:** `apps/web/styles/globals.css`

### 7. Social Share Images (OG Images)
**Current:** Basic template  
**Need:** 3-5 variants for posts, profiles, matchups, teams  
**Files:** `apps/web/public/assets/og-image.png`  
**Specs:** 1200x630px PNG

### 8. Toast Notifications
**Current:** Minimal inline styles  
**Need:** 4 variants (success, error, info, warning)  
**File:** `apps/api/components/Toast.tsx`

---

## 🟢 LOWER PRIORITY (Nice to Have)

### 9. Discord Embed Branding
**Current:** Generic blue color (`0x0a84ff`)  
**Need:** Match RiftEssence gold (`#C8AA6E`), add footer branding  
**File:** `discord-bot/src/index.ts`

### 10. Marketing Materials
- GitHub README hero image/screenshot
- Demo GIF of the platform
- Social media graphics (Twitter, Discord server banner)

### 11. Email Templates
**Current:** None  
**Need:** Welcome email, password reset, notification templates

### 12. Animation Library
- Page transitions
- Micro-interactions for buttons, modals
- Skeleton loading screens

---

## 🎨 Current Theme System

Your designer should know: **9 themes already exist!**

| Theme | Primary Accent | Notes |
|-------|---------------|-------|
| Classic Dark | `#C8AA6E` (Gold) | Default, LoL-inspired |
| Arcane Pastel | Pastel tones | Arcane Netflix inspired |
| Nightshade | Deep purple/blue | Dark mode variant |
| Infernal Ember | `#EF4444` (Red) | Fire theme |
| Radiant Light | Light mode | Clean, minimal |
| Ocean Depths | Blue/teal | Water theme |
| Forest Mystic | Green | Nature theme |
| Sunset Blaze | Orange/pink | Warm tones |
| Shadow Assassin | Dark purple | Edgy theme |

**Theme CSS:** `apps/web/styles/globals.css` (275 lines)  
**Theme docs:** `Documentation/frontend/theming.md`

---

## 📁 Existing Assets

```
assets/
├── BotLane.png          (role icon)
├── jungle.svg           (role icon)
├── midlane.svg          (role icon)
├── support.svg          (role icon)
└── toplane.svg          (role icon)

apps/web/public/
├── favicon.svg          (needs redesign)
├── icon-60x60.png       (PWA icon)
├── icon-128x128.png     (PWA icon)
├── icon-192x192.png     (PWA icon)
├── icon-275x275.png     (PWA icon)
└── assets/
    └── og-image.png     (social share)
```

---

## 📋 Deliverables Checklist

For the designer to deliver:

- [ ] Logo files (SVG, PNG 256x256, favicon 32x32)
- [ ] App icons (60, 128, 192, 275, 512px)
- [ ] Button design system (Figma/Adobe XD)
- [ ] Modal design templates
- [ ] Card component designs
- [ ] Form input designs with states
- [ ] Landing page hero mockup
- [ ] Social share images (1200x630px)
- [ ] Toast notification designs
- [ ] Color palette documentation
- [ ] Typography guidelines

---

## ⏱️ Suggested Workflow

| Week | Focus |
|------|-------|
| 1 | Logo design + brand guidelines |
| 2 | Button & form component system |
| 3 | Card layouts + modal designs |
| 4 | Landing page hero + features |
| 5 | Social images + marketing |
| 6 | Polish, consistency, handoff |

---

## 💬 Notes for Collaboration

- **Tech Stack:** Next.js, React, Tailwind CSS
- **CSS Variables:** All theme colors use CSS custom properties
- **Export Format:** SVG preferred for icons/logos, PNG for raster images
- **Design Tool:** Figma recommended for developer handoff
