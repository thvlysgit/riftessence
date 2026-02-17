# Heroku Deployment Guide

## Setup: Basic Dyno + Postgres Mini ($12/month)

### Prerequisites
1. Heroku account with $13 credit
2. Heroku CLI installed: https://devcenter.heroku.com/articles/heroku-cli
3. Git repository initialized

### Step 1: Create Heroku App

```powershell
# Login to Heroku
heroku login

# Create app (choose a unique name)
heroku create riftessence-api

# Add PostgreSQL Mini
heroku addons:create heroku-postgresql:mini
```

### Step 2: Get Free Redis (Upstash)

1. Go to https://upstash.com/
2. Sign up (free tier: 10k commands/day)
3. Create a new Redis database
4. Copy the Redis URL (starts with `redis://...`)

### Step 3: Set Environment Variables

```powershell
# Set required env vars
heroku config:set JWT_SECRET=$(node -p "require('crypto').randomBytes(32).toString('hex')")
heroku config:set RIOT_API_KEY=your_riot_api_key_here
heroku config:set REDIS_URL=your_upstash_redis_url_here
heroku config:set DISCORD_BOT_API_KEY=your_discord_key_here
heroku config:set ALLOW_ORIGIN=true
heroku config:set NODE_ENV=production

# DATABASE_URL is automatically set by Heroku Postgres addon
```

### Step 4: Configure Pnpm

```powershell
# Tell Heroku to use pnpm
heroku buildpacks:add heroku/nodejs
heroku config:set NPM_CONFIG_PRODUCTION=false
heroku config:set PNPM_VERSION=8.15.0
```

### Step 5: Deploy

```powershell
# Add Heroku remote (if not added automatically)
git remote add heroku https://git.heroku.com/riftessence-api.git

# Deploy
git push heroku main
# or if on different branch:
# git push heroku your-branch:main
```

### Step 6: Run Database Migrations

```powershell
# Run Prisma migrations
heroku run "cd apps/api && npx prisma migrate deploy"

# Optional: Seed database
heroku run "cd apps/api && npx prisma db seed"
```

### Step 7: Configure Web App (Vercel)

Update your Next.js app to point to the Heroku API:

In `apps/web/.env.production`:
```
NEXT_PUBLIC_API_URL=https://riftessence-api.herokuapp.com
```

Deploy to Vercel:
```powershell
cd apps/web
vercel --prod
```

### Step 8: Update CORS

Make sure your API allows requests from your Vercel domain. The CORS is already set to allow all origins, but you can restrict it later in [apps/api/src/index.ts](apps/api/src/index.ts#L42-L49).

### Monitoring & Logs

```powershell
# View logs
heroku logs --tail

# Check dyno status
heroku ps

# View PostgreSQL info
heroku pg:info

# Open app in browser
heroku open
```

## Cost Breakdown

- **Basic Dyno**: $7/month
- **Postgres Mini**: $5/month  
- **Upstash Redis**: $0 (free tier)
- **Vercel (Web)**: $0 (free tier)
- **Total**: $12/month ✅

## Troubleshooting

### Build fails
```powershell
heroku logs --tail
# Check for missing dependencies or build errors
```

### Database connection issues
```powershell
# Verify DATABASE_URL is set
heroku config:get DATABASE_URL

# Check database status
heroku pg:info
```

### App crashes on startup
```powershell
# Check logs for errors
heroku logs --tail

# Restart dyno
heroku restart
```

## Scaling (if needed later)

```powershell
# Upgrade to Standard-1X for better performance ($25/month)
heroku ps:type standard-1x

# Upgrade Postgres to Standard-0 for better limits ($50/month)
heroku addons:upgrade heroku-postgresql:standard-0
```

## Alternative: Discord Bot

If you want to deploy the Discord bot separately:

```powershell
# Create another app for the bot
heroku create riftessence-bot

# Use worker dyno (doesn't need web port)
# Update Procfile to: worker: node discord-bot/dist/index.js
heroku ps:scale worker=1
```
