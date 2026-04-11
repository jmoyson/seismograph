# Seismograph — Architect Pass Design

- **Date**: 2026-04-10
- **Status**: Approved for implementation
- **Author**: Jérémy Moyson (brainstormed with Claude)
- **Scope**: Transform the working Seismograph MVP into a project that documents and enforces its own architectural discipline

---

## 1. Goals & Non-Goals

### Goals
1. **Document conventions** so any developer (human or AI agent) can add a new vertical slice correctly in under 5 minutes, without reading the entire codebase.
2. **Enforce slice isolation mechanically** — the "one golden rule" of the architecture cannot be silently violated.
3. **Prove slice independence** through integration tests that mount each slice in isolation.
4. **Document architectural decisions** so future contributors understand the *why*, not just the *what*.
5. **Validate the whole system** by adding a new event-driven slice (`alert-earthquakes`) that is built by following the newly-written conventions — a dogfooding test of the architectural setup.

### Non-Goals
- Frontend test coverage (out of scope for this pass).
- Migration of the dev Postgres off production (user is intentionally using prod as dev DB during MVP; tests are fully isolated via Testcontainers).
- Migration to Turborepo (explicitly decided against for now — see ADR 004).
- Migration from Jest to Vitest (YAGNI; Jest already configured and working).
- E2E API tests via supertest (out of scope; integration tests at the service/controller level cover the same bugs).
- Husky / lint-staged setup (GitHub Actions CI is the authoritative gate).

---

## 2. Context & Current State

Seismograph is a working MVP:
- `apps/api` — NestJS 11 + Prisma + PostgreSQL + BullMQ + EventEmitter2, organized in 5 vertical slices under `src/features/`: `sync-earthquakes`, `list-earthquakes`, `get-earthquake`, `get-statistics`, `earthquake-events` (SSE).
- `apps/web` — React 19 + Vite + TanStack Query + `react-globe.gl`, organized in feature folders under `src/features/`.
- `packages/shared` — `@seismograph/shared`, TypeScript-only types consumed by both apps with no build step.
- `pnpm` workspaces (no Turborepo).

**Current gaps this design addresses:**
- No `CLAUDE.md` anywhere → no operational context for AI agents working in the repo.
- No ADRs → architectural decisions are implicit in the code.
- Slice isolation is enforced only by convention, not mechanically. One known violation already exists on the web side: `earthquake-list/EarthquakeItem.tsx` imports from `../globe/globe.utils.ts`.
- No unit or integration tests beyond a stub `app.e2e-spec.ts`.
- No CI pipeline.

---

## 3. Architectural Invariants (the rules this design enforces)

These are the rules that must hold after this pass is complete. All tooling, documentation and tests in this design exist to enforce or document these.

1. **Slice isolation** — A slice in `apps/api/src/features/X/` MUST NEVER import from another slice. A feature in `apps/web/src/features/X/` MUST NEVER import from another feature. Allowed imports: npm packages, `../../shared/*`, `@seismograph/shared`, same-slice files. Enforced by `dependency-cruiser`.

2. **Service vs. direct repository injection (Rule A)** — If a use case is a single Prisma call with no business logic, inject `PrismaService` directly into the controller. As soon as there is filtering, aggregation, transformation, or side effects (event, queue, log), create a `.service.ts`. Rationale: a service exists to hold business logic, not for uniformity.

3. **Cross-slice communication goes through events** — If slice A needs to react to something that happens in slice B, it subscribes to an event emitted by B via `EventEmitter2`. No direct imports.

4. **Tests hit a real database** — Integration tests use a real ephemeral Postgres via Testcontainers (local) or GH Actions `services:` (CI). Prisma is never mocked. Only external boundaries (e.g., `UsgsFeedClient` HTTP calls) are mocked.

5. **Tests must never touch production** — A runtime guardrail in the test helper throws if `DATABASE_URL` matches production patterns.

6. **New slices follow the template in `apps/api/CLAUDE.md`** — The template is an imperative checklist, not a description.

---

