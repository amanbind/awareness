# Awareness Newsletter — production container.
# Multi-stage: stage 1 packages dist/ with the Node-only build-dist script;
# stage 2 ships dist/ behind nginx-alpine with the production config baked in.

# ──────────────────────────────────────────────────────────────────────────
# Stage 1 — build
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /src

# Install only what build-dist.mjs needs. (It uses node:* stdlib only, no
# third-party deps — npm ci is a no-op for runtime but exercises lockfile
# integrity early.)
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional --no-audit --no-fund || true

# Copy the rest of the source.
COPY . .

# Produce the dist/ artifact.
RUN node scripts/build-dist.mjs --force

# ──────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# ──────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Drop the default nginx config; install ours.
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf

# Copy the production artifact.
COPY --from=build /src/dist /usr/share/nginx/html

# nginx-alpine already runs the nginx master as root then drops to the
# 'nginx' user for workers — no extra config needed.

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
