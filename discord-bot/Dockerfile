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

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

USER node
ENV HOME=/tmp

CMD ["node", "dist/index.js"]