## 4. Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Root monorepo `CLAUDE.md` | `/CLAUDE.md` |
| 2 | API `CLAUDE.md` | `/apps/api/CLAUDE.md` |
| 3 | Web `CLAUDE.md` | `/apps/web/CLAUDE.md` |
| 4 | 7 ADRs | `/docs/adr/00{1..7}-*.md` |
| 5 | `dependency-cruiser` config | `/.dependency-cruiser.cjs` |
| 6 | pnpm scripts for slice checks | `/package.json` |
| 7 | Correction of `globe.utils` isolation violation | `/apps/web/src/shared/utils/` |
| 8 | Shared test DB helper | `/apps/api/test/helpers/test-db.ts` |
| 9 | Integration tests for 4 slices | `/apps/api/src/features/*/` |
| 10 | New `alert-earthquakes` slice + integration test | `/apps/api/src/features/alert-earthquakes/` |
| 11 | GitHub Actions CI workflow | `/.github/workflows/ci.yml` |
| 12 | Generated dependency graph | `/docs/dependency-graph.svg` |

---

## 5. CLAUDE.md Design

### Principles (applied to all three files)
- **Hierarchical**: Claude Code loads the most specific `CLAUDE.md` based on the working directory, so each file is targeted to its context.
- **Concise** (~100-180 lines each). `CLAUDE.md` is in context on every interaction.
- **Non-redundant with the code**: document what is NOT visible by reading the code (rules, invariants, the *why*).
- **Non-redundant with README**: README is for humans onboarding, `CLAUDE.md` is for agents operating in the repo.
- **Commands executable at the top**: so Claude Code uses them directly.
- **`NEVER` / `ALWAYS` used for hard invariants**: explicit imperative rules are read literally.
- **Rules live in exactly one place**: if a rule appears in multiple files, only one file owns the full wording; others link to it.

### `/CLAUDE.md` (root, ~120 lines)

Sections:
1. What this is (one paragraph).
2. Repo layout (4 bullets).
3. Package manager (`pnpm` only).
4. Commands (install, dev, dev:api, dev:web, build, test, check:slices, lint).
5. **THE golden rule — slice isolation** (full wording, enforced by `pnpm check:slices`).
6. Where to find more context: `@apps/api/CLAUDE.md`, `@apps/web/CLAUDE.md`, `docs/adr/`.
7. Commit conventions (Conventional Commits).
8. Extension pattern: a slice may have its own `CLAUDE.md` when it exceeds ~5 files or contains non-trivial internal invariants.

### `/apps/api/CLAUDE.md` (~180 lines, densest)

Sections:
1. Stack (3 lines).
2. Vertical slice structure template (annotated file tree).
3. **Rule A (service vs. direct injection)** — verbatim, with two concrete examples from existing code (`get-earthquake` has no service, `list-earthquakes` does).
4. Shared modules (`database/`, `events/`, `queue/`) — usage contract for each.
5. BullMQ pattern (scheduler → queue → processor), with the rule "processor calls only its own slice's service".
6. SSE pattern (`EventEmitter2` → `Subject` set → controller with heartbeat).
7. Prisma pattern (inject `PrismaService`, never `new PrismaClient()`, schema as source of truth).
8. Slice isolation rule (repeated with concrete examples of what is forbidden).
9. Test conventions: 1 `*.integration.spec.ts` per slice, mount only the slice module + globals, use `test-db.ts`, mock only external boundaries, never Prisma, guardrail against production DB.
10. **"How to add a slice"** — imperative checklist (numbered actions, not descriptive).
11. **DON'Ts list** — 5-6 hard prohibitions.

### `/apps/web/CLAUDE.md` (~100 lines)

Sections:
1. Stack.
2. Folder structure (`src/features/*`, `src/hooks/`, `src/api/`, `src/shared/`).
3. Feature isolation rule (same principle as backend, `shared/` is the only common home).
4. API consumption pattern: always through `src/api/client.ts`, always wrapped in a `useX` hook, types from `@seismograph/shared`.
5. SSE consumed via `useSSE.ts` hook only, never `EventSource` directly in a feature.
6. How to add a feature UI (short imperative template).
7. DON'Ts.

---

## 6. ADR Design

### Format: Nygard classic + minimal frontmatter

Chosen over MADR 4.0 because MADR 4.0 cannot fit into the 20-30 line budget per ADR. The Nygard format is augmented with a `Revisit if` clause — each ADR explicitly states the condition under which the decision should be reconsidered.

**Template:**

```markdown
# ADR 00X — <title>

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context
<3-5 lines>

## Decision
<2-4 lines>

## Consequences
**Positive:**
- <tradeoff won>

**Negative:**
- <tradeoff paid — at least one, always>

**Revisit if:**
- <condition that would trigger reconsideration>
```

