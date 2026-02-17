# RiftEssence Documentation

> Last updated: 2026-02-16

Central documentation hub for the RiftEssence project. This is the single source of truth — all project knowledge is organized here.

## Navigation

### Project
- [Project Overview](project/overview.md) — Tech stack, architecture summary, key facts
- [Getting Started](project/getting-started.md) — Dev environment setup, installation, running locally
- [Deployment](project/deployment.md) — Heroku, Vercel, Docker, Raspberry Pi
- [Changelog](project/changelog.md) — Chronological log of all changes

### Architecture
- [System Design](architecture/system-design.md) — High-level architecture, data flow, deployment topology
- [Database Schema](architecture/database-schema.md) — Prisma models, enums, relationships, indexes
- [API Contracts](architecture/api-contracts.md) — All endpoints, request/response shapes
- [Security](architecture/security.md) — Auth flow, JWT, CORS, CSRF, rate limiting, sanitization

### Frontend
- [Pages](frontend/pages.md) — All routes, pages, and their responsibilities
- [Components](frontend/components.md) — Component inventory and usage
- [Theming](frontend/theming.md) — CSS variables, 5 themes, conversion guide
- [Translations](frontend/translations.md) — i18n system, translation keys, adding languages
- [State Management](frontend/state-management.md) — Contexts, React Query, data fetching

### Backend
- [Routes](backend/routes.md) — Route modules, prefixes, handlers
- [Middleware](backend/middleware.md) — Auth, errors, logging middleware
- [Integrations](backend/integrations.md) — Riot API, Discord OAuth, Cloudflare Turnstile
- [Caching](backend/caching.md) — Redis setup, cache utilities, patterns

### Discord Bot
- [Overview](discord-bot/overview.md) — Bot commands, feed mirroring, setup

### Guides
- [Coding Conventions](guides/coding-conventions.md) — Naming, imports, error handling, TypeScript
- [Patterns](guides/patterns.md) — Established code patterns with examples
- [Anti-Patterns](guides/anti-patterns.md) — What to avoid and why
- [Testing](guides/testing.md) — Test setup, conventions, coverage gaps
- [Beta Marketing Messages](guides/beta-marketing-messages.md) — Discord announcements, social media posts (French)
- [OG Image Generation](guides/og-image-generation.md) — How to create the Open Graph preview image

### Analysis
- [Codebase Audit](analysis/codebase-audit.md) — Quality scores, known issues, improvement roadmap

---

## Documentation Conventions

- **Last updated** date at the top of every file
- **File paths** are always included when referencing code
- **Single source of truth** — each topic has exactly one canonical file
- Managed by the **@DocumentationManager** agent
