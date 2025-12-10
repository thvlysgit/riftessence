# LFD Hub — Monorepo

This repository is a minimal TypeScript monorepo skeleton for the LFD Hub project (Next.js web app, Fastify API, shared types and UI components).

Quick commands

Install dependencies (requires pnpm):

```powershell
pnpm install
```

Run the web app (Next.js):

```powershell
pnpm --filter @lfd/web dev
```

Run the API (Fastify):

```powershell
pnpm --filter @lfd/api dev
```

Run lint and tests:

```powershell
pnpm -w -r run lint
pnpm -w -r test
```

Project layout

- `apps/web` — Next.js + Tailwind front-end (pages: `/feed`, `/profile/[id]`, `/create`)
- `apps/api` — Fastify API exposing `/health` and OpenAPI docs at `/docs`
- `packages/types` — shared TypeScript schemas (Zod) and unit tests
- `packages/ui` — simple React components (Button, Card, Tag)

Notes

- Use `pnpm` at the repo root. CI workflow is provided at `.github/workflows/ci.yml`.
- This is a skeleton: install any additional dependencies you need (e.g. `tailwindcss`, `react` peer deps) and expand the API and UI as required.
# LFD Hub Monorepo

Monorepo skeleton containing Next.js web app, Fastify API, shared types, and UI components.

Getting started

Prerequisites: `pnpm`, Node 18+

Install

```powershell
pnpm install
```

Run apps

```powershell
pnpm --filter @lfd/web dev
pnpm --filter @lfd/api dev
```

Run lint and tests

```powershell
pnpm lint
pnpm test
```
