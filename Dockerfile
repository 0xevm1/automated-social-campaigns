FROM node:22-alpine

RUN apk add --no-cache fontconfig ttf-dejavu ttf-freefont ttf-liberation \
    && fc-cache -f

RUN corepack enable
WORKDIR /app

# Copy workspace config and lockfile first (layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# Copy package manifests only (dependency install caching)
COPY packages/shared/package.json packages/shared/
COPY packages/intake/package.json packages/intake/
COPY packages/processing/package.json packages/processing/
COPY packages/campaign-runner/package.json packages/campaign-runner/

# Install all deps (inside container for correct native bindings e.g. sharp)
RUN pnpm install --frozen-lockfile

# Copy source and build all packages
COPY packages/ packages/
RUN pnpm -r build
