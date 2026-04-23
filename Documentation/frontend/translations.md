# Translations / i18n

> Last updated: 2026-04-22  
> Source: `apps/web/translations/index.ts` (~2000+ lines), `apps/web/contexts/LanguageContext.tsx`

## System

Custom i18n implementation (no external library). `LanguageContext` provides a `t()` function for lookups.

```tsx
const { t } = useLanguage();
<h1>{t('feed.title')}</h1>
```

## Languages

- **English** (`en`) — Primary
- **French** (`fr`) — Secondary

Stored in `localStorage` as `lfd_language`.

## French Locale Policy (2026-04-22)

- Keep UI copy natural in French for actions, prompts, and legal readability.
- Keep competitive League gameplay glossary terms in English for consistency and player clarity.
- Current enforced English glossary examples include: LFT, Duo, Flex, Top/Jungle/Mid/Bot/Support, rank names (Iron to Unranked), Winrate, Elo, Tier, Wave Management, Vision Control, Macro, Teamfighting, Lane Control, Champion Mastery, Matchup, Skill Matchup, Laning Phase, Items, Runes, Power Spikes, Scaling, Snowball, and Coin Flips.
- Preserve placeholder and key parity with English; no key removals when refining phrasing.
- Legal parity note: FR `terms.section4Description1` is aligned with EN ownership/licensing intent.

## Translation Key Format

Type-safe via `TranslationKey` union type. Dot-notation: `section.subsection.element`

### Sections (non-exhaustive)
- `common.*` — Loading, save, cancel, delete, edit, confirm, ranks, etc.
- `nav.*` — Navigation labels
- `auth.*` — Login, register, password
- `home.*` — Landing page
- `createPost.*` — Post creation form
- `feed.*` — Feed page, filters, posts
- `lft.*` / `coaching.*` — Team and coaching flows
- `profile.*` — Profile page elements
- `settings.*` — Settings page
- `notifications.*` — Notification types
- `feedback.*` / `report.*` — Feedback and report modals
- `privacy.*` / `terms.*` / `cookies.*` — Legal pages
- `matchups.*` — Matchup creation and marketplace
- `communities.*` — Community features
- `admin.*` — Admin panel

## Adding New Translation Keys

1. Add key to `TranslationKey` type union in `translations/index.ts`
2. Add `en` value in the English translations object
3. Add `fr` value in the French translations object
4. Use `t('new.key')` in components

Every user-facing string MUST use the translation system.