### List of ADRs

| # | Title | Key framing |
|---|---|---|
| 001 | Vertical Slice Architecture over Layered | "Complexity must live with the feature, not be diluted across 5 horizontal folders." |
| 002 | SSE over WebSocket | "Need is unidirectional. WebSocket adds complexity we would not use." |
| 003 | BullMQ over direct cron | "A cron without retry and observability hides operational debt. BullMQ pays it up front." |
| 004 | pnpm workspaces over Turborepo (not yet) | "Turborepo is not bad, it is premature. At 2 apps, its cache earns little and its config costs more." |
| 005 | USGS feed polling pattern | "USGS provides no stream. We poll, but we decouple polling from fan-out via a queue." |
| 006 | Testcontainers + OrbStack for integration tests | "A Prisma mock tests that we coded as intended, not that it works. An ephemeral real Postgres tests both." |
| 007 | dependency-cruiser for slice isolation enforcement | "The isolation rule is the core of the architecture. It must be verified by a machine, not by human discipline." |

Each ADR includes a "Revisit if" clause. ADRs 006 and 007 were added during brainstorming to capture decisions that are not obvious from the code.

---

## 7. Testing Strategy

### Stack
- **Testcontainers** (`@testcontainers/postgresql`) with `postgres:17-alpine` for local test runs.
- **OrbStack** as the Docker daemon on macOS (~200 MB RAM idle vs. 3-4 GB for Docker Desktop — critical on an 8 GB M1 Mac mini).
- **GitHub Actions `services:` container** in CI (no Testcontainers needed; Docker is already provided). Same `postgres:17-alpine` image.
- **Jest** (kept as-is; no migration to Vitest — YAGNI).
- **`.withReuse(true)`** in local mode so the PG container survives between test runs for fast iteration.

### Shared helper: `apps/api/test/helpers/test-db.ts`

Responsibilities:
1. **Production DB guardrail**: throw immediately if `DATABASE_URL` matches `/prod|dokploy|\.app\b/i`.
2. **Mode detection**: if `process.env.CI === 'true'`, connect directly to `localhost:5432` (the GH Actions service). Otherwise start a Testcontainers container with `.withReuse(true)`.
3. **Run Prisma migrations** (`prisma migrate deploy`) against the test DB on first start.
4. **Expose `cleanDb()`** — `TRUNCATE ... RESTART IDENTITY CASCADE` on all tables, called in each `beforeEach`.
5. **Expose `createTestingModule(feature: DynamicModule)`** — builds a Nest `TestingModule` importing only the passed feature module + `DatabaseModule`, `EventsModule`, `QueueModule`. Never imports `AppModule` or other slices. This is what proves slice isolation at test time: if the slice secretly depended on another slice's provider, instantiation fails.
6. **Shared container** across all test suites in a run (started once in global setup).

### Integration tests to write

| Slice | What is tested | Mocks |
|---|---|---|
| `list-earthquakes` | Filtering by `minMagnitude`/`maxMagnitude`/`days`, sort, limit | None |
| `get-earthquake` | Lookup by id, 404 for missing | None |
| `get-statistics` | Aggregations (count, avg/max mag, count per day) | None |
| `sync-earthquakes` | `UsgsFeedClient` mocked to return fake GeoJSON, run `service.sync()`, assert rows upserted + `earthquakes.synced` event emitted | Only `UsgsFeedClient` |

The `sync-earthquakes` test is the most important: it proves the whole VSA + event-driven pattern because it runs the producer in isolation without any consumer (no `earthquake-events`, no `alert-earthquakes`), and the event emission is verified via a direct `EventEmitter2` subscription in the test.

### Test file location convention
`apps/api/src/features/<slice>/<slice>.integration.spec.ts` (colocated with the slice).

---

## 8. Slice Isolation Enforcement

### Tool: `dependency-cruiser`

Chosen over bash script (fragile) and ESLint-boundaries (less powerful for graph output). See ADR 007.

### Config: `.dependency-cruiser.cjs`

Three rules:
1. **`no-cross-slice-api`** — `from: apps/api/src/features/<slice>/**`, `to: apps/api/src/features/<other>/**`, severity: error.
2. **`no-cross-feature-web`** — same pattern for `apps/web/src/features/`.
3. **`no-circular`** — no circular dependencies between modules.

### Scripts (`package.json` root)

