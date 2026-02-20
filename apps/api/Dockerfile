FROM --platform=linux/arm64 node:20-bookworm-slim

WORKDIR /app

# Install build tools for native modules like bcrypt
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# enable corepack & pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# copy only lockfile + package.json (faster, cached)
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# install deps (only once, during build)
RUN pnpm install --frozen-lockfile

# copy the rest of the source
COPY . .

WORKDIR /app

# generate Prisma client at repository root so pnpm's hoisted layout
# places the generated files where @prisma/client expects them
RUN npx prisma generate --schema=./prisma/schema.prisma

# ensure package-local node_modules exist so tsc can resolve types/modules
ENV CI=true
RUN pnpm -C apps/api install --no-frozen-lockfile

# build the TypeScript project into `dist` from the workspace root
# run tsc from the repo root so it resolves hoisted node_modules correctly
RUN pnpm exec tsc -p apps/api/tsconfig.json

# Generate Prisma client again after build to ensure it's in the right location
RUN npx prisma generate --schema=./prisma/schema.prisma

WORKDIR /app/apps/api

EXPOSE 3333

# run the compiled JS for a stable runtime
CMD ["node", "dist/index.js"]
