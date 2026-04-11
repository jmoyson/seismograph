# @seismograph/superset-plugins

Custom Apache Superset visualization plugins for Seismograph.

## Plugins

- **SeismoGlobePlugin** — reusable 3D globe for any dataset with latitude/longitude + metric columns.
- **MagnitudePulsePlugin** — animated timeline of pulsing circles, sized and colored by metric columns.

Both plugins are dataset-agnostic — they work with any Superset dataset that exposes the right columns, not only earthquakes.

## Status

Scaffolding only. Real plugin classes land in Partie 7 of the Superset integration plan (`docs/superpowers/`).

## Build

```bash
cd apps/superset-plugins
npm install
npm run build
```

> We build this package with plain `npm` (not `pnpm`) because it is consumed by the Superset Docker image, which also uses `npm`. Keeping the same tool avoids lockfile mismatches inside the Docker build.

## Integration

The plugins are compiled into the Superset frontend at build time by `docker/superset/Dockerfile`. They cannot be loaded at runtime — Superset plugins must be bundled into the frontend.
