# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages/db packages/db
RUN pnpm --filter @3s-design/db build
RUN pnpm --filter @3s-design/api build

FROM base AS runtime
ENV NODE_ENV="production"
ENV PORT="4000"
ENV HOST="0.0.0.0"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/db packages/db
EXPOSE 4000
CMD ["pnpm", "--filter", "@3s-design/api", "start"]
