# ─── Stage 1: Build ──────────────────────────────────────
FROM oven/bun:1-slim AS build

WORKDIR /app

RUN apt-get update -y && apt-get install -y \
    openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY packages/shared/package.json ./packages/shared/
COPY services/engine/package.json ./services/engine/
RUN echo '{"private":true,"workspaces":["packages/shared","services/engine"]}' > package.json
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --ignore-scripts --backend=copyfile

RUN rm -rf packages/shared/node_modules services/engine/node_modules
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY services/engine ./services/engine
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --ignore-scripts --backend=copyfile

RUN cd packages/shared && bun run build

RUN cd services/engine \
    && cp prisma.config.ts prisma.config.ts.bak \
    && rm prisma.config.ts \
    && bun x prisma generate --schema=./src/prisma/schema \
    && mv prisma.config.ts.bak prisma.config.ts \
    && bun run build

# ─── Stage 2: Production ────────────────────────────────
FROM node:22-slim

RUN apt-get update -y && apt-get install -y \
    openssl ca-certificates fonts-liberation curl \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/services/engine/dist ./dist
COPY --from=build /app/services/engine/package.json ./package.json
COPY --from=build /app/services/engine/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/services/engine/src/prisma ./src/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

RUN sed -i 's|"workspace:\*"|"file:./packages/shared"|' package.json \
    && npm install --omit=dev --ignore-scripts \
    && mv prisma.config.ts prisma.config.ts.bak \
    && npx prisma generate --schema=./src/prisma/schema \
    && mv prisma.config.ts.bak prisma.config.ts

ENV NODE_ENV=production
ENV PORT=7291

USER node
EXPOSE 7291/tcp
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy --schema=./src/prisma/schema && node dist/server.js"]
