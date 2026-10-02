# Build context is the repo root (this is an npm workspaces monorepo):
#   docker build -f apps/admin/Dockerfile -t taxiline-admin .
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY server/package.json server/package.json
RUN npm ci

FROM deps AS build
COPY apps/admin apps/admin
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w admin

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
