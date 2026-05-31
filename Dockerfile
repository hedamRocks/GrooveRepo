# Tracklib DJ-analysis worker.
# Builds an image that runs worker/index.ts with ffmpeg + yt-dlp available.
FROM node:20-slim

# System deps: ffmpeg (decode + EBU R128 loudness), python3 (yt-dlp runtime),
# curl (fetch the yt-dlp binary at build time).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install node deps (incl. devDeps: tsx + prisma CLI) and generate the client.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

# Only the code the worker actually needs.
COPY server ./server
COPY worker ./worker

ENV NODE_ENV=production
# Run tsx directly (not via npm) so SIGTERM reaches the process for clean shutdown.
CMD ["node_modules/.bin/tsx", "worker/index.ts"]
