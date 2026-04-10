# Seismograph

Real-time earthquake monitoring: USGS feed → PostgreSQL → Server-Sent Events → 3D globe.

[![CI](https://github.com/jmoyson/seismograph/actions/workflows/ci.yml/badge.svg)](https://github.com/jmoyson/seismograph/actions/workflows/ci.yml)

## Structure

- `apps/api/` — NestJS backend (Vertical Slice Architecture)
- `apps/web/` — React + Vite + `react-globe.gl`
- `packages/shared/` — shared TypeScript types

## Documentation

- **For humans**: start with the [docs/adr/](docs/adr/) directory for architectural decisions
- **For AI agents**: see [CLAUDE.md](CLAUDE.md) (root, auto-loaded by Claude Code)
- **Design specs**: [docs/superpowers/specs/](docs/superpowers/specs/)
- **Implementation plans**: [docs/superpowers/plans/](docs/superpowers/plans/)
- **Slice dependency graph**: [docs/dependency-graph.svg](docs/dependency-graph.svg) — auto-generated, run `pnpm graph:slices` to refresh

## Quick start

```bash
brew install orbstack graphviz  # dev prerequisites for tests and graph generation
pnpm install
pnpm dev
```

## Commands

```bash
pnpm test              # unit + integration tests (requires OrbStack)
pnpm check:slices      # verify no cross-slice imports
pnpm graph:slices      # regenerate docs/dependency-graph.svg
pnpm build             # build both apps
```
