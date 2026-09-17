# Production image for nestjs-api AND video-worker (home-search-launch/TD-05).
# Both services run from this same image — differentiated only by the platform's
# start command, mirroring the existing dev convention (Dockerfile.dev is shared
# the same way; see nestjs-project/CLAUDE.md § Services).
#   nestjs-api:    node dist/main
#   video-worker:  node dist/worker/main
#
# ffmpeg/ffprobe are required at runtime by the video-worker's metadata/thumbnail
# extraction (phase-03-videos/TD-02, TD-04) — installed in the runtime stage since
# nestjs-api doesn't need it but sharing one image keeps the build simple and the
# extra footprint is small next to node_modules.

FROM node:25.6.0-slim AS build
WORKDIR /home/node/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:25.6.0-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /home/node/app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /home/node/app/dist ./dist
USER node
CMD ["node", "dist/main"]
