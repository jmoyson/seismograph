# Seismograph Architect Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add architectural documentation (CLAUDE.md + ADRs), mechanical slice isolation enforcement (dependency-cruiser), integration tests proving slice independence (Testcontainers + Jest), a new event-driven slice (`alert-earthquakes`), and a CI pipeline — on top of the existing working Seismograph MVP.

**Architecture:** 3 hierarchical CLAUDE.md files (root, api, web) + 7 Nygard-format ADRs + dependency-cruiser config + shared Testcontainers helper + per-slice integration tests + new listener-based slice + GitHub Actions CI. Everything is additive: no existing slice behavior is modified (except the `globe.utils` cross-feature violation, which is corrected).

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 17, BullMQ, EventEmitter2, Jest 30, Testcontainers (`@testcontainers/postgresql`), OrbStack (local Docker daemon), dependency-cruiser, GitHub Actions with `services: postgres:17-alpine`, Node 22 LTS.

**Source spec:** `docs/superpowers/specs/2026-04-10-seismograph-architect-pass-design.md` (commit `890a3bb`).

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Root monorepo instructions for Claude Code |
| `apps/api/CLAUDE.md` | Backend conventions (VSA, Prisma, BullMQ, SSE, test rules, how-to-add-a-slice template) |
| `apps/web/CLAUDE.md` | Frontend conventions (feature isolation, API client, SSE hook) |
| `docs/adr/001-vertical-slice-over-layers.md` | ADR 001 |
| `docs/adr/002-sse-over-websocket.md` | ADR 002 |
| `docs/adr/003-bullmq-over-direct-cron.md` | ADR 003 |
| `docs/adr/004-pnpm-workspaces-over-turborepo.md` | ADR 004 |
| `docs/adr/005-usgs-feed-polling-pattern.md` | ADR 005 |
| `docs/adr/006-testcontainers-orbstack-for-integration-tests.md` | ADR 006 |
| `docs/adr/007-dependency-cruiser-for-slice-isolation.md` | ADR 007 |
| `apps/web/src/shared/utils/formatting.ts` | Shared web utilities (`getColorByMagnitude`, `timeAgo`) extracted from `globe.utils.ts` |
| `.dependency-cruiser.cjs` | dependency-cruiser config (3 rules: no-cross-slice-api, no-cross-feature-web, no-circular) |
| `apps/api/test/helpers/test-db.ts` | Shared Testcontainers + Prisma test DB helper, with production guardrail |
| `apps/api/test/jest-integration.json` | Separate Jest config for integration tests (longer timeout, global setup) |
| `apps/api/test/global-setup.ts` | Jest global setup: boots the shared PG container once |
| `apps/api/test/global-teardown.ts` | Jest global teardown: stops the container (skipped when `withReuse` is active) |
| `apps/api/src/features/list-earthquakes/list-earthquakes.integration.spec.ts` | Integration test for `list-earthquakes` slice |
| `apps/api/src/features/get-earthquake/get-earthquake.integration.spec.ts` | Integration test for `get-earthquake` slice |
| `apps/api/src/features/get-statistics/get-statistics.integration.spec.ts` | Integration test for `get-statistics` slice |
| `apps/api/src/features/sync-earthquakes/sync-earthquakes.integration.spec.ts` | Integration test for `sync-earthquakes` slice (mocks `UsgsFeedClient`) |
| `apps/api/src/features/alert-earthquakes/alert-earthquakes.module.ts` | New slice module |
| `apps/api/src/features/alert-earthquakes/alert-earthquakes.service.ts` | New slice service (filter + log) |
| `apps/api/src/features/alert-earthquakes/alert-earthquakes.listener.ts` | New slice listener (`@OnEvent('earthquakes.synced')`) |
| `apps/api/src/features/alert-earthquakes/alert-earthquakes.integration.spec.ts` | Integration test for the new slice |
| `.github/workflows/ci.yml` | GitHub Actions CI (lint / check-slices / test jobs) |

### Files to modify

| Path | Change |
|---|---|
| `package.json` (root) | Add `check:slices`, `graph:slices`, `test:integration` scripts; add `dependency-cruiser` as dev dep; add `test`, `lint` passthroughs |
| `apps/api/package.json` | Add `@testcontainers/postgresql`, `testcontainers`, `jest-mock-extended` as dev deps; add `test:integration` script |
| `apps/web/src/features/earthquake-list/EarthquakeItem.tsx:1` | Replace import path `../globe/globe.utils` → `../../shared/utils/formatting` |
| `apps/web/src/features/earthquake-detail/EarthquakeDetail.tsx:1` | Replace import path `../globe/globe.utils` → `../../shared/utils/formatting` |
| `apps/web/src/features/globe/globe.utils.ts` | Remove `getColorByMagnitude` and `timeAgo` (moved to shared); keep `getSizeByMagnitude` and `getAltByMagnitude` which are globe-specific |
| `apps/web/src/features/globe/Globe.tsx:3` | Update import to get `getColorByMagnitude` from shared and the two remaining utils from `./globe.utils` |
| `apps/api/src/app.module.ts` | Add `AlertEarthquakesModule` to `imports` |
| `README.md` (root, if exists) | Add links to CLAUDE.md, docs/adr/, docs/dependency-graph.svg, CI badge |

---

## Task 1: Write the root `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create the root CLAUDE.md**

Write file `CLAUDE.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md with monorepo conventions"
```

---

## Task 2: Write `apps/api/CLAUDE.md`

**Files:**
- Create: `apps/api/CLAUDE.md`

- [ ] **Step 1: Create the api CLAUDE.md**

Write file `apps/api/CLAUDE.md`:

````markdown
# apps/api — Backend Instructions

NestJS backend organized in Vertical Slices. Each feature lives in its own folder under `src/features/` and is self-contained.

## Stack

