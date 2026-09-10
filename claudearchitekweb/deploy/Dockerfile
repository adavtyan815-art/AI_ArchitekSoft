# ---- build stage -------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100
RUN groupadd -r app && useradd -r -g app app && mkdir -p /app/data && chown -R app:app /app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# native deps used at runtime (kept as external packages)
COPY --from=builder --chown=app:app /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=app:app /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=app:app /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=app:app /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=app:app /app/node_modules/@img ./node_modules/@img
COPY --from=builder --chown=app:app /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static
USER app
EXPOSE 3100
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
