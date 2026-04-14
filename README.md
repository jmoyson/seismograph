# Seismograph

Real-time earthquake monitoring built to demonstrate **Vertical Slice Architecture** on a small but real event-driven system.

The USGS publishes a worldwide earthquake feed every few minutes. This app polls it, stores events in PostgreSQL, pushes updates to a React 3D globe via Server-Sent Events, and exposes the data to Apache Superset for analytics — all behind clean architectural boundaries enforced mechanically.

[![CI](https://github.com/jmoyson/seismograph/actions/workflows/ci.yml/badge.svg)](https://github.com/jmoyson/seismograph/actions/workflows/ci.yml)

## How it works

```
┌─────────────┐    every 2 min    ┌──────────────┐    @OnEvent     ┌──────────────────┐
│  USGS feed  │ ────────────────▶ │ sync slice   │ ──────────────▶ │ alert slice      │
│  (GeoJSON)  │   BullMQ job      │ + processor  │  earthquakes    │ (logs M ≥ 6.0)   │
└─────────────┘                   └──────┬───────┘  .synced        └──────────────────┘
                                         │
                                         │ upsert
                                         ▼
                                  ┌──────────────┐
                                  │  PostgreSQL  │
                                  └──────┬───────┘
                                         │
                  ┌──────────────────────┼──────────────────────────┐
                  │                      │                          │
                  ▼                      ▼                          ▼
         ┌──────────────┐       ┌────────────────┐         ┌───────────────────┐
         │ list/get/    │       │ SSE stream     │         │ Superset          │
         │ statistics   │──────▶│ (one per       │         │ (custom plugins   │
         │ (REST API)   │       │  client)       │         │  on the same DB)  │
         └──────┬───────┘       └────────┬───────┘         └───────────────────┘
                │                        │
                └────────────┬───────────┘
                             ▼
                   ┌────────────────────┐
                   │ React + Vite       │
                   │ react-globe.gl     │
                   └────────────────────┘
```

Each box on the backend is a **slice** — a self-contained NestJS module that owns its controller, service, DTO, tests, and module wiring. **Slices never import from each other.** When they need to communicate, they emit events. This rule is enforced by `dependency-cruiser` in CI.

→ See [`docs/dependency-graph.svg`](docs/dependency-graph.svg) for the live graph.

## Repo structure

```
seismograph/
├── apps/
│   ├── api/               NestJS backend (Vertical Slice Architecture)
│   │   ├── src/features/  one folder per slice, fully self-contained
│   │   └── src/shared/    only what 3+ slices need (database, events, queue)
│   ├── web/               React 19 + Vite + react-globe.gl
│   │   ├── src/features/  one folder per UI feature, same isolation rule
│   │   └── src/hooks/     shared hooks (useEarthquakes, useSSE, useStatistics)
│   └── superset-plugins/  custom Apache Superset visualizations
│       ├── SeismoGlobePlugin/
│       └── MagnitudePulsePlugin/
├── packages/
│   └── shared/            @seismograph/shared — TS types used by all 3 apps
├── docs/
│   ├── adr/               7 Architecture Decision Records
│   ├── superpowers/       design specs + implementation plans
│   └── dependency-graph.svg
├── .claude/
│   ├── settings.json      Claude Code session-start hook
│   └── skills/            project-specific Claude Code skills
└── CLAUDE.md              project-wide context for Claude Code
```

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend | NestJS 11, Prisma 7, PostgreSQL, BullMQ, Redis, EventEmitter2, Server-Sent Events |
| Frontend | React 19, Vite, TypeScript, TanStack Query, Axios, react-globe.gl (Three.js) |
| Analytics | Apache Superset with custom plugins (`@superset-ui/core`) |
| Tests | Jest + Testcontainers (real ephemeral Postgres, no Prisma mocks) |
| Tooling | pnpm 10 workspaces, dependency-cruiser, OrbStack, GitHub Actions |
| Infra | Docker, Dokploy on Hetzner |

→ See [`docs/adr/`](docs/adr/) for the *why* behind each choice.

## The golden rule

A slice in `apps/api/src/features/<slice>/` **MUST NEVER** import from another slice.
A feature in `apps/web/src/features/<feature>/` **MUST NEVER** import from another feature.

Allowed imports from inside a slice/feature:

1. npm packages
2. `../../shared/*` (local shared code)
3. `@seismograph/shared` (cross-app types)
4. Other files in the same slice/feature

If you think you need a cross-slice import, the answer is one of:

- **Move the shared piece** to `shared/` (if 3+ slices need it)
- **Emit an event** via `EventEmitter2` and react to it in the other slice — see `apps/api/src/features/alert-earthquakes/` for the reference pattern

This is enforced mechanically by `pnpm check:slices` in CI. There is no way to merge a violation.

## Quick start

```bash
# Prerequisites (macOS)
brew install orbstack graphviz

# Install + run
pnpm install
pnpm dev                  # api on :3000, web on :5173

# In another terminal
pnpm test                 # unit + integration (boots a real Postgres via Testcontainers)
pnpm check:slices         # verify no slice violates the golden rule
```

That's it. The API will boot, do an initial USGS sync on startup, and start polling every 2 minutes. The web UI shows live data on a 3D globe.

## Available commands

```bash
pnpm dev                  # api + web in parallel
pnpm dev:api              # NestJS only
pnpm dev:web              # Vite only
pnpm build                # build both apps
pnpm test                 # all tests
pnpm test:integration     # integration tests only
pnpm check:slices         # dependency-cruiser slice isolation
pnpm graph:slices         # regenerate docs/dependency-graph.svg
pnpm lint                 # lint both apps
```

## Development with Claude Code (AI-first workflow)

This repo is designed so a junior dev can ship a feature on day 1 with Claude Code. All architectural conventions are encoded as **native Claude Code skills** that handle the boilerplate while enforcing the golden rule.

### One-time setup

Install the [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers) for brainstorming, TDD, debugging, and plan-execution workflows. A session-start hook will remind you if it's missing.

```bash
claude plugins add @anthropic/claude-code-superpowers
```

### The 4 skills

| Command | What it does |
|---------|-------------|
| `/onboard` | Personalized codebase tour tailored to your role (backend / frontend / Superset / full-stack) |
| `/new <description>` | Generate a complete feature across all impacted layers — natural language in, working code out |
| `/new-plugin <description>` | Generate a custom Superset visualization plugin |
| `/check` | Compile, slice-isolation, tests, and convention audit with project-specific remediation |

### Examples

**Day 1 — onboarding.** Open Claude Code in this repo and type:

```
/onboard
```

Claude asks your role, then walks you through the relevant slices/features with live code, explains the golden rule, points to the ADRs you should read, and shows you how to run the dev server.

**Adding a feature in natural language.** Want to build a ranking of most active seismic regions? Just say:

```
/new ranking of most active seismic regions, top 10 by earthquake count
```

Claude will:

1. Ask which layers to touch (backend slice, frontend panel, shared types — or just one)
2. Show a plan: every file it will create or modify, grouped by layer
3. Wait for your approval
4. Generate `packages/shared/src/types.ts` (add `RegionRanking`), `apps/api/src/features/get-region-ranking/` (5 files following the query-with-service pattern), `apps/web/src/features/ranking/RankingPanel.tsx` + `useRegionRanking` hook
5. Wire the new module into `app.module.ts` and the panel into `App.tsx`
6. Run `pnpm check:slices && pnpm build && pnpm test` and report results

**Adding a Superset visualization.** Want a depth-vs-magnitude scatter chart for analysts?

```
/new-plugin depth vs magnitude scatter chart
```

Claude generates the 6-file plugin scaffold (`index.ts`, `buildQuery.ts`, `controlPanel.ts`, `transformProps.ts`, `<Name>.tsx`, `types.ts`), registers it in the plugin index, and runs `pnpm --filter @seismograph/superset-plugins build`.

**Verifying your work before pushing.**

```
/check
```

Claude runs all the CI checks locally and explains *why* anything fails, with project-specific remediation (e.g. "you imported from another slice — move this to `shared/` or use `EventEmitter2` instead").

### Why this matters

Without skills: every dev needs to read all the docs, intuit the conventions, and hope they don't break the golden rule.

With skills: any dev opens Claude Code, describes what they want, and the generated code respects the conventions on the first try. The architecture is no longer in someone's head — it's versioned, executable, and reproducible.

→ See `.claude/skills/` for the skill definitions.
→ See [`docs/superpowers/specs/2026-04-13-skills-system-design.md`](docs/superpowers/specs/2026-04-13-skills-system-design.md) for the design rationale.

## Where to learn more

| Topic | Read |
|-------|------|
| **Why this architecture?** | [`docs/adr/`](docs/adr/) — 7 Architecture Decision Records |
| **Project conventions for any contributor** | [`CLAUDE.md`](CLAUDE.md) (loaded automatically by Claude Code) |
| **Backend conventions in detail** | [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| **Frontend conventions in detail** | [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) |
| **Shared types** | [`packages/shared/src/types.ts`](packages/shared/src/types.ts) |
| **Slice dependency graph** | [`docs/dependency-graph.svg`](docs/dependency-graph.svg) (regenerate with `pnpm graph:slices`) |
| **Past architectural passes** | [`docs/superpowers/specs/`](docs/superpowers/specs/) and [`docs/superpowers/plans/`](docs/superpowers/plans/) |

## Contributing

1. Branch from `main`
2. Use `/new` (or `/new-plugin`) to scaffold the feature
3. Run `/check` before committing
4. Open a PR — CI runs `pnpm check:slices`, `pnpm build`, `pnpm test`, `pnpm lint`. All four must pass to merge.
5. Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`)
