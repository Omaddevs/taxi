# Build context is the repo root (npm workspaces monorepo):
#   docker build -f server/Dockerfile -t taxiline-server .
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY server server
WORKDIR /repo/server
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /repo
# Full node_modules on purpose: the prisma CLI (migrate deploy) and tsx (seed) run at start-up.
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/package.json package.json
WORKDIR /repo/server
COPY --from=build /repo/server/package.json /repo/server/prisma.config.ts ./
COPY --from=build /repo/server/prisma prisma
COPY --from=build /repo/server/dist dist
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"]
