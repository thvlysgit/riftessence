# Theming System

> Last updated: 2026-04-17  
> Source: `apps/web/utils/themeRegistry.ts`, `apps/web/contexts/ThemeContext.tsx`, `apps/web/pages/_document.tsx`, `apps/web/pages/_app.tsx`, `apps/web/styles/globals.css`  
> Guide: `apps/web/utils/README-theming.md`

## Architecture

The web app now uses a shared theme registry for both pre-hydration and runtime theme application.

- Source of truth for theme definitions: `apps/web/utils/themeRegistry.ts`
- Runtime provider and persistence: `apps/web/contexts/ThemeContext.tsx`
- First-paint pre-hydration bootstrap: `apps/web/pages/_document.tsx`
- Global shell visuals, typography, and ambient motion: `apps/web/styles/globals.css`

This removes drift between first paint and hydrated state and ensures all 9 themes are available consistently.

## Theme Catalog

1. **Classic Dark** (`classic`) - codex-inspired dark gold
2. **Arcane Pastel** (`arcane-pastel`) - airy magical pastel glow
3. **Nightshade** (`nightshade`) - neon tactical dark
4. **Infernal Ember** (`infernal-ember`) - molten ember intensity
5. **Radiant Light** (`radiant-light`) - clean high-clarity daylight
6. **Ocean Depths** (`ocean-depths`) - deep marine cyan atmosphere
7. **Forest Mystic** (`forest-mystic`) - organic verdant enchantment
8. **Sunset Blaze** (`sunset-blaze`) - warm cinematic dusk energy
9. **Shadow Assassin** (`shadow-assassin`) - stealth matte violet-black

## Personality Layers

Theme personality is now implemented through four layers that do not alter UX flow or IA:

1. **Color and component tokens** via CSS variables
2. **Shared typography tokens** (global heading/body font system)
3. **Global shell motifs** via app wrapper background and overlay layers
4. **Ambient motion signatures** with strict `prefers-reduced-motion` handling

Body and heading typography remain constant across themes (`--font-body`, `--font-heading`, `--font-heading-weight`, `--font-heading-transform`, `--font-heading-tracking`).

## Runtime Behavior

1. `ThemeContext` starts from the default theme for hydration-safe first render.
2. On mount, `ThemeContext` resolves theme from `localStorage` key `lfd_theme`.
3. CSS variable map is applied to `document.documentElement`.
4. `data-theme` is updated on root and drives theme-specific shell/motion selectors.
5. `_document` applies the same variable map before React hydration to avoid flash/mismatch.
6. App shell updates browser `theme-color` meta to match active accent.

## Key CSS Variables

Core tokens:

- `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-accent-1`, `--color-accent-2`, `--color-accent-3`
- `--color-border`, `--color-border-hover`
- `--color-success`, `--color-error`, `--color-warning`

Derived tokens:

- `--accent-primary-bg`, `--accent-primary-border`
- `--btn-gradient`, `--btn-gradient-text`, `--btn-disabled-bg`
- `--gradient-card`, `--theme-outline-glow`, `--theme-soft-highlight`

Personality tokens:

- `--font-body`, `--font-heading`, `--font-heading-weight`
- `--font-heading-transform`, `--font-heading-tracking`
- `--theme-shell-gradient`, `--theme-shell-overlay`, `--theme-surface-motif`
- `--theme-motif-opacity`, `--theme-shell-border-glow`, `--theme-shell-shadow`
- `--theme-ambient-opacity`, `--theme-ambient-animation`

## Shell Classes

Global shell wrappers:

- `.app-theme-shell`
- `.app-theme-content`

Reusable section variants:

- `.theme-section-shell`
- `.theme-section-shell-soft`
- `.theme-section-shell-strong`

These classes are visual-only wrappers and should not change interaction semantics.

## Accessibility and Motion

- Ambient and decorative motion is disabled under `prefers-reduced-motion`.
- Theme overlays are non-interactive (`pointer-events: none`) and stay behind content.
- Contrast-sensitive tokens remain in theme color maps and should be tested when adding new accents.

## Implementation Notes

- Onboarding now exposes all 9 themes with translated labels.
- Settings uses themed shell panels for stronger visual identity while preserving existing layout.
- Loading spinner per-theme variants remain in `apps/web/components/LoadingSpinner.tsx`.
