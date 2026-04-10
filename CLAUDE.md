# Seismograph — Monorepo Instructions

Seismograph polls the USGS GeoJSON feed every 2 minutes, stores earthquakes in PostgreSQL, and pushes updates to a React globe UI via Server-Sent Events. Built to demonstrate Vertical Slice Architecture on a small-but-real event-driven system.

## Repo layout

- `apps/api/` — NestJS backend (Vertical Slice Architecture)
- `apps/web/` — React 19 + Vite + `react-globe.gl`
- `packages/shared/` — `@seismograph/shared`, TypeScript types only (no build step)
- `docs/adr/` — Architecture Decision Records (read these to understand WHY the code is shaped the way it is)
- `docs/superpowers/specs/` — Design specs for architectural passes
- `docs/superpowers/plans/` — Implementation plans for those specs
- `docs/dependency-graph.svg` — Auto-generated slice isolation graph (regenerate with `pnpm graph:slices`)

## Package manager

`pnpm` 10+ only. NEVER `npm`, NEVER `yarn`. Workspaces are defined in `pnpm-workspace.yaml`.

## Commands (run from repo root unless noted)

```bash
pnpm install                # install everything
pnpm dev                    # run api + web in parallel
pnpm dev:api                # NestJS only
pnpm dev:web                # Vite only
pnpm build                  # build both apps
pnpm test                   # run unit + integration tests (requires OrbStack/Docker)
pnpm test:integration       # integration tests only
pnpm check:slices           # dependency-cruiser: verify slice isolation
pnpm graph:slices           # regenerate docs/dependency-graph.svg
pnpm lint                   # lint both apps
```

## THE golden rule — slice isolation

**A slice in `apps/api/src/features/<slice>/` MUST NEVER import from another slice.**
**A feature in `apps/web/src/features/<feature>/` MUST NEVER import from another feature.**

Allowed imports from inside a slice/feature:
1. npm packages
2. `../../shared/*` (local shared code)
3. `@seismograph/shared` (cross-app types)
4. Other files in the same slice/feature

This rule is enforced mechanically by `pnpm check:slices` (dependency-cruiser) in CI.

If you think you need a cross-slice import, the answer is one of:
- Move the shared piece to `shared/`
- Emit an event via `EventEmitter2` and react to it in the other slice (see `apps/api/src/features/alert-earthquakes/` for the reference pattern)

## Where to find more context

- Backend conventions → `@apps/api/CLAUDE.md`
- Frontend conventions → `@apps/web/CLAUDE.md`
- Architectural decisions → `docs/adr/`
- Cross-app types → `packages/shared/src/types.ts`

## Commit conventions

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`.
One commit per logical change. Keep the git log readable.

## Adding a new slice or feature

- Backend: follow the "How to add a slice" checklist in `apps/api/CLAUDE.md`
- Frontend: follow the "How to add a feature" checklist in `apps/web/CLAUDE.md`

## Extension pattern: nested CLAUDE.md

When a slice grows past ~5 files or gains non-trivial internal invariants (ordering rules, idempotency guarantees, non-obvious error semantics), add a `CLAUDE.md` inside the slice itself (e.g., `apps/api/src/features/sync-earthquakes/CLAUDE.md`). Claude Code automatically loads the most specific file for the directory you're working in.
