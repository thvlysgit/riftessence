# Translations / i18n

> Last updated: 2026-02-11  
> Source: `apps/web/translations/index.ts` (~1594 lines), `apps/web/contexts/LanguageContext.tsx`

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

## Translation Key Format

Type-safe via `TranslationKey` union type. Dot-notation: `section.subsection.element`

### Sections
- `common.*` — Loading, save, cancel, delete, edit, confirm, ranks, etc.
- `nav.*` — Navigation labels
- `auth.*` — Login, register, password
- `home.*` — Landing page
- `createPost.*` — Post creation form
- `feed.*` — Feed page, filters, posts
- `profile.*` — Profile page elements
- `settings.*` — Settings page
- `notifications.*` — Notification types
- `communities.*` — Community features
- `lft.*` — Looking for Team
- `admin.*` — Admin panel

## Adding New Translation Keys

1. Add key to `TranslationKey` type union in `translations/index.ts`
2. Add `en` value in the English translations object
3. Add `fr` value in the French translations object
4. Use `t('new.key')` in components

Every user-facing string MUST use the translation system.