```json
{
  "scripts": {
    "check:slices": "depcruise apps/api/src apps/web/src --config .dependency-cruiser.cjs",
    "graph:slices": "depcruise apps/api/src apps/web/src --config .dependency-cruiser.cjs --output-type dot | dot -T svg -o docs/dependency-graph.svg"
  }
}
```

### Prerequisite
`graphviz` must be installed (`brew install graphviz`) for SVG generation. The root `CLAUDE.md` and README document this.

### Fixing the known violation
Before enabling `dependency-cruiser`, `apps/web/src/features/earthquake-list/EarthquakeItem.tsx` imports `getColorByMagnitude` and `timeAgo` from `../globe/globe.utils.ts`. These utilities will be moved to `apps/web/src/shared/utils/formatting.ts`, and both call sites updated. The remaining genuinely globe-specific code stays in `globe/`.

---

## 9. New Slice: `alert-earthquakes`

### Purpose
Listens to `earthquakes.synced`. If any earthquake has `magnitude >= 6.0`, emits a `Logger.warn` for each. No HTTP controller, no email, no external integration — intentionally minimal, to prove the event-driven pattern.

### Structure

```
apps/api/src/features/alert-earthquakes/
├── alert-earthquakes.module.ts
├── alert-earthquakes.service.ts
├── alert-earthquakes.listener.ts
└── alert-earthquakes.integration.spec.ts
```

### Why a service (Rule A applies)
There is both filtering (`magnitude >= 6.0`) and a side effect (logging). Rule A says: create a service. The listener is transport only — it receives the event and delegates to the service. The listener contains zero logic.

### Behavior
- **Listener**: `@OnEvent('earthquakes.synced') handle(payload) { return this.service.handleSyncedBatch(payload); }`
- **Service.handleSyncedBatch(payload: { earthquakes: Earthquake[] })**:
  1. Filter earthquakes with `magnitude >= 6.0`.
  2. For each, call `this.logger.warn` with `{ magnitude, place, time, url }`.
  3. Return the count of alerts emitted (for test assertions).

### Integration test
- Mount `AlertEarthquakesModule` + `EventsModule`. Nothing else.
- Spy on `Logger.warn`.
- Emit a synthetic `earthquakes.synced` event with 2 earthquakes: one at mag 5.0, one at mag 6.5.
- Assert `Logger.warn` was called exactly once, with a message containing `"6.5"` and the place.
- This proves (a) the slice works in isolation, (b) the magnitude filter is correct, (c) a new consumer can be added without touching the producer.

### Wiring
`AlertEarthquakesModule` is added to `AppModule.imports`. Nothing else in the codebase changes. This single-line diff **is the point**: adding a consumer to an event-driven system means adding a consumer, full stop.

---

## 10. GitHub Actions CI

### Workflow: `.github/workflows/ci.yml`

**Triggers**: `push` to `main`, `pull_request`.

**Jobs (run in parallel for speed):**

1. **lint**
   - Setup Node 22 LTS, pnpm with cache.
   - `pnpm install --frozen-lockfile`.
   - `pnpm lint`.

2. **check-slices**
   - Setup Node 22, pnpm, `graphviz` (`sudo apt-get install -y graphviz`).
   - `pnpm install --frozen-lockfile`.
   - `pnpm check:slices`.
   - (Bonus) `pnpm graph:slices` and upload `docs/dependency-graph.svg` as a workflow artifact.

