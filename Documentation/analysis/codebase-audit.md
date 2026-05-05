# Codebase Audit

> Last updated: 2026-04-16  
> Source: consolidated from legacy root-level audit notes

## Latest Session Audit

- See [2026-04-16 Audit Findings](2026-04-16-audit-findings.md) for the latest verified audit record.
- Highlights from that session:
	- Architecture boundary cleanup completed for web component ownership.
	- Web production build regression resolved and validated.
	- API and web build/type checks passing.
	- Follow-up risks tracked for TS config deprecations and polling optimization.

## Overall Grade: 6.25/10 (B-)

| Area | Score | Notes |
|------|-------|-------|
| **Architecture** | 7/10 | Clean monorepo, but index.ts bloated (~1057 lines) |
| **Code Quality** | 6.5/10 | Heavy `any` usage, inconsistent patterns |
| **Security** | 5.5/10 | localStorage JWT, some CSRF gaps, rate limiting relaxed |
| **UX** | 6/10 | Functional but needs polish |
| **Performance** | 6/10 | No edge caching, minimal Redis usage |
| **Deployment** | 6.5/10 | Docker + Vercel + Heroku configured |

## Critical Issues

1. `index.ts` contains inline routes that should be extracted
2. Auth middleware inconsistently applied across routes
3. `any` type overuse in API route handlers
4. @lfd/types package underutilized
5. React Query configured but unused
6. Redis/caching infrastructure underutilized
7. Test coverage very low

## Improvement Roadmap

Completed quick wins and historical implementation notes are consolidated in [../project/changelog.md](../project/changelog.md).
Use [2026-04-16 Audit Findings](2026-04-16-audit-findings.md) for the latest verified audit state.
