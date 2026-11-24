FROM node:24-bookworm-slim AS base

ARG PNPM_VERSION=12.18.0
WORKDIR /app

FROM base AS builder

RUN npm install -g "pnpm@${PNPM_VERSION}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY vendor/tcrn-ds/4.2.0 vendor/tcrn-ds/4.2.0

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM base AS prod-deps

RUN npm install -g "pnpm@${PNPM_VERSION}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY vendor/tcrn-ds/4.2.0 vendor/tcrn-ds/4.2.0

RUN pnpm install --frozen-lockfile --prod --filter @voxward/server...

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --gid 10001 voxward \
  && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin voxward \
  && mkdir -p /var/lib/voxward /var/lib/voxward-sandbox \
  && chown 10001:10001 /var/lib/voxward /var/lib/voxward-sandbox \
  && chmod 0700 /var/lib/voxward /var/lib/voxward-sandbox

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/apps/server/package.json /app/apps/server/package.json
COPY --from=builder /app/packages/contracts/package.json /app/packages/contracts/package.json
COPY --from=builder /app/apps/server/dist /app/apps/server/dist
COPY --from=builder /app/apps/web/dist /app/apps/web/dist
COPY --from=builder /app/scripts/bootstrap-owner.mjs /app/scripts/bootstrap-owner.mjs
COPY --from=builder /app/deploy/sandbox /app/deploy/sandbox

USER 10001:10001

EXPOSE 3000 3100

ENTRYPOINT ["node"]
CMD ["apps/server/dist/main.js"]
