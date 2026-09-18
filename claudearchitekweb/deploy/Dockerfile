# ---- build stage -------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
# package-lock.json is committed (see claudearchitekweb/.gitignore) so `npm ci` is reproducible.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# NEXT_STANDALONE=1 makes next.config.ts emit .next/standalone, which the runtime stage copies.
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_STANDALONE=1
RUN npm run build
# Bundle the standalone worker (scripts/worker.ts + src/) into one file; native packages stay external.
RUN npm run build:worker

# ---- runtime stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0: the standalone server binds to $HOSTNAME, which Docker otherwise sets to the container id,
# so the health check (and the reverse proxy) could not reach it. TZ keeps every local-time call in Yerevan.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0 TZ=Asia/Yerevan
# tzdata: the slim base ships no zone files, so TZ would silently fall back to UTC without it.
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app app && mkdir -p /app/data && chown -R app:app /app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# split-worker profile: `node worker.js` (no tsx, scripts/ or src/ needed at runtime)
COPY --from=builder --chown=app:app /app/worker.js ./worker.js
# native deps used at runtime (kept as external packages) and what they require
COPY --from=builder --chown=app:app /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=app:app /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=app:app /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=app:app /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=app:app /app/node_modules/@img ./node_modules/@img
COPY --from=builder --chown=app:app /app/node_modules/detect-libc ./node_modules/detect-libc
COPY --from=builder --chown=app:app /app/node_modules/semver ./node_modules/semver
COPY --from=builder --chown=app:app /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static
USER app
EXPOSE 3100
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
