# Testing

> Last updated: 2026-02-11

## Setup

- **Framework**: Jest + ts-jest
- **Config**: Root `jest.config.cjs`
- **Frontend testing**: `@testing-library/react` + `@testing-library/jest-dom`

## Current State

| Package | Tests | Coverage |
|---------|-------|----------|
| `packages/types` | Zod schema validation tests | Basic |
| `apps/api` | Skeleton exists in `__tests__/` | Minimal |
| `apps/web` | Skeleton exists in `__tests__/` | Minimal |

**Overall coverage**: Low — major known gap from codebase audit.

## Test File Convention

- Location: `__tests__/` directories (not co-located)
- Naming: `*.test.ts` or `*.test.tsx`

## Running Tests

```bash
pnpm test           # Run all tests
pnpm test --filter @lfd/types  # Run specific package
```

## Gaps

- No API integration tests (recommended: supertest)
- No frontend component tests (recommended: @testing-library/react)
- No E2E tests
- No load/performance tests
