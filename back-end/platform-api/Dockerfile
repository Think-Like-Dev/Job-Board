# ============================================================
# Build
# ============================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@latest

COPY package*.json pnpm-*.yaml ./

RUN pnpm install --frozen-lockfile

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY .swcrc ./
COPY src ./src

RUN pnpm run build

# ============================================================
# Migration target
# ============================================================
FROM builder AS migration

# CMD ["pnpm", "exec", "mikro-orm", "migration:up", "--config", "./dist/src/database/mikro-orm.cli.config.js"]
CMD ["pnpm", "migration:up"]

# ============================================================
# Seed target
# ============================================================
FROM builder AS seed

CMD ["pnpm", "seed:run"]

# ============================================================
# Production
# ============================================================

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@latest

COPY package*.json pnpm-*.yaml ./

RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5000

CMD ["node", "dist/main.js"]