NestJS 11 · Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`) · PostgreSQL · BullMQ (`@nestjs/bullmq`) · EventEmitter2 (`@nestjs/event-emitter`) · Server-Sent Events (`@Sse` + RxJS)

## Vertical slice structure

Each slice is a folder in `src/features/<slice-name>/`. A slice may contain:

```
<slice-name>/
├── <slice-name>.module.ts          # ALWAYS
├── <slice-name>.controller.ts      # if it exposes an HTTP endpoint
├── <slice-name>.service.ts         # if it has business logic (see Rule A)
├── <slice-name>.dto.ts             # if it validates input
├── <slice-name>.scheduler.ts       # if it runs on a cron
├── <slice-name>.processor.ts       # if it consumes a BullMQ queue
├── <slice-name>.listener.ts        # if it reacts to EventEmitter2 events
├── <slice-name>.integration.spec.ts  # ALWAYS (once the integration test helper exists)
└── <other-supporting-files>.ts     # e.g. usgs-feed.client.ts
```

All files use `kebab-case.<type>.ts`. Exports use `PascalCase` for classes and `camelCase` for functions.

## Rule A — Service vs. direct PrismaService injection

**If a use case is a single Prisma call with no business logic, inject `PrismaService` directly into the controller. As soon as there is filtering, aggregation, transformation, or a side effect (event, queue, log), create a `.service.ts`.**

Rationale: a service exists to hold business logic. Creating one for a pass-through `findUnique` is boilerplate without value.

**Concrete examples from this codebase:**

- `get-earthquake/` — controller injects `PrismaService` directly, calls `findUnique`, throws 404 if missing. No service. Correct.
- `list-earthquakes/` — service filters by magnitude range, days, sort order. Controller delegates. Correct.
- `get-statistics/` — service runs aggregation SQL. Controller delegates. Correct.

## Shared modules (`src/shared/`)

- `database/` — `PrismaService` extends `PrismaClient` with the `PrismaPg` adapter, global module. Inject with `private readonly prisma: PrismaService`. **NEVER** instantiate `new PrismaClient()`.
- `events/` — `EventEmitterModule.forRoot()`, global. Inject `EventEmitter2` or use `@OnEvent('event.name')` on a method.
- `queue/` — BullMQ root config, global. Per-slice queues are registered via `BullModule.registerQueue({ name: 'x' })` in the slice module.

## BullMQ pattern

Three files when using a queue:
- `.scheduler.ts` — injects `@InjectQueue('queue-name')`, calls `queue.add()` on a NestJS `@Cron()`
- `.processor.ts` — extends `WorkerHost`, decorated with `@Processor('queue-name')`, processes jobs
- `.service.ts` — the actual business logic

**Rule:** the processor calls ONLY its own slice's service. It never reaches into another slice.

Retry/backoff config lives in the `queue.add()` call, not in the processor.

## SSE pattern (see `earthquake-events/`)

- Controller maintains a `Set<Subject<Payload>>` of connected clients
- `@Sse('path')` method creates a new `Subject`, adds it to the set, returns the merged observable with a `interval(30_000)` heartbeat
- `@OnEvent('event.name')` method pushes the payload into every Subject in the set
- On subscription completion, the Subject is removed from the set

## Prisma pattern

- Schema is the source of truth: `apps/api/prisma/schema.prisma`
- Types come from `@prisma/client`
- Use the Prisma client API (`findMany`, `upsert`, etc.). Raw SQL (`$queryRaw`) is only for queries Prisma cannot express (e.g., the distribution CASE in `get-statistics`).
- `pnpm --filter api prisma db push` in dev, `prisma migrate` for real migrations.

## Cross-slice communication

**Slices MUST NOT import each other.** If slice A needs to react to something that happens in slice B, slice A subscribes to an event emitted by B via `EventEmitter2`.

Reference pattern: `alert-earthquakes` listens to `earthquakes.synced` (emitted by `sync-earthquakes`) and logs high-magnitude events. Neither slice imports the other.

## Test conventions

Every slice has `<slice-name>.integration.spec.ts` next to its source. Integration tests:

1. Use `createTestingModule()` from `apps/api/test/helpers/test-db.ts`, which mounts ONLY the target module + global modules (`DatabaseModule`, `EventsModule`, `QueueModule`). It NEVER imports `AppModule` or other slices.
2. Run against a real ephemeral Postgres via Testcontainers (local) or GitHub Actions `services: postgres` (CI). Mode is auto-detected via `process.env.CI`.
3. Mock ONLY external boundaries (e.g., `UsgsFeedClient`, which makes HTTP calls to USGS). **NEVER** mock `PrismaService`.
4. Call `cleanDb()` in `beforeEach` to TRUNCATE all tables.

The production guardrail in `test-db.ts` throws if `DATABASE_URL` matches `/prod|dokploy|\.app\b/i`.

## How to add a slice

To add a slice `x-y` (example: `alert-earthquakes`):

1. Create directory `apps/api/src/features/x-y/`.
2. Create `x-y.module.ts`. Add providers and controllers as needed.
3. Create the files you need, per the structure above. Apply Rule A for the service decision.
4. If the slice reacts to an event from another slice, create `x-y.listener.ts` with `@OnEvent('event.name')` that delegates to the service.
5. Add `XYModule` to `AppModule.imports` in `apps/api/src/app.module.ts`.
6. Create `x-y.integration.spec.ts`. Mount only `XYModule` via `createTestingModule()`. Cover the principal use case.
7. Run:
   ```bash
   pnpm check:slices
   pnpm test
   ```
   Both must pass.
8. Commit with a message like `feat(api): add x-y slice`.

## DON'Ts

- **NEVER** import a `.service.ts` (or any file) from another slice.
- **NEVER** instantiate `new PrismaClient()` directly. Inject `PrismaService`.
- **NEVER** call USGS (or any external API) directly from a processor or service. Use a dedicated `*.client.ts` in the same slice.
- **NEVER** mock `PrismaService` in tests. Use the real test DB via `test-db.ts` helpers.
- **NEVER** import `AppModule` in an integration test. Mount only the slice module.
- **NEVER** push directly to `main` — always via PR so CI guardrails run.
````

- [ ] **Step 2: Commit**

```bash
git add apps/api/CLAUDE.md
git commit -m "docs(api): add backend CLAUDE.md with VSA conventions"
```

---

## Task 3: Write `apps/web/CLAUDE.md`

**Files:**
- Create: `apps/web/CLAUDE.md`

- [ ] **Step 1: Create the web CLAUDE.md**

Write file `apps/web/CLAUDE.md`:

````markdown
# apps/web — Frontend Instructions

React SPA built with Vite. The backend is NestJS at `apps/api/` (see `apps/api/CLAUDE.md` for backend conventions).

## Stack

Vite · React 19 · TypeScript · TanStack Query (`@tanstack/react-query`) · Axios · `react-globe.gl` (Three.js wrapper)

## Folder structure

```
apps/web/src/
├── App.tsx
├── main.tsx
├── api/
│   └── client.ts                 # Axios instance (single source of truth for API base URL)
├── features/                     # UI features (vertical slices, same isolation rule as backend)
│   ├── earthquake-list/
│   ├── earthquake-detail/
│   ├── globe/
│   └── statistics/
├── hooks/                        # React hooks shared across features (useEarthquakes, useSSE, useStatistics)
└── shared/                       # Pure utilities, presentational primitives, constants
    └── utils/
        └── formatting.ts         # getColorByMagnitude, timeAgo — consumed by multiple features
