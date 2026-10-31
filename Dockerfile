FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ENV CIVIC_LOCAL_MODE=false WORKFLOW_TARGET_WORLD=local WORKFLOW_LOCAL_DATA_DIR=/app/.workflow-data WORKFLOW_LOCAL_BASE_URL=http://127.0.0.1:3000
RUN groupadd --system --gid 1001 civic && useradd --system --uid 1001 --gid civic civic && mkdir -p /app/.workflow-data && chown civic:civic /app/.workflow-data
COPY --from=build --chown=civic:civic /app/.next/standalone ./
COPY --from=build --chown=civic:civic /app/.next/static ./.next/static
USER civic
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