3. **test**
   - `services: postgres:17-alpine` with healthcheck on port 5432.
   - Setup Node 22, pnpm.
   - `pnpm install --frozen-lockfile`.
   - `cd apps/api && pnpm prisma migrate deploy`.
   - `pnpm test` with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/seismograph_test` and `CI=true`.

4. **build** (optional, `needs: [lint, check-slices, test]`) — verifies both apps compile.

### Rationale
- **Parallel jobs** — fastest feedback.
- **`services:` in CI, Testcontainers only locally** — one environment variable (`CI=true`) switches the behavior in `test-db.ts`. Same test code, different transport.
- **`--frozen-lockfile`** — no surprise version drift in CI.
- **Node 22 LTS** — Node 18 is EOL (April 2025), Node 20 is in maintenance, Node 22 is the active LTS in April 2026.
- **Postgres 17 alpine** — GA since September 2024, stable and aligned with prod.

---

## 11. Execution Order

1. **Write the 3 `CLAUDE.md` files** → user reviews → commit.
2. **Write the 7 ADRs** → user reviews → commit.
3. **Fix the `globe.utils` violation**, set up `.dependency-cruiser.cjs`, add `pnpm check:slices` / `pnpm graph:slices` scripts → run `pnpm check:slices` → commit. This happens *before* tests because it is a faster gate.
4. **User installs OrbStack** (`brew install orbstack`) and confirms it is running.
5. **Write `test-db.ts` helper** → write a smoke test that boots a PG container and connects → commit.
6. **Write 4 integration tests** in order: `list-earthquakes`, `get-earthquake`, `get-statistics`, `sync-earthquakes` (with mocked `UsgsFeedClient`) → run `pnpm test` → commit.
7. **Create the `alert-earthquakes` slice** by following the template in `apps/api/CLAUDE.md` (dogfooding) → write its integration test → run `pnpm test` → commit.
8. **Write `.github/workflows/ci.yml`** → push → verify CI passes on a PR → commit.
9. **Final commit**: update root README with links to the new docs and the CI status badge.

### Human-in-the-loop checkpoints

- After step 1 (3 CLAUDE.md files): user reviews wording before commit.
- After step 2 (ADRs): user reviews.
- Before step 5 (OrbStack): user confirms install is complete.
- After step 6 (all tests green locally): user sees the green run before push.
- After step 8 (CI green): final validation.

### Estimated duration
~2h30 if everything flows. Each step is committed separately so the git log tells the story.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OrbStack install hits permission issues on macOS | Document clear install steps in the CLAUDE.md / README; fallback to Colima if needed (documented in ADR 006 "Revisit if"). |
| Tests accidentally hit production DB | Explicit `DATABASE_URL` guardrail in `test-db.ts`, thrown before any query. Belt **and** braces: Testcontainers also overrides `DATABASE_URL` on start. |
| Test container slow to boot on first run | `.withReuse(true)` locally makes subsequent runs instant. First run downloads `postgres:17-alpine` (~80 MB) once, cached forever. |
| `dependency-cruiser` produces false positives on type-only imports | Config will use `tsPreCompilationDeps: true` to resolve TypeScript path aliases and type-only imports correctly. |
| CI cache miss on pnpm leads to slow installs | `actions/setup-node` with `cache: 'pnpm'` keyed on `pnpm-lock.yaml`. |
| `pnpm prisma migrate deploy` fails in CI before tests run | Migration is in its own step before the test command, so failure is attributed clearly. |
| Developer forgets to run `pnpm check:slices` locally | CI enforces it; local editor feedback can be added later via an ESLint-boundaries layer if desired (documented as a future enhancement). |
| Adding `alert-earthquakes` breaks `sync-earthquakes` via coupling | The integration test mounts only `AlertEarthquakesModule`; if a coupling exists, the test fails immediately. |

---

## 13. Out of Scope (documented for future passes)

- Frontend tests (React Testing Library + Vitest or Jest).
- E2E tests via supertest against the full AppModule.
- Husky + lint-staged pre-commit hooks.
- A `@seismograph/shared` build pipeline (currently types-only, consumed as TS).
- Bull Board UI for BullMQ monitoring.
- A real alerting integration in `alert-earthquakes` (email / webhook / Pushover).
- Migration of dev DB off production (planned post-MVP).
- Observability stack (logs aggregation, traces).
- Rate-limiting and auth on the NestJS API.

---

## 14. Success Criteria

This design is successfully implemented when all of the following are true:

1. A developer (or AI agent) can open Claude Code at the root of the repo, read the root `CLAUDE.md`, and follow the template in `apps/api/CLAUDE.md` to add a new vertical slice **without asking questions**.
2. `pnpm check:slices` passes locally and in CI, and produces `docs/dependency-graph.svg` showing slices as isolated islands connected only to `shared/`.
3. `pnpm test` runs 4+ integration test files against an ephemeral Postgres, each test file mounting only its target slice.
4. The `alert-earthquakes` slice exists, its test is green, and its commit diff contains **zero changes** to `sync-earthquakes`, `earthquake-events`, or any other existing slice (one-line addition to `AppModule.imports` excepted).
5. GitHub Actions runs `lint` / `check-slices` / `test` in parallel on every PR and blocks merges on any failure.
6. The 7 ADRs exist in `docs/adr/`, each under 30 lines, each with a "Revisit if" clause.
7. The known `globe.utils` cross-feature import has been eliminated.