```

## Feature isolation rule

**A feature in `src/features/<feature>/` MUST NEVER import from another feature.**

Allowed imports from inside a feature:
1. npm packages
2. `../../shared/*` (pure utilities / presentational primitives)
3. `../../hooks/*` (shared React hooks)
4. `../../api/client` (the single Axios instance)
5. `@seismograph/shared` (cross-app types)
6. Other files in the same feature

This rule is enforced mechanically by `pnpm check:slices` (run from repo root) via dependency-cruiser.

If a utility is used by more than one feature, it belongs in `src/shared/utils/`, NOT in one of the features.

## API consumption pattern

- **Always** import the Axios instance from `src/api/client.ts`. Never create your own Axios instance in a feature.
- **Always** wrap API calls in a hook under `src/hooks/` that uses TanStack Query. Features consume the hook, not Axios directly.
- **Always** import API types from `@seismograph/shared`. Never redefine `Earthquake`, `EarthquakeStats`, etc. inside `apps/web`.

## SSE pattern

There is exactly one consumer of `EventSource` in the codebase: `src/hooks/useSSE.ts`. Features consume the hook. Features never create their own `EventSource`.

## How to add a feature

To add a feature `x-y`:

1. Create directory `src/features/x-y/`.
2. Add the React components for the feature.
3. If the feature needs API data, add a hook in `src/hooks/useX.ts` (or reuse an existing one) that uses TanStack Query and the shared Axios client.
4. If the feature needs a utility that might be used elsewhere later, put it in `src/shared/utils/`, not in the feature.
5. Import the feature into `App.tsx`.
6. Run `pnpm check:slices` from the repo root — must pass.
7. Commit with a message like `feat(web): add x-y feature`.

## DON'Ts

- **NEVER** redefine API types that already exist in `@seismograph/shared`.
- **NEVER** create an `axios` instance inside a feature. Use `src/api/client.ts`.
- **NEVER** instantiate `EventSource` outside `src/hooks/useSSE.ts`.
- **NEVER** import from `../<other-feature>/`. If you need something from another feature, it belongs in `shared/` or `hooks/`.
````

- [ ] **Step 2: Commit**

```bash
git add apps/web/CLAUDE.md
git commit -m "docs(web): add frontend CLAUDE.md with feature isolation rules"
```

---

## Task 4: Write the 7 ADRs

**Files:**
- Create: `docs/adr/001-vertical-slice-over-layers.md`
- Create: `docs/adr/002-sse-over-websocket.md`
- Create: `docs/adr/003-bullmq-over-direct-cron.md`
- Create: `docs/adr/004-pnpm-workspaces-over-turborepo.md`
- Create: `docs/adr/005-usgs-feed-polling-pattern.md`
- Create: `docs/adr/006-testcontainers-orbstack-for-integration-tests.md`
- Create: `docs/adr/007-dependency-cruiser-for-slice-isolation.md`

- [ ] **Step 1: Create `docs/adr/` directory**

```bash
mkdir -p docs/adr
```

- [ ] **Step 2: Write ADR 001**

Write file `docs/adr/001-vertical-slice-over-layers.md`:

```markdown
# ADR 001 — Vertical Slice Architecture over Layered Architecture

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

A Layered Architecture (controllers/services/repositories folders) centralises concerns horizontally. As a project grows, shared services become God Services, and the coupling between unrelated features becomes implicit via shared folders. A developer removing a feature has to edit files scattered across five horizontal layers.

## Decision

Organize the backend by feature: each use case lives in its own folder under `apps/api/src/features/<slice>/`, self-contained, with its own module, controller (if any), service (if any), DTOs, and tests. Slices MUST NOT import from each other — cross-slice communication goes through events or shared infrastructure modules.

## Consequences

**Positive:**
- Complexity scales with the feature, not with the codebase as a whole
- Removing a feature is deleting one folder
- A new developer can understand a single slice without reading the whole backend
- Isolation is testable: each slice has an integration test that mounts only its own module

**Negative:**
- Small duplication is acceptable and expected (YAGNI on premature abstractions)
- Developers used to layered architectures will initially look for a non-existent `services/` folder

**Revisit if:**
- The number of slices exceeds ~30 AND genuine cross-slice duplication starts accumulating. At that point, evaluate extracting domain primitives into `shared/` or splitting into bounded contexts.
```

- [ ] **Step 3: Write ADR 002**

Write file `docs/adr/002-sse-over-websocket.md`:

```markdown
# ADR 002 — Server-Sent Events over WebSocket

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The web client needs to receive earthquake updates from the backend as soon as a sync completes. The communication is strictly unidirectional: server → client. WebSocket supports bidirectional messaging, but we would not use the client → server direction.

## Decision

Use Server-Sent Events (SSE) via NestJS `@Sse()` and the browser's native `EventSource`. One SSE endpoint, one hook on the web side, done.

## Consequences

**Positive:**
- Native `EventSource` reconnection — no client-side reconnect logic to write
- HTTP/1.1 standard, passes through firewalls and corporate proxies
- Zero additional dependencies on either side
- Simple to test: the backend just pushes to `Subject`s, the test subscribes to the Subject directly

**Negative:**
- One TCP connection per client (WebSocket can multiplex)
- No binary frame support (not needed here)
- Some legacy browsers have SSE quirks (not a concern in 2026)

**Revisit if:**
- We need a bidirectional channel (chat, collaborative editing, presence) — at that point, a single WebSocket connection replaces both SSE and the equivalent REST endpoints.
```

- [ ] **Step 4: Write ADR 003**

Write file `docs/adr/003-bullmq-over-direct-cron.md`:

```markdown
# ADR 003 — BullMQ over direct cron

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The USGS sync runs every 2 minutes. A naive approach is a `@Cron()` that calls the sync service directly. But network failures, USGS rate limits, and transient errors are inevitable, and the sync must be observable and retryable.

## Decision

Use BullMQ as an intermediary. The scheduler (`@Cron()`) enqueues a job; a dedicated processor consumes the queue and calls the service. Retry, backoff, and persistence live in the queue configuration.

## Consequences

**Positive:**
- Retry with exponential backoff on transient USGS failures (3 attempts, 5s initial delay)
- Jobs persist in Redis — crashes don't lose pending work
- The scheduler is non-blocking: firing a job is instant
- Bull Board (future) can give an observable view of job status
- The producer (scheduler) and consumer (processor) are decoupled in time

**Negative:**
- Adds a Redis dependency to the stack
- One level of indirection: a bug may be in the scheduler, the queue config, the processor, or the service
- Serialization/deserialization overhead for each job (negligible here)

**Revisit if:**
- The sync is the only remaining BullMQ consumer AND Redis is no longer used for anything else. At that point, BullMQ becomes infrastructure-for-one-feature and a direct cron with a retry loop may be enough.
```

- [ ] **Step 5: Write ADR 004**

Write file `docs/adr/004-pnpm-workspaces-over-turborepo.md`:

```markdown
# ADR 004 — pnpm workspaces over Turborepo (not yet)

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

We have a monorepo with two apps (`apps/api`, `apps/web`) and one shared package (`packages/shared`, types only, no build step). Turborepo offers task caching and orchestration across packages. The question is whether it earns its keep at this scale.

## Decision

Use pnpm workspaces alone. Do not add Turborepo.

## Consequences

**Positive:**
- Zero configuration on top of `pnpm-workspace.yaml`
- `@seismograph/shared` is consumed as TypeScript source with no build step — no cache to invalidate
- `pnpm --filter` is enough to run commands on a single app
- Local dev loop is the simplest possible: edit shared types → both apps see them instantly

**Negative:**
- No task caching — a second run of `pnpm build` rebuilds everything
- If we grow to many apps, rebuilds will become noticeably slower

**Revisit if:**
- We reach 4+ apps OR a shared package requires an explicit build (e.g., a compiled UI library) OR CI build time exceeds 5 minutes due to redundant rebuilds.

Note: Turborepo is not inferior — it's premature. The criterion is "do we feel the pain it solves?" Today the answer is no.
```

- [ ] **Step 6: Write ADR 005**

Write file `docs/adr/005-usgs-feed-polling-pattern.md`:

```markdown
# ADR 005 — USGS feed polling pattern

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The USGS Earthquake Hazards Program publishes a GeoJSON feed refreshed every minute. It does not expose a push API, webhooks, or a stream — only periodic HTTP snapshots. We need to surface updates to the web client in near-real-time.

## Decision

Poll the USGS hourly feed every 2 minutes via a BullMQ-scheduled job. The processor upserts earthquakes into Postgres, then emits an `earthquakes.synced` event via `EventEmitter2`. The SSE controller listens for that event and fans it out to connected clients.

## Consequences

**Positive:**
- Clean separation: the polling cadence is set in one place (scheduler), the fan-out logic is independent (SSE controller), the business logic is isolated (service)
- Adding a new consumer of `earthquakes.synced` (e.g., `alert-earthquakes`) requires zero changes to the producer
- Each piece is independently testable
- Upsert-by-id means USGS can re-publish the same event without duplication

**Negative:**
- Latency is bounded below by the polling interval (~2 minutes)
- We pay the cost of fetching even when nothing has changed (USGS responses are small enough to ignore)

**Revisit if:**
- USGS publishes a streaming/webhook endpoint
- Product requires < 10s latency for alerts
```

- [ ] **Step 7: Write ADR 006**

Write file `docs/adr/006-testcontainers-orbstack-for-integration-tests.md`:

```markdown
# ADR 006 — Testcontainers + OrbStack for integration tests

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

Integration tests for each slice must run against a real database to have meaning. Options: mock `PrismaClient`, use `pg-mem`, use an embedded Postgres binary, or use Testcontainers. The dev machine is a Mac mini M1 with 8 GB RAM, so heavyweight Docker stacks are problematic.

## Decision

Use `@testcontainers/postgresql` with the `postgres:17-alpine` image. On macOS, use **OrbStack** as the Docker daemon instead of Docker Desktop. In CI, use GitHub Actions' native `services: postgres:17-alpine` sidecar (Testcontainers is not needed when Docker already provides a running container). Switch between modes via `process.env.CI`.

## Consequences

**Positive:**
- Tests run against real PostgreSQL — same version, same SQL features as production
- `PrismaService` is never mocked, so tests catch real query bugs
- `.withReuse(true)` keeps the test container alive between runs for instant iteration
- OrbStack uses ~200 MB idle vs. 3-4 GB for Docker Desktop — viable on 8 GB RAM
- One environment variable (`CI=true`) switches behavior; test code is the same

**Negative:**
- Requires Docker (OrbStack) on the dev machine
- OrbStack's personal license is free but not commercial — a team with commercial usage would need to switch daemons
- First container boot downloads the alpine image (~80 MB, cached afterwards)

**Revisit if:**
- OrbStack is no longer free for our usage → switch to Colima (Docker-compatible, also lightweight)
- The test suite becomes slow enough that a schema-per-suite strategy is worth the complexity (currently we use a single container + `TRUNCATE` between tests)
```

- [ ] **Step 8: Write ADR 007**

Write file `docs/adr/007-dependency-cruiser-for-slice-isolation.md`:

```markdown
# ADR 007 — dependency-cruiser for slice isolation enforcement

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

Vertical Slice Architecture's central rule is "no cross-slice imports". Left to human discipline alone, this rule is violated at the first moment of fatigue. We need a mechanical check that runs locally and in CI. Options: a bash script parsing imports with regex, `eslint-plugin-boundaries` / `eslint-plugin-import`, or `dependency-cruiser`.

## Decision

Use `dependency-cruiser` with a config at the repo root (`.dependency-cruiser.cjs`). Three rules: `no-cross-slice-api`, `no-cross-feature-web`, `no-circular`. Exposed via `pnpm check:slices`. A second script `pnpm graph:slices` generates an SVG dependency graph to `docs/dependency-graph.svg`.

## Consequences

**Positive:**
- Exact AST-based analysis, not fragile regex — catches dynamic imports, re-exports, path aliases
- Can express declarative rules by path glob
- Generates a visual graph, which is itself a useful architectural artifact
- Runs in under 5 seconds on a repo this size
- Integrates with any CI system — just `pnpm check:slices`

**Negative:**
- An additional tool to learn (rule syntax is dep-cruiser-specific)
- Slightly heavier config than an ESLint rule
- The graph step requires `graphviz` (`brew install graphviz`) on the machine generating it

**Revisit if:**
- ESLint becomes heavy enough in this repo that we want all linting in one tool (ESLint boundaries + no-restricted-paths could replace dep-cruiser's role)
```

- [ ] **Step 9: Verify all 7 ADRs exist and are non-empty**

```bash
ls -la docs/adr/
wc -l docs/adr/*.md
```

Expected: 7 files, each between 20 and 45 lines.

- [ ] **Step 10: Commit**

```bash
git add docs/adr/
git commit -m "docs: add 7 ADRs covering core architectural decisions"
```

---

## Task 5: Fix the `globe.utils` isolation violation

**Files:**
- Create: `apps/web/src/shared/utils/formatting.ts`
- Modify: `apps/web/src/features/globe/globe.utils.ts`
- Modify: `apps/web/src/features/earthquake-list/EarthquakeItem.tsx:1`
- Modify: `apps/web/src/features/earthquake-detail/EarthquakeDetail.tsx:1`
- Modify: `apps/web/src/features/globe/Globe.tsx:3`

Context: `getColorByMagnitude` and `timeAgo` are imported by multiple features, so they must live in `shared/`. `getSizeByMagnitude` and `getAltByMagnitude` are only used inside `globe/`, so they stay where they are.

- [ ] **Step 1: Create `apps/web/src/shared/utils/formatting.ts`**

```bash
mkdir -p apps/web/src/shared/utils
```

Write file `apps/web/src/shared/utils/formatting.ts`:

```typescript
export function getColorByMagnitude(mag: number): string {
  if (mag < 3) return '#43a047';
  if (mag < 4) return '#fdd835';
  if (mag < 5) return '#fb8c00';
  if (mag < 6) return '#e53935';
  if (mag < 7) return '#b71c1c';
  return '#4a148c';
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "a l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}
```

- [ ] **Step 2: Slim down `apps/web/src/features/globe/globe.utils.ts`**

Replace the file content entirely with:

```typescript
export function getSizeByMagnitude(mag: number): number {
  return Math.pow(1.5, mag) * 0.3;
}

export function getAltByMagnitude(mag: number): number {
  return Math.max(0.01, mag / 30);
}
```

- [ ] **Step 3: Update `EarthquakeItem.tsx` import**

In `apps/web/src/features/earthquake-list/EarthquakeItem.tsx`, replace line 1:

Old:
```typescript
import { getColorByMagnitude, timeAgo } from '../globe/globe.utils';
```

New:
```typescript
import { getColorByMagnitude, timeAgo } from '../../shared/utils/formatting';
```

- [ ] **Step 4: Update `EarthquakeDetail.tsx` import**

In `apps/web/src/features/earthquake-detail/EarthquakeDetail.tsx`, replace line 1:

Old:
```typescript
import { getColorByMagnitude } from '../globe/globe.utils';
```

New:
```typescript
import { getColorByMagnitude } from '../../shared/utils/formatting';
```

- [ ] **Step 5: Update `Globe.tsx` import**

In `apps/web/src/features/globe/Globe.tsx`, replace line 3:

Old:
```typescript
import { getColorByMagnitude, getSizeByMagnitude, getAltByMagnitude } from './globe.utils';
```

New:
```typescript
import { getColorByMagnitude } from '../../shared/utils/formatting';
import { getSizeByMagnitude, getAltByMagnitude } from './globe.utils';
```

- [ ] **Step 6: Verify web builds**

```bash
pnpm --filter web build
```

Expected: build succeeds with no "module not found" errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/utils/formatting.ts apps/web/src/features/
git commit -m "refactor(web): extract cross-feature utils to shared/utils/formatting"
```

---

## Task 6: Install and configure `dependency-cruiser`

**Files:**
- Create: `.dependency-cruiser.cjs`
- Modify: `package.json` (root)

- [ ] **Step 1: Install `dependency-cruiser` at the repo root**

```bash
pnpm add -Dw dependency-cruiser
```

Expected: `dependency-cruiser` added to root `package.json` under `devDependencies`.

- [ ] **Step 2: Create `.dependency-cruiser.cjs`**

Write file `.dependency-cruiser.cjs`:

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-slice-api',
      comment:
        'A backend slice MUST NOT import from another slice. ' +
        'Allowed: npm packages, ../../shared/*, @seismograph/shared, same-slice files. ' +
        'If you need to react to another slice, use an EventEmitter2 event instead.',
      severity: 'error',
      from: {
        path: '^apps/api/src/features/([^/]+)/',
      },
      to: {
        path: '^apps/api/src/features/([^/]+)/',
        pathNot: '^apps/api/src/features/$1/',
      },
    },
    {
      name: 'no-cross-feature-web',
      comment:
        'A web feature MUST NOT import from another feature. ' +
        'Allowed: npm packages, ../../shared/*, ../../hooks/*, ../../api/client, @seismograph/shared, same-feature files.',
      severity: 'error',
      from: {
        path: '^apps/web/src/features/([^/]+)/',
      },
      to: {
        path: '^apps/web/src/features/([^/]+)/',
        pathNot: '^apps/web/src/features/$1/',
      },
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies allowed.',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'apps/api/tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: '^(apps/[^/]+/src/features/[^/]+|apps/[^/]+/src/shared|packages/[^/]+/src)',
      },
    },
  },
};
```

- [ ] **Step 3: Add scripts to root `package.json`**

Modify `package.json` to add these scripts under `"scripts"`:

```json
{
  "scripts": {
    "dev:api": "pnpm --filter api start:dev",
    "dev:web": "pnpm --filter web dev",
    "dev": "pnpm run dev:api & pnpm run dev:web",
    "build:api": "pnpm --filter api build",
    "build:web": "pnpm --filter web build",
    "build": "pnpm run build:api && pnpm run build:web",
    "lint": "pnpm --filter api lint",
    "test": "pnpm --filter api test",
    "test:integration": "pnpm --filter api test:integration",
    "check:slices": "depcruise apps/api/src apps/web/src --config .dependency-cruiser.cjs",
    "graph:slices": "depcruise apps/api/src apps/web/src --config .dependency-cruiser.cjs --output-type dot | dot -T svg -o docs/dependency-graph.svg"
  }
}
```

- [ ] **Step 4: Install graphviz for local graph generation**

```bash
brew install graphviz
```

Expected: `dot` command available on PATH. Verify:

```bash
dot -V
```

Expected output: `dot - graphviz version X.Y.Z`

- [ ] **Step 5: Run `pnpm check:slices` and verify it passes**

```bash
pnpm check:slices
```

Expected: exit code 0, message "no dependency violations found" (or silent success).

If it fails with a cross-feature violation in web, revisit Task 5 — the globe.utils fix must be complete.

- [ ] **Step 6: Generate the dependency graph**

```bash
pnpm graph:slices
```

Expected: file `docs/dependency-graph.svg` created. Open it to visually verify that slices/features appear as isolated islands.

- [ ] **Step 7: Commit**

```bash
git add .dependency-cruiser.cjs package.json pnpm-lock.yaml docs/dependency-graph.svg
git commit -m "chore: add dependency-cruiser to enforce slice isolation"
```

---

## Task 7: Checkpoint — install OrbStack (manual user action)

- [ ] **Step 1: Install OrbStack**

Run on the dev machine:

```bash
brew install orbstack
```

Then launch OrbStack once via `open -a OrbStack` (or from Spotlight) so it registers as the Docker daemon.

- [ ] **Step 2: Verify Docker CLI is available and pointed at OrbStack**

```bash
docker version
```

Expected: both Client and Server sections populated, Server context mentions OrbStack.

```bash
docker run --rm hello-world
```

Expected: "Hello from Docker!" message.

- [ ] **Step 3: Pull the postgres alpine image (warm the cache)**

```bash
docker pull postgres:17-alpine
```

Expected: image downloaded (~80 MB).

**No commit for this task — it's an environment setup step.**

---

## Task 8: Create the Testcontainers test DB helper

**Files:**
- Create: `apps/api/test/helpers/test-db.ts`
- Create: `apps/api/test/global-setup.ts`
- Create: `apps/api/test/global-teardown.ts`
- Create: `apps/api/test/jest-integration.json`
- Create: `apps/api/test/helpers/test-db.smoke.spec.ts` (smoke test, removed after verification)
- Modify: `apps/api/package.json` (add deps + test:integration script)

Context: The helper must (1) guard against hitting production, (2) boot one shared PG container per test run, (3) apply the Prisma schema, (4) provide `createTestingModule()` and `cleanDb()` helpers. In CI, it detects `process.env.CI === 'true'` and skips Testcontainers in favor of the GH Actions `services:` Postgres.

- [ ] **Step 1: Install test dependencies**

```bash
pnpm --filter api add -D testcontainers @testcontainers/postgresql
```

Expected: `testcontainers` and `@testcontainers/postgresql` added to `apps/api/package.json` devDependencies.

- [ ] **Step 2: Create the production guardrail + container management helper**

Write file `apps/api/test/helpers/test-db.ts`:

```typescript
import { DynamicModule } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { EventsModule } from '../../src/shared/events/events.module';

// Production guardrail — throws if DATABASE_URL looks like production
export function assertNotProduction(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (/prod|dokploy|\.app\b/i.test(url)) {
    throw new Error(
      `Refusing to run tests against what looks like a production DB. ` +
        `DATABASE_URL=${url.replace(/:[^:@]+@/, ':***@')}`,
    );
  }
}

let sharedContainer: StartedPostgreSqlContainer | undefined;
let sharedUrl: string | undefined;

export async function startTestDatabase(): Promise<string> {
  if (sharedUrl) return sharedUrl;

  if (process.env.CI === 'true') {
    // In CI, we use the GH Actions `services: postgres` sidecar.
    const url =
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/seismograph_test';
    assertNotProduction();
    sharedUrl = url;
    applyPrismaSchema(url);
    return url;
  }

  // Local: boot a real ephemeral Postgres via Testcontainers, reusing between runs.
  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('seismograph_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .withReuse()
    .start();

  sharedContainer = container;
  sharedUrl = container.getConnectionUri();
  assertNotProduction();
  applyPrismaSchema(sharedUrl);
  return sharedUrl;
}

export async function stopTestDatabase(): Promise<void> {
  // With `.withReuse()`, Testcontainers' Ryuk keeps the container alive across test runs.
  // We intentionally don't call stop() here — letting the container survive gives instant restarts.
  // In CI, there's no local container to stop (we use the GH Actions sidecar).
  sharedContainer = undefined;
  sharedUrl = undefined;
}

function applyPrismaSchema(url: string): void {
  // Apply the Prisma schema to the test database. `prisma db push` is ideal for tests:
  // it's non-destructive on a fresh DB and doesn't require migration history.
  const apiRoot = path.resolve(__dirname, '../..');
  execSync('pnpm prisma db push --accept-data-loss', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}

/**
 * Creates a NestJS TestingModule mounting ONLY the provided slice module plus
 * DatabaseModule + EventsModule. Does NOT import AppModule or other slices —
 * this is what proves slice isolation at test time.
 */
