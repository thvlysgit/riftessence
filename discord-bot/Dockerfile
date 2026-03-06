FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
COPY discord-bot/package.json ./discord-bot/
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN npm install -g pnpm && \
    pnpm --filter @riftessence/discord-bot install --frozen-lockfile

COPY discord-bot/ ./discord-bot/

RUN pnpm --filter @riftessence/discord-bot build

# ── Runtime ──────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/discord-bot/dist ./discord-bot/dist
COPY --from=builder /app/discord-bot/package.json ./discord-bot/

WORKDIR /app/discord-bot

CMD ["node", "dist/index.js"]
