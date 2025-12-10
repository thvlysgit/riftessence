<#!
  Start all RiftEssence services for local development.
  Usage (from repo root):
    powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

  What it does:
    1) Starts Docker services (Postgres, Redis, API container) via docker compose up -d
    2) Starts the Discord bot (npm run dev) in a new PowerShell window
    3) Starts the Next.js web app (pnpm -C apps/web dev) in a new PowerShell window

  Prereqs:
    - Docker Desktop running
    - pnpm installed and workspace dependencies already installed (pnpm install -w)
    - discord-bot/.env populated (DISCORD_BOT_TOKEN, DISCORD_BOT_API_KEY, API_BASE_URL)
    - apps/api/.env populated (DISCORD_BOT_API_KEY, DB, etc.)
!#>

$ErrorActionPreference = 'Stop'

# Resolve repo root (folder containing this script)
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Write-Host "➡️ Using repo root: $repoRoot"

# 1) Start Docker services
Write-Host "🚀 Starting Docker services (db, redis, api)..."
docker compose up -d

# 2) Start Discord bot in new window
$botPath = Join-Path $repoRoot "discord-bot"
Write-Host "🤖 Starting Discord bot from $botPath"
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$botPath'; npm run dev"
)

# 3) Start Next.js web app in new window
$webPath = Join-Path $repoRoot "apps/web"
Write-Host "🕸️ Starting Next.js web app from $webPath"
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$webPath'; pnpm dev"
)

Write-Host "✅ All services started. API is in Docker (port 3333), web on 3000, bot running."