export async function createTestingModule(
  featureModule: DynamicModule | typeof Function,
): Promise<TestingModule> {
  const url = await startTestDatabase();
  process.env.DATABASE_URL = url;

  const moduleRef = await Test.createTestingModule({
    imports: [DatabaseModule, EventsModule, featureModule as any],
  }).compile();

  await moduleRef.init();
  return moduleRef;
}

/**
 * TRUNCATE all application tables. Call in beforeEach to isolate tests.
 */
export async function cleanDb(moduleRef: TestingModule): Promise<void> {
  const prisma = moduleRef.get(PrismaService);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "earthquakes" RESTART IDENTITY CASCADE',
  );
}
```

- [ ] **Step 3: Create Jest global setup**

Write file `apps/api/test/global-setup.ts`:

```typescript
import { startTestDatabase } from './helpers/test-db';

export default async function globalSetup(): Promise<void> {
  await startTestDatabase();
}
```

- [ ] **Step 4: Create Jest global teardown**

Write file `apps/api/test/global-teardown.ts`:

```typescript
import { stopTestDatabase } from './helpers/test-db';

export default async function globalTeardown(): Promise<void> {
  await stopTestDatabase();
}
```

- [ ] **Step 5: Create the integration Jest config**

Write file `apps/api/test/jest-integration.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testRegex": ".*\\.integration\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "testEnvironment": "node",
  "testTimeout": 60000,
  "globalSetup": "<rootDir>/test/global-setup.ts",
  "globalTeardown": "<rootDir>/test/global-teardown.ts"
}
```

- [ ] **Step 6: Update `apps/api/package.json` scripts and Jest config**

In `apps/api/package.json`:

(a) Update the `scripts` block. The `test` script now runs both unit and integration tests; a new `test:integration` script runs only integration:

```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest && jest --config ./test/jest-integration.json",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:integration": "jest --config ./test/jest-integration.json",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

