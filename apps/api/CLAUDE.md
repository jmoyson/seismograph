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
