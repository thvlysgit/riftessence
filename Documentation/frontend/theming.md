# Theming System

> Last updated: 2026-02-12  
> Source: `apps/web/contexts/ThemeContext.tsx`, `apps/web/styles/globals.css`  
> Guide: `apps/web/utils/README-theming.md`

## 9 Themes

1. **Classic Dark** (`classic`) — Gold/dark (LoL-inspired, `#C8AA6E` accent)
2. **Arcane Pastel** (`arcane-pastel`) — Light purple/pink pastels
3. **Nightshade** (`nightshade`) — Deep blue/purple dark
4. **Infernal Ember** (`infernal-ember`) — Red/orange dark
5. **Radiant Light** (`radiant-light`) — Clean white/blue light theme
6. **Ocean Depths** (`ocean-depths`) — Deep navy/teal oceanic theme with cyan accents
7. **Forest Mystic** (`forest-mystic`) — Nature-inspired dark green with lime/emerald accents
8. **Sunset Blaze** (`sunset-blaze`) — Warm orange/brown sunset with gold accents
9. **Shadow Assassin** (`shadow-assassin`) — Ultra-dark purple/black stealth theme with violet accents

## Custom Loading Animations

Each theme has a unique loading spinner animation in `LoadingSpinner` component (`apps/web/components/LoadingSpinner.tsx`):

- **Classic Dark** — Gold spinning circle with pulse
- **Arcane Pastel** — Magic ring with sparkle fade
- **Nightshade** — Pulsing moon with twinkling stars
- **Infernal Ember** — Flickering animated flames
- **Radiant Light** — Simple spinning circle
- **Ocean Depths** — Swirling water vortex with rising bubbles
- **Forest Mystic** — Rotating leaves with floating motion
- **Sunset Blaze** — Pulsing sun with rotating rays
- **Shadow Assassin** — Swirling smoke with spiral rotation

Settings page displays scaled previews of each spinner to help users visualize the complete theme experience.

## How It Works

Theme selection in `ThemeContext` sets CSS variables on `document.documentElement`. All themed UI reads these variables. Theme selection persists to `localStorage`.

## CSS Variables

### Colors
- `--color-bg-primary` / `--color-bg-secondary` / `--color-bg-tertiary`
- `--color-text-primary` / `--color-text-secondary` / `--color-text-muted`
- `--color-accent-1` / `--color-accent-2` / `--color-accent-3`
- `--color-border` / `--color-border-hover`
- `--color-success` / `--color-error` / `--color-warning`

### Styling
- `--border-radius` — e.g., `8px`, `16px`
- `--border-width` — e.g., `1px`, `2px`
- `--shadow` — Box shadow value

## Utility Classes (from `globals.css`)

`.bg-primary`, `.bg-secondary`, `.bg-tertiary`, `.text-primary`, `.text-secondary`, `.text-muted`, `.text-accent`, `.border-themed`, `.card`, `.btn-primary`, `.btn-secondary`, `.input-themed`

## Usage Rules

1. **NEVER** hardcode colors for theme-aware elements (`bg-gray-800`, `text-[#C8AA6E]`)
2. Use CSS variables via `style={{ }}` or utility classes
3. Hover states: use `onMouseEnter`/`onMouseLeave` event handlers
4. Tailwind for layout/spacing only (non-color classes are fine)
5. Exception: Status/rank colors that are NOT theme-dependent

See `apps/web/utils/README-theming.md` for detailed conversion guide with examples.