(b) Update the existing inline `jest` config block in `apps/api/package.json` to ignore integration specs (so the default `jest` command only runs unit tests). Replace the whole `jest` block with:

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "testPathIgnorePatterns": [".*\\.integration\\.spec\\.ts$"],
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

Rationale: without `testPathIgnorePatterns`, the default `jest` command would pick up integration specs (because `.integration.spec.ts` ends with `.spec.ts`) and run them without the global setup, causing failures.

- [ ] **Step 7: Create a smoke test to verify the helper works**

Write file `apps/api/test/helpers/test-db.smoke.integration.spec.ts` (temporary — removed after verification). The `.integration.spec.ts` suffix ensures the integration Jest config picks it up:

```typescript
import { Module } from '@nestjs/common';
import { createTestingModule, cleanDb, assertNotProduction } from './test-db';
import { PrismaService } from '../../src/shared/database/prisma.service';

@Module({})
class EmptyModule {}

describe('test-db helper (smoke)', () => {
  it('throws when DATABASE_URL looks like production', () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://u:p@prod-db.example.com/x';
    expect(() => assertNotProduction()).toThrow(/production/i);
    process.env.DATABASE_URL = previous;
  });

  it('boots a real Postgres and runs a basic query', async () => {
    const moduleRef = await createTestingModule(EmptyModule);
    const prisma = moduleRef.get(PrismaService);

    await cleanDb(moduleRef);
    const rows = await prisma.earthquake.findMany();
    expect(rows).toEqual([]);

    await moduleRef.close();
  });
});
```

- [ ] **Step 8: Run the smoke test**

Make sure OrbStack is running, then:

```bash
pnpm --filter api test:integration
```

Expected: 2 tests pass. First run downloads the `postgres:17-alpine` image (~80 MB) and may take 10-30s. Subsequent runs should complete in < 5 seconds thanks to `.withReuse()`.

If the smoke test fails:
- Check Docker is running: `docker ps`
- Check Prisma schema applies cleanly: `DATABASE_URL=$(docker exec <container> cat /tmp/url) pnpm --filter api prisma db push`
- Check the guardrail regex isn't matching a legitimate URL

- [ ] **Step 9: Delete the smoke test**

```bash
rm apps/api/test/helpers/test-db.smoke.integration.spec.ts
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/test/ apps/api/package.json pnpm-lock.yaml
git commit -m "test(api): add Testcontainers helper for slice integration tests"
```

---

## Task 9: Integration test for `list-earthquakes`

**Files:**
- Create: `apps/api/src/features/list-earthquakes/list-earthquakes.integration.spec.ts`

Note: The service already exists. This test asserts the CURRENT behavior of `ListEarthquakesService`. If the assertions fail, we've discovered a bug in the existing service — document it and open a separate fix.

- [ ] **Step 1: Write the integration test**

Write file `apps/api/src/features/list-earthquakes/list-earthquakes.integration.spec.ts`:

