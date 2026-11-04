# ============================================================
# Build
# ============================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@12.9.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY .swcrc ./
COPY src ./src

RUN pnpm run build


# ============================================================
# Production dependencies
# ============================================================

FROM node:22-bookworm-slim AS production-deps

WORKDIR /app

RUN npm install -g pnpm@12.9.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile \
    && pnpm store prune


# ============================================================
# Production
# ============================================================

FROM node:22-bookworm-slim AS production


RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@12.9.1

COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules

COPY --from=builder --chown=node:node /app/dist ./dist

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml  ./

USER node

EXPOSE 5000
