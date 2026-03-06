FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY discord-bot/package.json ./
RUN npm install

COPY discord-bot/src ./src
COPY discord-bot/tsconfig.json ./

RUN npx tsc

# ── Runtime ──────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