```typescript
import { TestingModule } from '@nestjs/testing';
import { ListEarthquakesModule } from './list-earthquakes.module';
import { ListEarthquakesService } from './list-earthquakes.service';
import { SortBy } from './list-earthquakes.dto';
import { PrismaService } from '../../shared/database/prisma.service';
import { createTestingModule, cleanDb } from '../../../test/helpers/test-db';

describe('list-earthquakes (integration)', () => {
  let moduleRef: TestingModule;
  let service: ListEarthquakesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await createTestingModule(ListEarthquakesModule);
    service = moduleRef.get(ListEarthquakesService);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDb(moduleRef);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seed(partial: Partial<{
    id: string;
    magnitude: number;
    place: string;
    time: Date;
    latitude: number;
    longitude: number;
    depth: number;
  }> = {}) {
    return prisma.earthquake.create({
      data: {
        id: partial.id ?? `eq-${Math.random().toString(36).slice(2)}`,
        magnitude: partial.magnitude ?? 4.0,
        place: partial.place ?? 'Test place',
        time: partial.time ?? new Date(),
        latitude: partial.latitude ?? 0,
        longitude: partial.longitude ?? 0,
        depth: partial.depth ?? 10,
      },
    });
  }

  it('returns all earthquakes within the default 7-day window', async () => {
    await seed({ id: 'a', magnitude: 3.0 });
    await seed({ id: 'b', magnitude: 5.5 });
    await seed({ id: 'c', magnitude: 2.0 });

    const result = await service.list({});

    expect(result).toHaveLength(3);
  });

  it('filters by minMagnitude', async () => {
    await seed({ id: 'low', magnitude: 2.0 });
    await seed({ id: 'mid', magnitude: 4.5 });
    await seed({ id: 'high', magnitude: 6.5 });

    const result = await service.list({ minMagnitude: 4 });

    expect(result.map((e) => e.id).sort()).toEqual(['high', 'mid']);
  });

  it('filters by magnitude range', async () => {
    await seed({ id: 'a', magnitude: 2.0 });
    await seed({ id: 'b', magnitude: 4.0 });
    await seed({ id: 'c', magnitude: 6.0 });
    await seed({ id: 'd', magnitude: 8.0 });

    const result = await service.list({ minMagnitude: 3, maxMagnitude: 7 });

    expect(result.map((e) => e.id).sort()).toEqual(['b', 'c']);
  });

  it('sorts by magnitude desc when sortBy=MAGNITUDE', async () => {
    await seed({ id: 'a', magnitude: 3.0 });
    await seed({ id: 'b', magnitude: 5.5 });
    await seed({ id: 'c', magnitude: 4.2 });

    const result = await service.list({ sortBy: SortBy.MAGNITUDE });

    expect(result.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('respects the limit', async () => {
    for (let i = 0; i < 5; i++) {
      await seed({ id: `eq-${i}`, magnitude: i });
    }

    const result = await service.list({ limit: 2 });

    expect(result).toHaveLength(2);
  });

  it('excludes earthquakes older than the days window', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    await seed({ id: 'recent', time: now });
    await seed({ id: 'old', time: old });

    const result = await service.list({ days: 7 });

    expect(result.map((e) => e.id)).toEqual(['recent']);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter api test:integration -- --testPathPattern=list-earthquakes
```

Expected: 6 tests pass.

