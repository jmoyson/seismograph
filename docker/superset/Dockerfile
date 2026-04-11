# syntax=docker/dockerfile:1.6
#
# Seismograph custom Apache Superset image.
#
# This is a 3-stage build that compiles two custom Superset visualization
# plugins into the frontend bundle, then ships the result on top of the
# matching apache/superset runtime image.
#
# Why this is so involved:
#   apache/superset:<version> is a runtime-only image. It does NOT contain
#   /app/superset-frontend/src/, npm, or webpack — only the pre-built static
#   chunks under /app/superset/static/assets. There is no published image
#   variant that includes the frontend source. To register a custom chart
#   plugin we have to rebuild the frontend from source, which means cloning
#   the matching Apache Superset git tag and running their npm build with
#   our plugin installed and MainPreset.js patched.
#
# Cost (cold cache):
#   * ~10–15 minutes wall clock
#   * ~2 GB intermediate layers, ~1 GB final image
#   * webpack peaks ~6 GB resident — Dokploy build host needs at least 8 GB
#     of free RAM. The Apache build script forces NODE_OPTIONS=--max_old_space_size=8192.
#
# Version pinning:
#   The runtime image AND the cloned source MUST share the same git tag,
#   otherwise the rebuilt frontend chunks reference Python templates and
#   routes that drift from the runtime backend. Bumping the version means
#   bumping SUPERSET_VERSION here AND verifying the build still passes.

ARG SUPERSET_VERSION=6.0.0

# --- Stage 1: build the @seismograph/superset-plugins package ----------------
# Plain npm in isolation, no pnpm workspace, --legacy-peer-deps because
# @superset-ui/chart-controls drags @testing-library/react@12 which has a
# react<18 peer that conflicts with our React 19 dev dep. Our plugin only
# uses React APIs that have existed since React 16, so the build target
# version is irrelevant — Superset's own React wins at bundle time.
FROM node:20-trixie-slim AS plugin-builder
WORKDIR /plugin
COPY apps/superset-plugins/package.json apps/superset-plugins/tsconfig.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY apps/superset-plugins/src ./src
RUN npm run build

# --- Stage 2: clone Superset, install our plugin, rebuild the frontend -------
FROM node:20-trixie-slim AS superset-frontend-builder
ARG SUPERSET_VERSION

# Build dependencies pulled from Apache's own Dockerfile (node-gyp + git).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git ca-certificates curl build-essential python3 zstd \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --branch "${SUPERSET_VERSION}" \
      https://github.com/apache/superset.git .

WORKDIR /src/superset-frontend
# IMPORTANT: plain `npm ci`, no `--legacy-peer-deps`. Apache uses bare
# `npm ci` in their official Dockerfile and Superset's lockfile relies on
# npm 7+ peer-dep auto-resolution to install transitive peers like
# @react-spring/web, @deck.gl/widgets, query-string, etc. Adding
# --legacy-peer-deps disables that behavior and webpack later fails with
# 19 "Module not found" errors on those exact packages.
RUN npm ci --no-audit --no-fund

# Drop our compiled plugin into Superset's frontend node_modules. Our plugin
# declares react ^17||^18||^19 as a peer, which Superset 6.0.0 (react 17.0.2)
# satisfies cleanly — no --legacy-peer-deps needed here either.
COPY --from=plugin-builder /plugin /tmp/seismograph-plugin
RUN npm install --no-audit --no-fund /tmp/seismograph-plugin

# Patch MainPreset.js to register both plugin classes (idempotent — safe on
# rebuilds because the script aborts if @seismograph is already imported).
COPY docker/superset/register-plugins.js /tmp/register-plugins.js
RUN node /tmp/register-plugins.js

# Run Apache's own production build. Output goes to /src/superset/static/assets.
# NODE_OPTIONS is set inside the script itself; do not override.
RUN npm run build

# --- Stage 3: final runtime image, frontend assets swapped in ----------------
FROM apache/superset:${SUPERSET_VERSION}

USER root

# Replace the bundled assets with our rebuilt frontend (which contains the
# two custom plugins compiled in via MainPreset.js).
RUN rm -rf /app/superset/static/assets
COPY --from=superset-frontend-builder /src/superset/static/assets /app/superset/static/assets
RUN chown -R superset:superset /app/superset/static/assets

# Seismograph init + config. The init script bootstraps the metadata DB,
# the admin user, and the auto-registered "Seismograph" database connection.
COPY docker/superset/superset_config.py /app/pythonpath/superset_config.py
COPY docker/superset/superset-init.sh /app/superset-init.sh
RUN chmod +x /app/superset-init.sh

# psql client is needed by superset-init.sh to bootstrap the metadata DB.
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client \
 && rm -rf /var/lib/apt/lists/*

USER superset

ENTRYPOINT ["/app/superset-init.sh"]
