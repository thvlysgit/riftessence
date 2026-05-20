# Translations / i18n

> Last updated: 2026-05-20
> Source: `apps/web/translations/*`, `apps/web/contexts/LanguageContext.tsx`

## System

RiftEssence uses a custom, dependency-free i18n runtime for the Next.js web app. The system is intentionally small because the app does not currently need localized routes, server-side locale negotiation, or ICU plural rules.

Chosen approach: split TypeScript catalogs with compile-time key parity.

Other options considered:
- JSON catalogs + generated types: good for translator tooling, but adds a generation step and makes editor feedback slower.
- `next-intl` or similar: strong for localized routing, pluralization, and server components, but heavier than the current product needs and would require a broader migration.

## File Layout

- `apps/web/translations/locales/en.ts` - primary catalog and source of translation keys.
- `apps/web/translations/locales/fr.ts` - French catalog, checked against English with `satisfies TranslationCatalog`.
- `apps/web/translations/types.ts` - derives `TranslationKey` from the English catalog.
- `apps/web/translations/languages.ts` - supported language metadata, default language, and localStorage key.
- `apps/web/translations/format.ts` - lightweight `{token}` interpolation.
- `apps/web/translations/index.ts` - public exports plus `translate()`.
- `apps/web/contexts/LanguageContext.tsx` - React provider and `useLanguage()` hook.

## Runtime Usage

```tsx
const { t } = useLanguage();

<h1>{t('feed.title')}</h1>
<p>{t('profile.save.usernameError', { error: message })}</p>
```

`t()` falls back to English if the active locale is missing a key. In normal development, missing locale keys should be caught by TypeScript before runtime because each non-English catalog must satisfy the English catalog shape.

The selected UI language is stored in `localStorage` under `lfd_language`.

## Languages

- **English** (`en`) - primary/source catalog
- **French** (`fr`) - secondary catalog

## Adding a Language

1. Copy `apps/web/translations/locales/en.ts` to a new locale file, for example `apps/web/translations/locales/es.ts`.
2. Rename the export and make it satisfy `TranslationCatalog`.
3. Add the locale metadata to `apps/web/translations/languages.ts`.
4. Import the locale in `apps/web/translations/index.ts` and add it to `translations`.
5. Run `pnpm --filter @lfd/web build` or `pnpm --filter @lfd/web lint` to catch missing or extra keys.

The English catalog is the only place that defines the key set. Do not hand-maintain a `TranslationKey` union.

## Copy Voice

RiftEssence copy should feel like it was written by people in the League ecosystem: short, direct, and specific. Avoid generic SaaS phrasing and avoid making the UI verbose.

French should be natural French for actions, legal readability, confirmations, and onboarding, while keeping common League vocabulary in English when players would expect it.

## League Glossary Policy

Keep these terms in English unless the product owner explicitly asks otherwise:

LFT, Duo, Flex, Top, Jungle, Mid, Bot, Support, Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster, Challenger, Unranked, Winrate, Elo, Tier, Wave Management, Vision Control, Macro, Teamfighting, Lane Control, Champion Mastery, Matchup, Skill Matchup, Laning Phase, Power Spikes, Scaling, Snowball, Coin Flips, draft, scrim, roster, champion names.

Runes, items, and champion spell names are an exception: when they come from Data Dragon, they should follow the active UI language (`en -> en_US`, `fr -> fr_FR`). This supports players who learned League in French without hand-translating Riot terminology. Champion names remain canonical and are not localized.

When in doubt, keep the League term in English and ask for review instead of over-translating it.

## Interpolation

Use `{name}` tokens in catalogs and pass values through `t()`.

```ts
'profile.save.usernameError': 'Failed to save username: {error}'
```

```tsx
t('profile.save.usernameError', { error: err.message })
```

Existing `.replace('{token}', value)` call sites still work, but new code should prefer `t(key, values)`.

## Matchup Guide Translation

User-authored matchup guide text is not auto-translated yet. Product choice is still pending. Recommended direction is an opt-in, one-click AI translation that caches generated locale variants per guide, keeps the original available, and uses a glossary lock for champion names plus Riot/Data Dragon terms.

## Current Coverage Notes

As of 2026-05-20, the third i18n sweep covers the main feed filter surface and duo post cards, profile competitive snapshot/champion pool/account panels, navbar search and menu labels, chat/Discord DM prompts, access requirement redirect modals, champion autocomplete empty states, bug report modal copy, Discord forwarding setup instructions, Team Schedule event modal copy, and the matchup rune/item builder/editor surfaces.

Matchup rune trees, rune suggestions, item suggestions, saved item build display names, and selected champion spell suggestions now load Data Dragon in the active UI locale where supported. Cache keys are locale-scoped so English and French metadata do not overwrite each other.
