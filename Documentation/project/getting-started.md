# Getting Started

> Last updated: 2026-02-11

## Prerequisites

- Node.js 18+ (20 recommended)
- pnpm (installed via `corepack enable`)
- PostgreSQL 15 (via Docker or local install)
- Redis 7 (optional, for caching)

## Installation

```bash
# Clone the repo
git clone <repo-url>
cd riftessence

# Install dependencies
pnpm install

# Generate Prisma client
cd prisma && npx prisma generate && cd ..

# Set up environment variables
# Copy .env.example to .env in apps/api/ and configure:
#   DATABASE_URL, JWT_SECRET, RIOT_API_KEY, etc.
```

## Running Locally

### Option 1: Docker Compose (recommended)
```bash
docker-compose up -d    # Starts PostgreSQL + Redis + API
cd apps/web && pnpm dev # Start frontend separately
```

### Option 2: Manual
```bash
# Terminal 1: Start PostgreSQL (if not using Docker)
# Terminal 2: Start API
cd apps/api && pnpm dev

# Terminal 3: Start frontend
cd apps/web && pnpm dev
```

### Option 3: PowerShell Script
```powershell
./scripts/start-dev.ps1
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages |
| `pnpm dev` | Start development servers |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `npx prisma migrate dev` | Run database migrations |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |

## Environment Variables

### API (`apps/api/.env`)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `RIOT_API_KEY` — Riot Games API key
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — Discord OAuth
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile CAPTCHA
- `REDIS_URL` — Redis connection (optional)
- `ALLOW_ORIGIN` — CORS origin (`true` for dev)
- `PORT` — API port (default: 3333)

### Frontend (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL` — API base URL (default: `http://localhost:3333`)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key
