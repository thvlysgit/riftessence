FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY discord-bot/package.json ./discord-bot/
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN npm install -g pnpm && \
    pnpm --filter @riftessence/discord-bot install --frozen-lockfile

COPY discord-bot/ ./discord-bot/

WORKDIR /app/discord-bot
RUN pnpm build

# ── Runtime ──────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app/discord-bot

COPY --from=builder /app/discord-bot/dist ./dist
COPY --from=builder /app/discord-bot/package.json ./
COPY --from=builder /app/discord-bot/node_modules ./node_modules

CMD ["node", "dist/index.js"]
