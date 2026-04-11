# Custom Apache Superset image

This directory builds a custom `apache/superset` image with the
`@seismograph/superset-plugins` package compiled into the frontend bundle.

## How it deploys

Webpack needs ~8 GB of heap to rebuild the Superset frontend, which is more
than our shared 8 GB Dokploy host can spare without OOM-killing prod
containers. So we **never build on Dokploy**:

```
GitHub Actions runner (16 GB)
       │
       │  docker build (10–15 min cold, 3–5 min cached)
       ▼
ghcr.io/jmoyson/seismograph-superset:latest
       │
       │  docker compose pull (~30 s)
       ▼
       Dokploy host
```

## What lives here

| File | Role |
| --- | --- |
| `Dockerfile` | 3-stage build: plugin → Superset frontend rebuild → runtime image. |
| `register-plugins.js` | Patches Superset's `MainPreset.js` to import and register both plugin classes. Idempotent. |
| `superset_config.py` | Superset config — points the metadata DB at our Postgres, Redis cache on db index 1, CORS + embedding enabled. |
| `superset-init.sh` | Boot script — creates the `superset_meta` database, runs `superset db upgrade`, ensures the admin user, auto-registers the "Seismograph" database connection, then `exec superset run`. |

## One-time GHCR setup

After the **first** successful run of `.github/workflows/build-superset-image.yml`,
the package is published as **private** by default. Make it public so Dokploy
(and anyone else) can pull without auth:

1. https://github.com/users/jmoyson/packages/container/seismograph-superset/settings
2. Scroll to **Danger Zone** → **Change visibility** → **Public**
3. Confirm

That step is once per package, not per build.

## Triggering a rebuild

The workflow runs automatically on `push` to `main` when any of these change:

- `apps/superset-plugins/**`
- `docker/superset/**`
- `.github/workflows/build-superset-image.yml`

To rebuild manually (e.g. after bumping the Superset version):

```
gh workflow run "Build Superset image" \
  -f superset_version=6.0.0
```

Or from the **Actions** tab → "Build Superset image" → **Run workflow**.

## Bumping the Superset version

The runtime image tag, the cloned source tag, and the published frontend
chunks **must all be the same version** — the rebuilt JS chunks reference
Python templates and routes that drift between versions.

To bump from `6.0.0` → `6.x.y`:

1. Update `ARG SUPERSET_VERSION=…` in `Dockerfile`.
2. Update the `default:` of `superset_version` in `.github/workflows/build-superset-image.yml`.
3. Confirm `apache/superset:6.x.y` exists on Docker Hub.
4. Confirm the git tag `6.x.y` exists in `apache/superset`.
5. Spot-check that `superset-frontend/src/visualizations/presets/MainPreset.js`
   still exists at that tag, and that `register-plugins.js` still produces
   a valid file when run against it.
6. Push to `main` (or run the workflow manually) and watch the build.

## Local rebuild (rarely needed)

The compose file keeps `build:` next to `image:` as a fallback so a beefy
laptop can still rebuild the image without going through GHA:

```
docker compose build superset
docker compose up -d superset
```

This needs the laptop's Docker daemon to have ≥10 GB of RAM allocated
(Docker Desktop default is 4 GB — won't work). Mostly useful when iterating
on `register-plugins.js` against a new Superset tag.
