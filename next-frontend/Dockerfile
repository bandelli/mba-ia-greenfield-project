# Production image for next-frontend (home-search-launch/TD-05).
# Uses Next.js's `output: "standalone"` build (next.config.ts) so the runtime
# stage only needs the traced production dependency subset, not the full
# node_modules tree.

FROM node:22.16.0-slim AS build
WORKDIR /home/node/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `next build` statically collects Route Handler page data, which evaluates
# `lib/env.ts`'s Zod schema at build time even though API_URL/SESSION_PASSWORD
# are server-only runtime values never inlined into the client bundle. These
# build-time placeholders only need to satisfy the schema shape (a valid URL,
# a 32+ char string) — the platform's REAL env vars (see docs/deployment.md
# § Environment variables) override them at container start, read fresh on
# every request since neither var is referenced by a Client Component.
ARG API_URL=http://build-time-placeholder.invalid
ARG SESSION_PASSWORD=build-time-placeholder-32-characters-long
ENV API_URL=${API_URL}
ENV SESSION_PASSWORD=${SESSION_PASSWORD}
RUN npm run build

FROM node:22.16.0-slim AS runtime
WORKDIR /home/node/app
ENV NODE_ENV=production
COPY --from=build /home/node/app/public ./public
COPY --from=build /home/node/app/.next/standalone ./
COPY --from=build /home/node/app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