If the "excludes earthquakes older than the days window" test fails, check whether the `days` default in the DTO (`= 7`) is being applied when the field is omitted — it's only applied in the controller via `ValidationPipe`, not when you call the service directly. The test passes `{ days: 7 }` explicitly to avoid that pitfall.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/features/list-earthquakes/list-earthquakes.integration.spec.ts
git commit -m "test(api): add list-earthquakes integration test"
```

---

## Task 10: Integration test for `get-earthquake`

**Files:**
- Create: `apps/api/src/features/get-earthquake/get-earthquake.integration.spec.ts`

- [ ] **Step 1: Write the integration test**

Write file `apps/api/src/features/get-earthquake/get-earthquake.integration.spec.ts`:

```typescript
import { NotFoundException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { GetEarthquakeModule } from './get-earthquake.module';
import { GetEarthquakeController } from './get-earthquake.controller';
import { PrismaService } from '../../shared/database/prisma.service';
import { createTestingModule, cleanDb } from '../../../test/helpers/test-db';

describe('get-earthquake (integration)', () => {
  let moduleRef: TestingModule;
  let controller: GetEarthquakeController;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await createTestingModule(GetEarthquakeModule);
    controller = moduleRef.get(GetEarthquakeController);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDb(moduleRef);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('returns the earthquake when it exists', async () => {
    await prisma.earthquake.create({
      data: {
        id: 'eq-123',
        magnitude: 5.5,
        place: 'Offshore Honshu, Japan',
        time: new Date('2026-04-01T12:00:00Z'),
        latitude: 36.0,
        longitude: 140.0,
        depth: 20,
      },
    });

    const result = await controller.getById('eq-123');

    expect(result.id).toBe('eq-123');
    expect(result.magnitude).toBe(5.5);
    expect(result.place).toBe('Offshore Honshu, Japan');
  });

  it('throws NotFoundException when the earthquake does not exist', async () => {
    await expect(controller.getById('does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter api test:integration -- --testPathPattern=get-earthquake
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/features/get-earthquake/get-earthquake.integration.spec.ts
git commit -m "test(api): add get-earthquake integration test"
```

---

## Task 11: Integration test for `get-statistics`

**Files:**
- Create: `apps/api/src/features/get-statistics/get-statistics.integration.spec.ts`

- [ ] **Step 1: Write the integration test**

Write file `apps/api/src/features/get-statistics/get-statistics.integration.spec.ts`:

```typescript
import { TestingModule } from '@nestjs/testing';
import { GetStatisticsModule } from './get-statistics.module';
import { GetStatisticsService } from './get-statistics.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { createTestingModule, cleanDb } from '../../../test/helpers/test-db';

describe('get-statistics (integration)', () => {
  let moduleRef: TestingModule;
  let service: GetStatisticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await createTestingModule(GetStatisticsModule);
    service = moduleRef.get(GetStatisticsService);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDb(moduleRef);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seedSet() {
    const now = new Date();
    await prisma.earthquake.createMany({
      data: [
        { id: 'a', magnitude: 2.5, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5 },
        { id: 'b', magnitude: 3.8, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5 },
        { id: 'c', magnitude: 4.2, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5 },
        { id: 'd', magnitude: 5.1, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5, tsunami: true },
        { id: 'e', magnitude: 6.3, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5 },
      ],
    });
  }

  it('computes totals, averages, and extrema over the window', async () => {
    await seedSet();

    const stats = await service.getStats(7);

    expect(stats.totalCount).toBe(5);
    expect(stats.avgMagnitude).toBeCloseTo((2.5 + 3.8 + 4.2 + 5.1 + 6.3) / 5, 1);
    expect(stats.maxMagnitude).toBe(6.3);
    expect(stats.minMagnitude).toBe(2.5);
  });

  it('counts significant events (magnitude >= 5) and tsunami alerts', async () => {
    await seedSet();

    const stats = await service.getStats(7);

    expect(stats.significantCount).toBe(2); // d (5.1), e (6.3)
    expect(stats.tsunamiAlerts).toBe(1); // d
  });

  it('returns a distribution grouped by magnitude ranges', async () => {
    await seedSet();

    const stats = await service.getStats(7);

    expect(stats.distribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ range: '2-3', count: 1 }),
        expect.objectContaining({ range: '3-4', count: 1 }),
        expect.objectContaining({ range: '4-5', count: 1 }),
        expect.objectContaining({ range: '5-6', count: 1 }),
        expect.objectContaining({ range: '6-7', count: 1 }),
      ]),
    );
  });

  it('excludes events outside the window', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    await prisma.earthquake.createMany({
      data: [
        { id: 'recent', magnitude: 4.0, place: 'p', time: now, latitude: 0, longitude: 0, depth: 5 },
        { id: 'old', magnitude: 8.0, place: 'p', time: old, latitude: 0, longitude: 0, depth: 5 },
      ],
    });

    const stats = await service.getStats(7);

    expect(stats.totalCount).toBe(1);
    expect(stats.maxMagnitude).toBe(4.0);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter api test:integration -- --testPathPattern=get-statistics
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/features/get-statistics/get-statistics.integration.spec.ts
git commit -m "test(api): add get-statistics integration test"
```

---

## Task 12: Integration test for `sync-earthquakes`

**Files:**
- Create: `apps/api/src/features/sync-earthquakes/sync-earthquakes.integration.spec.ts`

Context: This is the most important test in the plan. It mocks `UsgsFeedClient` (the external HTTP boundary) with a Nest provider override, runs `service.syncRecent()` against a real DB, and verifies both the database state and the emitted event. The test also implicitly proves that `sync-earthquakes` works WITHOUT `earthquake-events` (no SSE controller mounted) — the whole point of the event-driven pattern.

One complication: `SyncEarthquakesModule` registers a BullMQ queue via `BullModule.registerQueue()`, which will try to connect to Redis at test time. We work around this by (1) not calling the scheduler/processor directly (only the service), and (2) accepting that the queue connection attempt is silent if Redis is unavailable in the test environment — however, to be safe, we override the `SyncEarthquakesScheduler` and `SyncEarthquakesProcessor` providers with no-op stand-ins so their dependencies on the queue don't fail module init.

- [ ] **Step 1: Write the integration test**

Write file `apps/api/src/features/sync-earthquakes/sync-earthquakes.integration.spec.ts`:

```typescript
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { SyncEarthquakesService } from './sync-earthquakes.service';
import { UsgsFeedClient, UsgsFeature } from './usgs-feed.client';
import { PrismaService } from '../../shared/database/prisma.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { EventsModule } from '../../shared/events/events.module';
import { startTestDatabase, cleanDb, assertNotProduction } from '../../../test/helpers/test-db';

class UsgsFeedClientMock {
  public fetchHourly = jest.fn<() => Promise<UsgsFeature[]>>();
  public fetchWeekly = jest.fn<() => Promise<UsgsFeature[]>>();
}

/**
 * A minimal module for testing sync-earthquakes WITHOUT the scheduler/processor,
 * which depend on BullMQ/Redis. We only exercise the service directly.
 */
@Module({
  providers: [SyncEarthquakesService, { provide: UsgsFeedClient, useClass: UsgsFeedClientMock }],
})
class SyncEarthquakesTestModule {}

function makeFeature(partial: Partial<UsgsFeature['properties']> & { id: string; coordinates?: [number, number, number] }): UsgsFeature {
  return {
    id: partial.id,
    properties: {
      mag: partial.mag ?? 4.5,
      place: partial.place ?? 'Test place',
      time: partial.time ?? Date.now(),
      url: partial.url ?? 'https://earthquake.usgs.gov/e/' + partial.id,
      tsunami: partial.tsunami ?? 0,
      sig: partial.sig ?? 100,
      status: partial.status ?? 'reviewed',
    },
    geometry: {
      coordinates: partial.coordinates ?? [140.0, 36.0, 10.0],
    },
  };
}

describe('sync-earthquakes (integration)', () => {
  let moduleRef: TestingModule;
  let service: SyncEarthquakesService;
  let prisma: PrismaService;
  let emitter: EventEmitter2;
  let usgsMock: UsgsFeedClientMock;

  beforeAll(async () => {
    const url = await startTestDatabase();
    process.env.DATABASE_URL = url;
    assertNotProduction();

    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, EventsModule, SyncEarthquakesTestModule],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(SyncEarthquakesService);
    prisma = moduleRef.get(PrismaService);
    emitter = moduleRef.get(EventEmitter2);
    usgsMock = moduleRef.get(UsgsFeedClient) as unknown as UsgsFeedClientMock;
  });

  beforeEach(async () => {
    await cleanDb(moduleRef);
    usgsMock.fetchHourly.mockReset();
    usgsMock.fetchWeekly.mockReset();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('upserts fetched earthquakes into the database', async () => {
    usgsMock.fetchHourly.mockResolvedValue([
      makeFeature({ id: 'eq1', mag: 5.0, place: 'Place A' }),
      makeFeature({ id: 'eq2', mag: 3.2, place: 'Place B' }),
    ]);

    const result = await service.syncRecent();

    expect(result).toEqual({ total: 2, synced: 2 });

    const rows = await prisma.earthquake.findMany({ orderBy: { id: 'asc' } });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'eq1', magnitude: 5.0, place: 'Place A' });
    expect(rows[1]).toMatchObject({ id: 'eq2', magnitude: 3.2, place: 'Place B' });
  });

  it('updates existing earthquakes instead of duplicating them', async () => {
    await prisma.earthquake.create({
      data: {
        id: 'eq1',
        magnitude: 4.0,
        place: 'Old place',
        time: new Date(),
        latitude: 0,
        longitude: 0,
        depth: 5,
      },
    });

    usgsMock.fetchHourly.mockResolvedValue([
      makeFeature({ id: 'eq1', mag: 5.5, place: 'New place' }),
    ]);

    await service.syncRecent();

    const rows = await prisma.earthquake.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].magnitude).toBe(5.5);
    expect(rows[0].place).toBe('New place');
  });

  it('emits earthquakes.synced with the top 10 most recent', async () => {
    const now = Date.now();
    usgsMock.fetchHourly.mockResolvedValue([
      makeFeature({ id: 'eq1', mag: 3.0, time: now - 1000 }),
      makeFeature({ id: 'eq2', mag: 4.0, time: now - 500 }),
      makeFeature({ id: 'eq3', mag: 5.0, time: now }),
    ]);

    const payloads: any[] = [];
    emitter.on('earthquakes.synced', (payload) => payloads.push(payload));

    await service.syncRecent();

    expect(payloads).toHaveLength(1);
    expect(payloads[0].type).toBe('sync');
    expect(payloads[0].count).toBe(3);
    expect(payloads[0].earthquakes).toHaveLength(3);
    // Most recent first
    expect(payloads[0].earthquakes[0].id).toBe('eq3');
    expect(payloads[0].earthquakes[2].id).toBe('eq1');
  });

  it('is a no-op when USGS returns zero features', async () => {
    usgsMock.fetchHourly.mockResolvedValue([]);

    const payloads: any[] = [];
    emitter.on('earthquakes.synced', (payload) => payloads.push(payload));

    const result = await service.syncRecent();

    expect(result).toEqual({ total: 0, synced: 0 });
    expect(await prisma.earthquake.count()).toBe(0);
    expect(payloads).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter api test:integration -- --testPathPattern=sync-earthquakes
```

Expected: 4 tests pass.

If "emits earthquakes.synced with the top 10 most recent" test fails on ordering, check the sort in `sync-earthquakes.service.ts:31` — it sorts by `time` desc and slices top 10. The test values are spaced 500 ms apart to make the sort unambiguous.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/features/sync-earthquakes/sync-earthquakes.integration.spec.ts
git commit -m "test(api): add sync-earthquakes integration test with mocked UsgsFeedClient"
```

---

## Task 13: Create the `alert-earthquakes` slice (TDD)

**Files:**
- Create: `apps/api/src/features/alert-earthquakes/alert-earthquakes.module.ts`
- Create: `apps/api/src/features/alert-earthquakes/alert-earthquakes.service.ts`
- Create: `apps/api/src/features/alert-earthquakes/alert-earthquakes.listener.ts`
- Create: `apps/api/src/features/alert-earthquakes/alert-earthquakes.integration.spec.ts`

Context: This is a NEW slice, so real TDD applies: write the failing test first, then implement minimally until it passes.

- [ ] **Step 1: Create the slice directory**

```bash
mkdir -p apps/api/src/features/alert-earthquakes
```

- [ ] **Step 2: Write the failing integration test**

Write file `apps/api/src/features/alert-earthquakes/alert-earthquakes.integration.spec.ts`:

```typescript
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { AlertEarthquakesModule } from './alert-earthquakes.module';
import { AlertEarthquakesService } from './alert-earthquakes.service';
import { createTestingModule } from '../../../test/helpers/test-db';

describe('alert-earthquakes (integration)', () => {
  let moduleRef: TestingModule;
  let service: AlertEarthquakesService;
  let emitter: EventEmitter2;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    moduleRef = await createTestingModule(AlertEarthquakesModule);
    service = moduleRef.get(AlertEarthquakesService);
    emitter = moduleRef.get(EventEmitter2);
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('emits a warning for each earthquake with magnitude >= 6.0', () => {
    const count = service.handleSyncedBatch({
      type: 'sync',
      count: 3,
      earthquakes: [
        { id: 'low', magnitude: 5.0, place: 'Place A', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/low' } as any,
        { id: 'high', magnitude: 6.5, place: 'Place B', time: '2026-04-10T12:01:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/high' } as any,
        { id: 'huge', magnitude: 7.8, place: 'Place C', time: '2026-04-10T12:02:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/huge' } as any,
      ],
      timestamp: '2026-04-10T12:03:00Z',
    });

    expect(count).toBe(2);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    // The warn calls should mention magnitude and place of each alert
    const messages = warnSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes('6.5') && m.includes('Place B'))).toBe(true);
    expect(messages.some((m) => m.includes('7.8') && m.includes('Place C'))).toBe(true);
  });

  it('emits no warnings when no earthquake is at or above 6.0', () => {
    const count = service.handleSyncedBatch({
      type: 'sync',
      count: 2,
      earthquakes: [
        { id: 'low1', magnitude: 3.0, place: 'A', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/1' } as any,
        { id: 'low2', magnitude: 5.9, place: 'B', time: '2026-04-10T12:01:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/2' } as any,
      ],
      timestamp: '2026-04-10T12:02:00Z',
    });

    expect(count).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reacts to the earthquakes.synced event (end-to-end via EventEmitter2)', () => {
    emitter.emit('earthquakes.synced', {
      type: 'sync',
      count: 1,
      earthquakes: [
        { id: 'big', magnitude: 6.2, place: 'Big place', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/big' } as any,
      ],
      timestamp: '2026-04-10T12:01:00Z',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('6.2');
  });
});
```

- [ ] **Step 3: Run the test — expect it to fail (files don't exist yet)**

```bash
pnpm --filter api test:integration -- --testPathPattern=alert-earthquakes
```

Expected: FAIL with "Cannot find module './alert-earthquakes.module'".

- [ ] **Step 4: Write the service (minimal)**

Write file `apps/api/src/features/alert-earthquakes/alert-earthquakes.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { Earthquake } from '@seismograph/shared';

interface SyncedBatchPayload {
  type: 'sync';
  count: number;
  earthquakes: Earthquake[];
  timestamp: string;
}

const ALERT_THRESHOLD = 6.0;

@Injectable()
export class AlertEarthquakesService {
  private readonly logger = new Logger(AlertEarthquakesService.name);

  handleSyncedBatch(payload: SyncedBatchPayload): number {
    const alerts = payload.earthquakes.filter((e) => e.magnitude >= ALERT_THRESHOLD);

    for (const eq of alerts) {
      this.logger.warn(
        `ALERT: M${eq.magnitude.toFixed(1)} at ${eq.place} (${eq.time}) — ${eq.url ?? 'no url'}`,
      );
    }

    return alerts.length;
  }
}
```

- [ ] **Step 5: Write the listener**

Write file `apps/api/src/features/alert-earthquakes/alert-earthquakes.listener.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertEarthquakesService } from './alert-earthquakes.service';

@Injectable()
export class AlertEarthquakesListener {
  constructor(private readonly service: AlertEarthquakesService) {}

  @OnEvent('earthquakes.synced')
  handleSynced(payload: Parameters<AlertEarthquakesService['handleSyncedBatch']>[0]): void {
    this.service.handleSyncedBatch(payload);
  }
}
```

- [ ] **Step 6: Write the module**

Write file `apps/api/src/features/alert-earthquakes/alert-earthquakes.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AlertEarthquakesService } from './alert-earthquakes.service';
import { AlertEarthquakesListener } from './alert-earthquakes.listener';

@Module({
  providers: [AlertEarthquakesService, AlertEarthquakesListener],
})
export class AlertEarthquakesModule {}
```

- [ ] **Step 7: Run the test — expect it to pass**

```bash
pnpm --filter api test:integration -- --testPathPattern=alert-earthquakes
```

Expected: 3 tests pass.

- [ ] **Step 8: Verify slice isolation**

```bash
pnpm check:slices
```

Expected: no violations. `alert-earthquakes` does not import from any other slice.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/features/alert-earthquakes/
git commit -m "feat(api): add alert-earthquakes slice with listener + service"
```

---

## Task 14: Wire `alert-earthquakes` into `AppModule`

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add the import**

In `apps/api/src/app.module.ts`, add this import near the top with the other feature imports:

```typescript
import { AlertEarthquakesModule } from './features/alert-earthquakes/alert-earthquakes.module';
```

- [ ] **Step 2: Add `AlertEarthquakesModule` to the `imports` array**

The full `imports` array should now be:

```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  ScheduleModule.forRoot(),
  DatabaseModule,
  QueueModule,
  EventsModule,
  SyncEarthquakesModule,
  ListEarthquakesModule,
  GetEarthquakeModule,
  EarthquakeEventsModule,
  GetStatisticsModule,
  AlertEarthquakesModule,
],
```

- [ ] **Step 3: Verify the app still builds**

```bash
pnpm --filter api build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Verify all tests still pass**

```bash
pnpm --filter api test && pnpm --filter api test:integration
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): wire alert-earthquakes into AppModule"
```

---

## Task 15: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write the CI workflow**

Write file `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  check-slices:
    name: Check slice isolation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: sudo apt-get update && sudo apt-get install -y graphviz
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:slices
      - run: pnpm graph:slices
      - uses: actions/upload-artifact@v4
        with:
          name: dependency-graph
          path: docs/dependency-graph.svg
          if-no-files-found: error

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: seismograph_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d seismograph_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/seismograph_test
      CI: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Apply Prisma schema to test database
        run: pnpm --filter api prisma db push --skip-generate --accept-data-loss
      - name: Run unit tests
        run: pnpm --filter api test
      - name: Run integration tests
        run: pnpm --filter api test:integration

  build:
    name: Build
    needs: [lint, check-slices, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

- [ ] **Step 3: Commit the workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, check-slices, test, build)"
```

- [ ] **Step 4: Push a branch and open a PR to verify CI works**

```bash
git checkout -b ci/architect-pass
git push -u origin ci/architect-pass
gh pr create --title "Architect pass: CLAUDE.md, ADRs, tests, CI" --body "$(cat <<'EOF'
## Summary

- Hierarchical CLAUDE.md (root, api, web) documenting conventions
- 7 ADRs capturing core architectural decisions
- dependency-cruiser enforcing slice isolation (with dependency graph artifact)
- Testcontainers-based integration tests for 4 slices
- New alert-earthquakes slice demonstrating event-driven extensibility
- GitHub Actions CI (lint / check-slices / test / build)

Full design in docs/superpowers/specs/2026-04-10-seismograph-architect-pass-design.md.
Implementation plan in docs/superpowers/plans/2026-04-10-seismograph-architect-pass.md.

## Test plan

- [ ] All CI jobs pass on the PR
- [ ] Dependency graph artifact is downloadable from the CI run
- [ ] `pnpm test && pnpm check:slices` pass locally
EOF
)"
```

Expected: PR opened. Wait for CI to run. All 4 jobs (lint, check-slices, test, build) must pass.

If any job fails, read the logs via `gh run view <run-id> --log-failed`, fix the issue, push a new commit to the branch, and wait for CI to re-run.

---

## Task 16: Root README updates

**Files:**
- Modify: `README.md` (root, if it exists — otherwise create)

- [ ] **Step 1: Read the current root README (if any)**

```bash
ls README.md 2>/dev/null && cat README.md || echo "No root README yet"
```

- [ ] **Step 2: Create or update the root README**

If there is no root README, create `README.md`:

```markdown
# Seismograph

Real-time earthquake monitoring: USGS feed → PostgreSQL → Server-Sent Events → 3D globe.

[![CI](https://github.com/<owner>/seismograph/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/seismograph/actions/workflows/ci.yml)

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
```

Replace `<owner>` with the actual GitHub organization/username on the CI badge URL before committing.

If a root README already exists, add the "Documentation", "Quick start", and "Commands" sections without overwriting existing content. Keep the CI badge at the top.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add CI badge and link to new architecture documentation"
```

- [ ] **Step 4: Push and merge the PR**

Once the PR from Task 15 is green and this README change is pushed:

```bash
git push
gh pr merge --squash --delete-branch
```

(Use `--merge` instead of `--squash` if you prefer to keep the per-task commit history on `main`.)

---

## Final verification checklist

Run these at the end to confirm the whole plan succeeded:

- [ ] `pnpm install` completes
- [ ] `pnpm lint` passes
- [ ] `pnpm check:slices` passes (no violations)
- [ ] `pnpm graph:slices` produces `docs/dependency-graph.svg`
- [ ] `pnpm --filter api test` passes (unit tests)
- [ ] `pnpm --filter api test:integration` passes (4 slice tests + alert-earthquakes test = 5 test files, ~17 test cases)
- [ ] `pnpm build` succeeds
- [ ] GitHub Actions CI is green on `main`
- [ ] `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` all exist and are non-empty
- [ ] `docs/adr/` contains 7 ADR files
- [ ] `apps/api/src/features/alert-earthquakes/` contains module, service, listener, integration spec
- [ ] `apps/api/src/app.module.ts` imports `AlertEarthquakesModule`
- [ ] Opening `docs/dependency-graph.svg` shows slices as isolated clusters connected only to `shared/`
