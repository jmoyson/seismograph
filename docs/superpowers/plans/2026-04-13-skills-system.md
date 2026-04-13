# Skills System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 4 native Claude Code skills (`/onboard`, `/new`, `/new-plugin`, `/check`) with supporting reference files, a session-start hook for Superpowers recommendation, and updated docs — so any developer can build features by describing what they want.

**Architecture:** Native `.claude/skills/<name>/SKILL.md` files with frontmatter. `/new` has 4 reference files for code templates. `/new-plugin` references the shared plugin templates. Conventions stay in CLAUDE.md (no duplication). A session-start hook in `.claude/settings.json` checks for the Superpowers plugin.

**Tech Stack:** Claude Code skills system (SKILL.md + frontmatter), Markdown, JSON

**Spec:** `docs/superpowers/specs/2026-04-13-skills-system-design.md`

---

## Task overview

| Task | File(s) | Parallel group |
|------|---------|---------------|
| 1 | `.claude/settings.json` | A |
| 2 | `.claude/skills/new/reference/shared-types-guide.md` | A |
| 3 | `.claude/skills/new/reference/slice-templates.md` | A |
| 4 | `.claude/skills/new/reference/web-templates.md` | B |
| 5 | `.claude/skills/new/reference/plugin-templates.md` | B |
| 6 | `.claude/skills/new/SKILL.md` | B |
| 7 | `.claude/skills/new-plugin/SKILL.md` | C |
| 8 | `.claude/skills/check/SKILL.md` | C |
| 9 | `.claude/skills/onboard/SKILL.md` | C |
| 10 | `CLAUDE.md` + `README.md` | D |
| 11 | Verification | last |

Tasks within the same parallel group have no dependencies on each other and can be dispatched concurrently.

---

### Task 1: Create session-start hook for Superpowers check

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1: Create `.claude/settings.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash -c '[ -d \"$HOME/.claude/plugins/cache/claude-plugins-official/superpowers\" ] || echo \"RECOMMENDED: Install the Superpowers plugin for the best development experience on this project. Run: claude plugins add @anthropic/claude-code-superpowers\"'"
      }
    ]
  }
}
```

- [ ] **Step 2: Verify the file is valid JSON**

Run: `cat .claude/settings.json | python3 -m json.tool > /dev/null && echo "VALID JSON"`
Expected: `VALID JSON`

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add session-start hook for Superpowers plugin recommendation"
```

---

### Task 2: Create shared types guide

**Files:**
- Create: `.claude/skills/new/reference/shared-types-guide.md`

- [ ] **Step 1: Create directories**

```bash
mkdir -p .claude/skills/new/reference
```

- [ ] **Step 2: Create `shared-types-guide.md`**

```markdown
# Shared Types Guide

Rules for modifying `packages/shared/src/types.ts` — the single file that defines types shared between `apps/api`, `apps/web`, and `apps/superset-plugins`.

## When to add a type here

Only if the type is used by **2+ apps**. If a type is only used in one app, it stays in that app (e.g., a DTO in a backend slice, a component prop type in a frontend feature).

## Naming conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Entity | Noun | `Earthquake`, `Region` |
| Filters / params | Noun + "Filters" | `EarthquakeFilters`, `RegionFilters` |
| API response shape | Noun + purpose | `EarthquakeStats`, `RegionRanking` |
| SSE event | Descriptive | `SSEEvent` (already exists — extend if needed) |

## Field conventions

### Time fields

Use `string` (ISO 8601 format) in shared types. The backend serializes `Date` → `string` in JSON responses. The frontend parses `string` → `Date` when needed for display or calculation.

```typescript
// CORRECT
time: string;    // "2026-04-10T12:00:00Z"

// WRONG
time: Date;      // Date objects don't survive JSON serialization
```

### Nullable vs optional

- `| null` — the field **exists** but can have no value (e.g., `url: string | null`)
- `?:` — the field **may not be present** at all (e.g., in filters: `minMagnitude?: number`)

```typescript
// Entity: field always present, sometimes null
url: string | null;
status: string | null;

// Filters: field may be omitted entirely
minMagnitude?: number;
days?: number;
```

## Current types (reference)

The file currently exports:
- `Earthquake` — core entity (id, magnitude, place, time, latitude, longitude, depth, tsunami, url, status, significance)
- `EarthquakeFilters` — query parameters for list endpoint
- `EarthquakeStats` — aggregation response (period, counts, distribution)
- `SSEEvent` — real-time sync event payload

## Process

1. Add the new interface to `packages/shared/src/types.ts`
2. If it's a **new** export (not modifying an existing one), also add it to `packages/shared/src/index.ts` (currently just `export * from './types'`, so new types in `types.ts` are auto-exported)
3. Both `apps/api` and `apps/web` pick up changes immediately via pnpm workspace resolution — no build step needed for the shared package
4. Verify both apps still compile: `pnpm build`
```

- [ ] **Step 3: Verify file exists**

Run: `head -1 .claude/skills/new/reference/shared-types-guide.md`
Expected: `# Shared Types Guide`

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/new/reference/shared-types-guide.md
git commit -m "feat: add shared types guide for /new skill"
```

---

### Task 3: Create slice templates reference

**Files:**
- Create: `.claude/skills/new/reference/slice-templates.md`

This is the largest reference file — it contains code templates for all 6 backend slice types.

- [ ] **Step 1: Create `slice-templates.md`**

```markdown
# NestJS Slice Templates

Code templates for each backend slice type in `apps/api/src/features/`. All templates are extracted from real slices in this codebase.

## Naming conventions

- Directory: `kebab-case` (e.g., `get-region-ranking/`)
- Files: `<slice-name>.<type>.ts` (e.g., `get-region-ranking.controller.ts`)
- Classes: `PascalCase` (e.g., `GetRegionRankingController`, `GetRegionRankingModule`)
- Module import in `app.module.ts`: add alphabetically within the feature imports block

## Common patterns

### Module (every slice has one)

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
// Import only what THIS slice needs — never import from another slice

@Module({
  imports: [
    // TypeOrmModule.forFeature([Entity])    ← only if using DB
    // BullModule.registerQueue({ name: 'x' }) ← only if using queue
  ],
  controllers: [/* only if HTTP endpoint */],
  providers: [/* service, listener, scheduler, processor, etc. */],
})
export class SliceNameModule {}
```

### DTO with class-validator (for HTTP endpoints with query/body params)

```typescript
// <slice-name>.dto.ts
import { IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class SliceNameDto {
  // Query params arrive as strings — always @Transform to parse
  @IsOptional()
  @Transform(({ value }): number | undefined =>
    value !== undefined ? parseFloat(String(value)) : undefined,
  )
  @IsNumber()
  @Min(0)
  @Max(10)
  someParam?: number;

  // Enum params
  @IsOptional()
  @IsEnum(SomeEnum)
  sortBy?: SomeEnum = SomeEnum.DEFAULT;

  // Integer params
  @IsOptional()
  @Transform(({ value }): number | undefined =>
    value !== undefined ? parseInt(String(value), 10) : undefined,
  )
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}
```

### Integration test scaffold

```typescript
// <slice-name>.integration.spec.ts
import { TestingModule } from '@nestjs/testing';
import { createTestingModule, cleanDb } from '../../../test/helpers/test-db';
import { SliceNameModule } from './<slice-name>.module';
// Import the service or controller you need to test

describe('<slice-name> (integration)', () => {
  let moduleRef: TestingModule;
  // let service: SliceNameService;

  beforeAll(async () => {
    moduleRef = await createTestingModule(SliceNameModule);
    // service = moduleRef.get(SliceNameService);
  });

  beforeEach(async () => {
    await cleanDb(moduleRef);  // TRUNCATE all tables
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should do the main thing', async () => {
    // Arrange: insert test data via PrismaService if needed
    // Act: call the service/controller method
    // Assert: verify the result
  });
});
```

**Key test rules:**
- Mount ONLY the target module via `createTestingModule(SliceNameModule)` — never `AppModule`
- Never mock `PrismaService` — use the real test DB
- Mock only external boundaries (HTTP clients to external APIs)
- `cleanDb()` in `beforeEach` to isolate tests

### Rule A — when to skip the service

**No service needed** if the controller just does a single Prisma call with no business logic:
```typescript
// Controller injects PrismaService directly
constructor(private readonly prisma: PrismaService) {}
```

**Service needed** as soon as there is: filtering, aggregation, transformation, side effects (events, queue, logging), or more than one DB call.

---

## Type: Query (with service)

Reference: `list-earthquakes/`

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { SliceNameController } from './<slice-name>.controller';
import { SliceNameService } from './<slice-name>.service';

@Module({
  controllers: [SliceNameController],
  providers: [SliceNameService],
})
export class SliceNameModule {}
```

### Controller

```typescript
// <slice-name>.controller.ts
import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { SliceNameService } from './<slice-name>.service';
import { SliceNameDto } from './<slice-name>.dto';

@Controller('<route>')
export class SliceNameController {
  constructor(private readonly service: SliceNameService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handle(@Query() dto: SliceNameDto) {
    return this.service.execute(dto);
  }
}
```

### Service

```typescript
// <slice-name>.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SliceNameDto } from './<slice-name>.dto';

@Injectable()
export class SliceNameService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: SliceNameDto) {
    // Business logic: filtering, aggregation, transformation
    return this.prisma.earthquake.findMany({
      where: { /* build from dto */ },
      orderBy: { /* from dto */ },
      take: dto.limit || 100,
    });
  }
}
```

---

## Type: Query (no service — Rule A)

Reference: `get-earthquake/`

Use this when the controller does a single Prisma call with no business logic.

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { SliceNameController } from './<slice-name>.controller';

@Module({
  controllers: [SliceNameController],
})
export class SliceNameModule {}
```

### Controller

```typescript
// <slice-name>.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Controller('<route>')
export class SliceNameController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    const result = await this.prisma.earthquake.findUnique({
      where: { id },
    });
    if (!result) {
      throw new NotFoundException(`Resource ${id} not found`);
    }
    return result;
  }
}
```

No service file, no DTO file. The controller is the only provider.

---

## Type: Command (POST/PUT/DELETE)

No existing example in the codebase yet — this is a forward-looking template.

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { SliceNameController } from './<slice-name>.controller';
import { SliceNameService } from './<slice-name>.service';

@Module({
  controllers: [SliceNameController],
  providers: [SliceNameService],
})
export class SliceNameModule {}
```

### Controller

```typescript
// <slice-name>.controller.ts
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { SliceNameService } from './<slice-name>.service';
import { SliceNameDto } from './<slice-name>.dto';

@Controller('<route>')
export class SliceNameController {
  constructor(private readonly service: SliceNameService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handle(@Body() dto: SliceNameDto) {
    return this.service.execute(dto);
  }
}
```

### DTO (body validation)

```typescript
// <slice-name>.dto.ts
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SliceNameDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(10)
  value: number;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Service

```typescript
// <slice-name>.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SliceNameDto } from './<slice-name>.dto';

@Injectable()
export class SliceNameService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: SliceNameDto) {
    return this.prisma.someModel.create({
      data: { ...dto },
    });
  }
}
```

---

## Type: Worker (BullMQ background job)

Reference: `sync-earthquakes/`

Three-file pattern: scheduler adds jobs, processor dequeues and delegates, service has business logic.

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SliceNameScheduler } from './<slice-name>.scheduler';
import { SliceNameProcessor } from './<slice-name>.processor';
import { SliceNameService } from './<slice-name>.service';

@Module({
  imports: [BullModule.registerQueue({ name: '<queue-name>' })],
  providers: [SliceNameScheduler, SliceNameProcessor, SliceNameService],
})
export class SliceNameModule {}
```

### Scheduler

```typescript
// <slice-name>.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SliceNameScheduler {
  private readonly logger = new Logger(SliceNameScheduler.name);

  constructor(@InjectQueue('<queue-name>') private readonly queue: Queue) {}

  @Cron('*/5 * * * *')  // adjust schedule as needed
  async trigger(): Promise<void> {
    this.logger.log('Triggering job');
    await this.queue.add(
      '<job-name>',
      {},
      {
        jobId: `job-${Date.now()}`,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
```

### Processor

```typescript
// <slice-name>.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SliceNameService } from './<slice-name>.service';

@Processor('<queue-name>')
export class SliceNameProcessor extends WorkerHost {
  private readonly logger = new Logger(SliceNameProcessor.name);

  constructor(private readonly service: SliceNameService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id}`);
    try {
      await this.service.execute();
      this.logger.log(`Job ${job.id} done`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${job.id} failed: ${message}`);
      throw error;  // BullMQ handles retry via backoff config
    }
  }
}
```

### Service

```typescript
// <slice-name>.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class SliceNameService {
  private readonly logger = new Logger(SliceNameService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<{ processed: number }> {
    // Business logic here
    return { processed: 0 };
  }
}
```

### External API client (if needed)

```typescript
// <external>.client.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExternalClient {
  private readonly logger = new Logger(ExternalClient.name);

  async fetch(): Promise<any[]> {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }
}
```

Add to module providers. Mock this class (not PrismaService) in integration tests.

---

## Type: Event listener (reacts to events, no HTTP)

Reference: `alert-earthquakes/`

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { SliceNameService } from './<slice-name>.service';
import { SliceNameListener } from './<slice-name>.listener';

@Module({
  providers: [SliceNameService, SliceNameListener],
})
export class SliceNameModule {}
```

### Listener

```typescript
// <slice-name>.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SliceNameService } from './<slice-name>.service';

@Injectable()
export class SliceNameListener {
  constructor(private readonly service: SliceNameService) {}

  @OnEvent('<event.name>')
  handle(payload: Parameters<SliceNameService['handleEvent']>[0]): void {
    this.service.handleEvent(payload);
  }
}
```

### Service

```typescript
// <slice-name>.service.ts
import { Injectable, Logger } from '@nestjs/common';
import type { Earthquake } from '@seismograph/shared';

@Injectable()
export class SliceNameService {
  private readonly logger = new Logger(SliceNameService.name);

  handleEvent(payload: { earthquakes: Earthquake[]; timestamp: string }): void {
    // React to the event — filter, transform, notify, etc.
  }
}
```

### Integration test (event listener specific)

```typescript
// <slice-name>.integration.spec.ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { createTestingModule } from '../../../test/helpers/test-db';
import { SliceNameModule } from './<slice-name>.module';
import { SliceNameService } from './<slice-name>.service';

describe('<slice-name> (integration)', () => {
  let moduleRef: TestingModule;
  let service: SliceNameService;
  let emitter: EventEmitter2;

  beforeAll(async () => {
    moduleRef = await createTestingModule(SliceNameModule);
    service = moduleRef.get(SliceNameService);
    emitter = moduleRef.get(EventEmitter2);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('handles the event directly via service', () => {
    const result = service.handleEvent({
      earthquakes: [/* test data */],
      timestamp: '2026-04-10T12:00:00Z',
    });
    // Assert on result
  });

  it('reacts to the event via EventEmitter2 (end-to-end)', () => {
    emitter.emit('<event.name>', {
      earthquakes: [/* test data */],
      timestamp: '2026-04-10T12:00:00Z',
    });
    // Assert side effects (logs, calls, etc.)
  });
});
```

---

## Type: SSE (Server-Sent Events stream)

Reference: `earthquake-events/`

### Module

```typescript
// <slice-name>.module.ts
import { Module } from '@nestjs/common';
import { SliceNameController } from './<slice-name>.controller';

@Module({
  controllers: [SliceNameController],
})
export class SliceNameModule {}
```

### Controller

```typescript
// <slice-name>.controller.ts
import { Controller, Sse } from '@nestjs/common';
import { Observable, Subject, interval, merge, map } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';

interface MessageEvent {
  data: string | object;
  type?: string;
  id?: string;
  retry?: number;
}

@Controller('<route>')
export class SliceNameController {
  private readonly clients = new Set<Subject<any>>();

  @Sse('<path>')
  stream(): Observable<MessageEvent> {
    const client = new Subject<any>();
    this.clients.add(client);

    client.subscribe({
      complete: () => this.clients.delete(client),
    });

    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: '', type: 'heartbeat' }) as MessageEvent),
    );

    const data$ = client.asObservable().pipe(
      map(
        (payload) =>
          ({
            data: JSON.stringify(payload),
            type: '<event-type>',
            retry: 10000,
          }) as MessageEvent,
      ),
    );

    return merge(data$, heartbeat$);
  }

  @OnEvent('<domain.event>')
  handleEvent(payload: any) {
    this.clients.forEach((client) => client.next(payload));
  }
}
```

No service needed — the controller manages SSE client connections directly.

---

## After creating a slice

1. Import the module in `apps/api/src/app.module.ts`:
   ```typescript
   import { SliceNameModule } from './features/<slice-name>/<slice-name>.module';
   // Add to @Module imports array, alphabetically within feature imports
   ```

2. Run verification:
   ```bash
   pnpm check:slices    # no cross-slice imports
   pnpm build           # compiles
   pnpm test            # tests pass
   ```
```

- [ ] **Step 2: Verify file exists and has all 6 types**

Run: `grep -c "^## Type:" .claude/skills/new/reference/slice-templates.md`
Expected: `6`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new/reference/slice-templates.md
git commit -m "feat: add NestJS slice templates for /new skill"
```

---

### Task 4: Create web templates reference

**Files:**
- Create: `.claude/skills/new/reference/web-templates.md`

- [ ] **Step 1: Create `web-templates.md`**

```markdown
# React Frontend Templates

Code templates for React features and hooks in `apps/web/src/`. All templates follow the patterns established in the existing codebase.

## Hook template (data fetching with TanStack Query)

Reference: `src/hooks/useEarthquakes.ts`

```typescript
// src/hooks/use<Name>.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { SomeType } from '@seismograph/shared';

export function use<Name>(params?: { /* optional params */ }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['<key>', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      // Build query params from the params object
      // if (params?.someField) queryParams.set('someField', String(params.someField));

      const { data } = await apiClient.get<SomeType[]>(`/<endpoint>?${queryParams}`);
      return data;
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
}
```

**Rules:**
- Always import `apiClient` from `../api/client` — never create a new Axios instance
- Always import types from `@seismograph/shared` — never redefine them locally
- Query key should be descriptive and include params for proper cache invalidation

## Hook template (with SSE real-time updates)

Reference: `src/hooks/useEarthquakes.ts` (combines useQuery + useSSE)

```typescript
// src/hooks/use<Name>.ts
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSSE } from './useSSE';
import { apiClient } from '../api/client';
import type { SomeType } from '@seismograph/shared';

export function use<Name>(params?: { /* optional params */ }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['<key>', params],
    queryFn: async () => {
      const { data } = await apiClient.get<SomeType[]>('/<endpoint>');
      return data;
    },
  });

  const handleSSEMessage = useCallback(() => {
    refetch();
  }, [refetch]);

  const { isConnected } = useSSE({
    url: `${import.meta.env.VITE_API_URL}/events/<stream-name>`,
    onMessage: handleSSEMessage,
    eventType: '<event-type>',
  });

  return {
    data: data || [],
    isLoading,
    error,
    isConnected,
    refetch,
  };
}
```

**Rules:**
- There is exactly ONE `EventSource` consumer: `src/hooks/useSSE.ts`. Never create your own `EventSource`.
- The SSE hook triggers a `refetch()` on message — it does NOT try to merge SSE data with query data.

## Feature component template

Reference: `src/features/earthquake-list/EarthquakeList.tsx`

```tsx
// src/features/<name>/<Name>.tsx
import { use<Name> } from '../../hooks/use<Name>';

export function <Name>() {
  const { data, isLoading, error } = use<Name>();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <p style={styles.secondaryText}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#e53935' }}>Error loading data</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Title</h2>
      {/* Render data */}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 12px 0',
    color: 'white',
  },
  secondaryText: {
    fontSize: 12,
    color: '#aaa',
    margin: 0,
  },
};
```

## Style conventions

Extracted from the existing dark-theme UI:

| Property | Value |
|----------|-------|
| Panel background | `rgba(0, 0, 0, 0.85)` |
| Primary text | `white` |
| Secondary text | `#aaa` |
| Tertiary text | `#888` |
| Error text | `#e53935` |
| Border radius (panels) | 8–12px |
| Font size (data) | 11–14px |
| Font size (titles) | 16–20px |
| Padding (panels) | 12–16px |

For earthquake-specific color coding, import from `src/shared/utils/formatting.ts`:
```typescript
import { getColorByMagnitude, timeAgo } from '../../shared/utils/formatting';
```

## Integration with App.tsx

After creating a feature component:

1. Import it at the top of `src/App.tsx`
2. Add it to the JSX layout
3. Position it using absolute/fixed positioning or flex layout depending on the design
4. Connect it to existing state if needed (e.g., selected earthquake, active filters)

## Feature isolation rule

A feature in `src/features/<feature>/` MUST NEVER import from another feature. Allowed imports:

1. npm packages
2. `../../shared/*` (utilities, formatting)
3. `../../hooks/*` (shared React hooks)
4. `../../api/client` (the Axios instance)
5. `@seismograph/shared` (cross-app types)
6. Other files in the same feature

If a utility is needed by 2+ features, it belongs in `src/shared/utils/`.
```

- [ ] **Step 2: Verify file exists**

Run: `head -1 .claude/skills/new/reference/web-templates.md`
Expected: `# React Frontend Templates`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new/reference/web-templates.md
git commit -m "feat: add React frontend templates for /new skill"
```

---

### Task 5: Create plugin templates reference

**Files:**
- Create: `.claude/skills/new/reference/plugin-templates.md`

- [ ] **Step 1: Create `plugin-templates.md`**

```markdown
# Superset Plugin Templates

Code templates for custom Apache Superset visualization plugins in `apps/superset-plugins/src/`. All templates follow the patterns established by `MagnitudePulsePlugin` and `SeismoGlobePlugin`.

## File structure (every plugin)

```
apps/superset-plugins/src/<Name>Plugin/
├── index.ts              ← ChartPlugin subclass with metadata
├── buildQuery.ts         ← FormData → SQL QueryObject
├── controlPanel.ts       ← UI configuration panel
├── transformProps.ts     ← SQL rows → React props
├── <Name>.tsx            ← React visualization component
└── types.ts              ← TypeScript interfaces
```

## 1. types.ts

Define three interfaces: one for the raw event/row data, one for component props, one for form data.

```typescript
// types.ts
export interface <Name>Event {
  // Mapped from SQL columns by transformProps
  time: number;       // epoch ms
  metric: number;     // primary metric
  label: string;      // display label
}

export interface <Name>Props {
  width: number;      // from Superset container
  height: number;     // from Superset container
  data: <Name>Event[];
}

export interface <Name>FormData {
  time_column: string;
  metric_column: string;
  label_column: string;
  row_limit: number;
}
```

## 2. index.ts — Plugin class

```typescript
// index.ts
import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { PLACEHOLDER_THUMBNAIL } from '../shared/thumbnail';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class <Name>Plugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./<Name>'),
      metadata: new ChartMetadata({
        behaviors: [Behavior.InteractiveChart],
        category: '<Category>',  // 'Map' | 'Time Series' | 'Correlation' | 'Distribution' | 'Custom'
        description: '<What this chart does — one sentence>',
        name: '<Human Readable Name>',
        tags: ['<Tag>', 'Experimental'],
        thumbnail: PLACEHOLDER_THUMBNAIL,
      }),
      transformProps,
    });
  }
}
```

**Important:**
- `behaviors` and `thumbnail` are REQUIRED on Superset 6.x — omitting them causes runtime errors
- `loadChart` uses dynamic import for code splitting
- Plugin key (set during `.configure({ key: '...' })` in the registry) must be unique across all plugins

## 3. controlPanel.ts

```typescript
// controlPanel.ts
import { ControlPanelConfig } from '@superset-ui/chart-controls';

const columnChoices = (state: any) =>
  (state?.datasource?.columns ?? []).map((c: any) => [c.column_name, c.column_name]);

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: '<Section Name>',
      expanded: true,
      controlSetRows: [
        [
          {
            name: '<control_name>',
            config: {
              type: 'SelectControl',
              label: '<Display Label>',
              description: '<Help text for the user>',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: '<default_column>',
            },
          },
        ],
        // Add more controls as needed
      ],
    },
    {
      label: 'Display Options',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'row_limit',
            config: {
              type: 'SliderControl',
              label: 'Row Limit',
              description: 'Maximum number of data points to plot',
              min: 100,
              max: 5000,
              step: 100,
              default: 500,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
```

**Pattern:** Always use `mapStateToProps` with `columnChoices(state)` to list dataset columns dynamically. Always include `row_limit` with a sensible default.

## 4. buildQuery.ts

```typescript
// buildQuery.ts
import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const {
    time_column = 'time',
    metric_column = 'magnitude',
    label_column = 'place',
    row_limit,
  } = formData as QueryFormData & {
    time_column?: string;
    metric_column?: string;
    label_column?: string;
  };

  const columns = [time_column, metric_column, label_column];
  const limit = Number(row_limit) || 500;

  return buildQueryContext(formData, (baseQueryObject) => [
    {
      ...baseQueryObject,
      columns,
      orderby: [[time_column, true]],  // true = ascending
      row_limit: limit,
    },
  ]);
}
```

**Rules:**
- Select only the columns needed — don't `SELECT *`
- Don't use `GROUP BY` unless the visualization aggregates data
- Set `orderby` and `row_limit` explicitly

## 5. transformProps.ts

```typescript
// transformProps.ts
import { ChartProps } from '@superset-ui/core';
import { <Name>Props, <Name>Event } from './types';

export default function transformProps(chartProps: ChartProps): <Name>Props {
  const { width, height, formData, queriesData } = chartProps;
  const rows: any[] = (queriesData?.[0] as any)?.data ?? [];

  const {
    time_column = 'time',
    metric_column = 'magnitude',
    label_column = 'place',
  } = formData as Record<string, any>;

  // Normalize temporal columns — Superset can return epoch, Date, or ISO string
  const toEpoch = (raw: unknown): number => {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    if (raw instanceof Date) return raw.getTime();
    return new Date(String(raw)).getTime();
  };

  const data: <Name>Event[] = rows
    .map((row) => ({
      time: toEpoch(row[time_column]),
      metric: Number(row[metric_column]),
      label: String(row[label_column] ?? ''),
    }))
    .filter((event) => Number.isFinite(event.time) && Number.isFinite(event.metric));

  return { width, height, data };
}
```

**Key rule:** The React component should NEVER know about SQL column names. `transformProps` handles the mapping from column names (from `formData`) to typed props.

## 6. Component (<Name>.tsx)

```tsx
// <Name>.tsx
import React from 'react';
import { <Name>Props } from './types';
import { getColorByMetric, getSizeByMetric } from '../shared/colors';

export default function <Name>(props: <Name>Props) {
  const { width, height, data } = props;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      {/* Visualization here — use d3, recharts, raw SVG/Canvas, etc. */}
    </div>
  );
}
```

**Rules:**
- Pure React component — accepts `width`, `height`, and typed data props
- Use `getColorByMetric()` and `getSizeByMetric()` from `../shared/colors` for consistency
- Component must be responsive to the `width`/`height` provided by Superset

## Color utilities (shared/colors.ts)

Already exists at `apps/superset-plugins/src/shared/colors.ts`:

- `getColorByMetric(value)` — green (<3), yellow (<4), orange (<5), red (<6), dark red (<7), purple (7+)
- `getSizeByMetric(value)` — exponential scaling: `Math.pow(1.5, value) * 0.3`
- `getAltitudeByMetric(value)` — linear: `Math.max(0.01, value / 30)`

## Registration

After creating the plugin, export it from `apps/superset-plugins/src/index.ts`:

```typescript
export { default as <Name>Plugin } from './<Name>Plugin';
```

## Verification

```bash
pnpm --filter @seismograph/superset-plugins build
```

Must succeed. The plugin will be included in the next Docker build of Superset.
```

- [ ] **Step 2: Verify file exists**

Run: `head -1 .claude/skills/new/reference/plugin-templates.md`
Expected: `# Superset Plugin Templates`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new/reference/plugin-templates.md
git commit -m "feat: add Superset plugin templates for /new and /new-plugin skills"
```

---

### Task 6: Create `/new` skill

**Files:**
- Create: `.claude/skills/new/SKILL.md`

- [ ] **Step 1: Create `SKILL.md`**

````markdown
---
name: new
description: Generate a complete feature across all layers of Seismograph — backend slice, frontend component, shared types. Use when someone wants to add a feature, endpoint, worker, event listener, UI component, or any new functionality described in natural language.
allowed-tools: Read Grep Glob Bash(pnpm check:slices) Bash(pnpm dev:api) Bash(pnpm dev:web) Bash(pnpm build) Bash(pnpm test)
---

# Feature Generator

Generate a complete feature across any combination of layers in the Seismograph project. Conventions are enforced automatically — the generated code follows the same patterns as existing slices and features.

User request: $ARGUMENTS

## Live repo state

### Current backend slices
!`ls apps/api/src/features/`

### Current frontend features
!`ls apps/web/src/features/`

### Current shared types
!`grep "^export interface" packages/shared/src/types.ts`

---

## Process

### Step 1: Understand the requirement

If `$ARGUMENTS` already specifies the feature clearly (e.g., "query slice get-regions"), skip the questions and go directly to the plan. Otherwise, ask only what's not already clear:

1. **What is the feature?** (one sentence)
2. **Which layers?** Backend / Frontend / Shared types / combination
3. **Backend slice type?** (only if backend involved)
   - **Query** — read-only GET endpoint (like `list-earthquakes`)
   - **Command** — write POST/PUT/DELETE endpoint
   - **Worker** — background job via BullMQ (like `sync-earthquakes`)
   - **Event listener** — reacts to events, no HTTP (like `alert-earthquakes`)
   - **SSE** — Server-Sent Events stream (like `earthquake-events`)
   - **Hybrid** — combination
4. **New data needed?** New Prisma model, new columns, external API?

### Step 2: Plan

List every file to create or modify, grouped by layer. Use this format:

```
## Plan

### Shared types (if needed)
- MODIFY packages/shared/src/types.ts → add <Interface> interface

### Backend slice: <name> (<type>)
- CREATE apps/api/src/features/<name>/<name>.module.ts
- CREATE apps/api/src/features/<name>/<name>.controller.ts
- CREATE ... (only the files needed for this slice type)
- MODIFY apps/api/src/app.module.ts → import <Name>Module

### Frontend feature: <name> (if needed)
- CREATE apps/web/src/features/<name>/<Name>.tsx
- CREATE apps/web/src/hooks/use<Name>.ts
- MODIFY apps/web/src/App.tsx → import <Name>
```

**Present the plan and wait for user approval before generating any code.**

### Step 3: Generate code

Follow this strict order:

1. **Shared types first** — see [shared-types-guide.md](reference/shared-types-guide.md)
2. **Backend slice** — see [slice-templates.md](reference/slice-templates.md) for the matching type
3. **Frontend feature** — see [web-templates.md](reference/web-templates.md) if frontend is involved
4. **Superset plugin** — see [plugin-templates.md](reference/plugin-templates.md) if Superset is involved
5. **Update registrations** — AppModule imports, App.tsx imports

### Step 4: Verify

Run in this order, fix any issues before proceeding:

```bash
pnpm check:slices    # slice isolation — no cross-slice imports
pnpm build           # both apps compile
pnpm test            # all tests pass
```

### Step 5: Summary

After all checks pass, report:

```
## Done

### Files created/modified
- (list every file)

### New API endpoints (if any)
- METHOD /api/<route> — description

### How to test
- (manual testing instructions)
```
````

- [ ] **Step 2: Verify frontmatter is correct**

Run: `head -5 .claude/skills/new/SKILL.md`
Expected: Lines starting with `---`, containing `name: new` and `description:`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new/SKILL.md
git commit -m "feat: add /new skill — the feature generator"
```

---

### Task 7: Create `/new-plugin` skill

**Files:**
- Create: `.claude/skills/new-plugin/SKILL.md`

- [ ] **Step 1: Create directories and SKILL.md**

```bash
mkdir -p .claude/skills/new-plugin
```

````markdown
---
name: new-plugin
description: Generate a custom Apache Superset visualization plugin for Seismograph. Use when someone wants to create a new chart type, visualization, or Superset plugin.
paths: "apps/superset-plugins/src/**"
allowed-tools: Read Grep Glob Bash(pnpm --filter @seismograph/superset-plugins build)
---

# Superset Plugin Generator

Generate a custom Apache Superset visualization plugin following the project's established patterns.

User request: $ARGUMENTS

## Live state

### Existing plugins
!`ls apps/superset-plugins/src/ | grep Plugin`

### Plugin registry
!`cat apps/superset-plugins/src/index.ts`

---

## Process

### Step 1: Understand

If `$ARGUMENTS` specifies the plugin clearly, skip to the plan. Otherwise ask:

1. **What does the chart visualize?** (one sentence)
2. **Which SQL columns does it need?** (from earthquakes table or custom dataset)
3. **What should the user configure?** (column selectors, limits, color options)
4. **Rendering library?** (raw SVG/Canvas, d3, recharts, react-globe.gl, other)

### Step 2: Plan

```
## Plan: <Name>Plugin

- CREATE apps/superset-plugins/src/<Name>Plugin/types.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/index.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/controlPanel.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/buildQuery.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/transformProps.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/<Name>.tsx
- MODIFY apps/superset-plugins/src/index.ts → add export
```

**Wait for user approval.**

### Step 3: Generate

Follow the templates in [plugin-templates.md](../new/reference/plugin-templates.md). Create files in this order:

1. `types.ts` — interfaces (event data, component props, form data)
2. `index.ts` — ChartPlugin subclass with metadata
3. `controlPanel.ts` — ControlPanelConfig with column selectors
4. `buildQuery.ts` — select only needed columns
5. `transformProps.ts` — map SQL rows to typed React props
6. `<Name>.tsx` — pure React component

### Step 4: Register & Verify

1. Add export to `apps/superset-plugins/src/index.ts`
2. Verify build:
   ```bash
   pnpm --filter @seismograph/superset-plugins build
   ```

### Step 5: Summary

Report: plugin key, chart name, category, how to test in Superset.
````

- [ ] **Step 2: Verify frontmatter**

Run: `head -5 .claude/skills/new-plugin/SKILL.md`
Expected: Lines containing `name: new-plugin` and `paths:`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new-plugin/SKILL.md
git commit -m "feat: add /new-plugin skill — Superset plugin generator"
```

---

### Task 8: Create `/check` skill

**Files:**
- Create: `.claude/skills/check/SKILL.md`

- [ ] **Step 1: Create directories and SKILL.md**

```bash
mkdir -p .claude/skills/check
```

````markdown
---
name: check
description: Verify code correctness — compilation, slice isolation, tests, and convention compliance. Use after making changes, before committing, or when something seems broken.
allowed-tools: Bash(pnpm check:slices) Bash(pnpm build) Bash(pnpm test) Bash(pnpm lint) Read Grep Glob
---

# Smart Verification

Run all quality checks with intelligent remediation. Not just pass/fail — explains WHY something failed and HOW to fix it using this project's conventions.

## Step 1: Compile check

```bash
pnpm build
```

If compilation fails:
- Read the error message
- Identify the file and line
- Suggest the specific fix (missing import, type mismatch, etc.)

## Step 2: Slice isolation

```bash
pnpm check:slices
```

If a cross-slice import is detected, suggest one of:
- **Move to `src/shared/`** if it's a utility used by multiple slices
- **Use `EventEmitter2`** if it's cross-slice communication (see `alert-earthquakes` for the pattern)
- **Move to `@seismograph/shared`** if it's a type used across apps (api + web)

## Step 3: Convention audit

Scan recently changed files for common mistakes. Check each of these:

### Backend conventions
- **Rule A violation**: service exists but only wraps a single Prisma call → suggest removing the service and injecting `PrismaService` directly in the controller
- **Cross-slice import**: any file in `features/<slice>/` importing from `features/<other-slice>/` → violation of the golden rule
- **Direct PrismaClient**: `new PrismaClient()` anywhere → must use `PrismaService` injection
- **Missing module registration**: new slice module not imported in `apps/api/src/app.module.ts`
- **Missing integration test**: slice directory has no `*.integration.spec.ts` file

### Frontend conventions
- **Cross-feature import**: any file in `features/<feature>/` importing from `features/<other>/` → move to `shared/` or `hooks/`
- **Type redefinition**: interface that duplicates one from `@seismograph/shared` → import from shared
- **Direct EventSource**: `new EventSource()` outside `hooks/useSSE.ts` → use the hook
- **Direct axios**: `axios.create()` or `axios.get()` outside `api/client.ts` → use `apiClient`
- **Missing App.tsx import**: new feature component not imported in App.tsx

### Superset conventions
- **Missing export**: plugin not exported from `apps/superset-plugins/src/index.ts`
- **Missing behaviors**: ChartMetadata without `behaviors: [Behavior.InteractiveChart]`
- **Missing thumbnail**: ChartMetadata without `thumbnail` property

## Step 4: Tests

```bash
pnpm test
```

If tests fail:
- Read the failure output
- Identify the failing test and the root cause
- Suggest the specific fix

## Step 5: Report

Format results as:

```
## Check results

- [PASS] Compilation
- [PASS] Slice isolation
- [PASS] Conventions (or list specific warnings)
- [PASS] Tests (N suites, M tests)
```

Use `[WARN]` for convention issues that aren't errors but should be fixed. Use `[FAIL]` for hard failures.
````

- [ ] **Step 2: Verify frontmatter**

Run: `head -5 .claude/skills/check/SKILL.md`
Expected: Lines containing `name: check`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/check/SKILL.md
git commit -m "feat: add /check skill — smart verification with remediation"
```

---

### Task 9: Create `/onboard` skill

**Files:**
- Create: `.claude/skills/onboard/SKILL.md`

- [ ] **Step 1: Create directories and SKILL.md**

```bash
mkdir -p .claude/skills/onboard
```

````markdown
---
name: onboard
description: Interactive codebase tour for new developers. Use when someone is new to the Seismograph project or asks how the project works, what the architecture is, or where to start.
disable-model-invocation: true
---

# Welcome to Seismograph

Interactive onboarding for new developers. This tour adapts to your role and gives you everything you need to start contributing.

## Live repo state

### Backend slices
!`ls apps/api/src/features/`

### Frontend features
!`ls apps/web/src/features/`

### Superset plugins
!`ls apps/superset-plugins/src/ | grep Plugin`

### Recent activity
!`git log --oneline -5`

### Superpowers plugin
!`[ -d "$HOME/.claude/plugins/cache/claude-plugins-official/superpowers" ] && echo "INSTALLED" || echo "NOT_INSTALLED"`

---

## Tour flow

### 1. Check Superpowers plugin

If the dynamic context above shows `NOT_INSTALLED`, start with:

> **Recommended:** Install the Superpowers plugin for brainstorming, TDD, debugging, and plan execution workflows that pair with this project's skills:
>
> ```bash
> claude plugins add @anthropic/claude-code-superpowers
> ```

### 2. Ask the developer's role

> What's your focus on this project?
>
> **(a)** Backend / NestJS
> **(b)** Frontend / React
> **(c)** Superset plugins
> **(d)** Full-stack

### 3. Architecture overview (tailored to role)

Explain Vertical Slice Architecture and the golden rule. Read and reference `CLAUDE.md` for the authoritative conventions.

**For Backend developers:**
- Walk through these reference slices, reading key files:
  - `sync-earthquakes/` — **Worker** pattern: scheduler + processor + service + BullMQ queue
  - `list-earthquakes/` — **Query** pattern: controller + service + DTO with class-validator
  - `get-earthquake/` — **Rule A** pattern: no service, controller injects PrismaService directly
  - `alert-earthquakes/` — **Event listener** pattern: reacts to `earthquakes.synced` via EventEmitter2
  - `earthquake-events/` — **SSE** pattern: manages client connections with RxJS Subject
- Explain shared modules: `src/shared/database/`, `src/shared/events/`, `src/shared/queue/`
- Show test conventions: read `apps/api/test/helpers/test-db.ts`, explain Testcontainers + real DB

**For Frontend developers:**
- Walk through these features, reading key files:
  - `globe/` — main 3D visualization with react-globe.gl
  - `earthquake-list/` — data list consuming `useEarthquakes` hook
  - `statistics/` — dashboard consuming `useStatistics` hook
- Explain the hooks pattern: `src/hooks/useEarthquakes.ts` (TanStack Query + SSE)
- Explain the SSE pattern: `src/hooks/useSSE.ts` (single EventSource consumer)
- Show the API client: `src/api/client.ts`

**For Superset developers:**
- Walk through `MagnitudePulsePlugin/` file by file:
  - `index.ts` → plugin registration with ChartPlugin/ChartMetadata
  - `controlPanel.ts` → dynamic column selection with mapStateToProps
  - `buildQuery.ts` → SQL query construction with buildQueryContext
  - `transformProps.ts` → SQL rows to typed React props (column name mapping)
  - `MagnitudePulse.tsx` → pure React component
  - `types.ts` → TypeScript interfaces
- Show shared utilities: `src/shared/colors.ts`, `src/shared/thumbnail.ts`

**For Full-stack developers:**
- Condensed version: one reference slice (list-earthquakes), one frontend feature (earthquake-list), the hook that connects them, and how SSE provides real-time updates

### 4. Key conventions

Highlight the critical rules (read from CLAUDE.md files):
- **The golden rule**: slices/features never import from each other
- **Rule A**: no service if it's just a single Prisma call
- **Cross-slice communication**: EventEmitter2, never direct imports
- **Tests**: real DB via Testcontainers, never mock PrismaService

### 5. ADR tour

List all Architecture Decision Records with one-line summaries. Read titles from `docs/adr/`:

| ADR | Decision |
|-----|----------|
| 001 | Vertical Slice Architecture over layered |
| 002 | Server-Sent Events over WebSocket |
| 003 | BullMQ over direct cron |
| 004 | pnpm workspaces over Turborepo |
| 005 | USGS feed polling pattern |
| 006 | Testcontainers + OrbStack for integration tests |
| 007 | dependency-cruiser for slice isolation |

Suggest the developer read the ADRs relevant to their role.

### 6. Dev setup

```bash
brew install orbstack graphviz  # prerequisites (tests + graph generation)
pnpm install
pnpm dev                        # starts api + web in parallel
pnpm test                       # runs all tests (requires OrbStack/Docker)
pnpm check:slices               # verifies slice isolation
```

### 7. Close

> You're all set! Here's how to build things:
>
> - **`/new <description>`** — generate a complete feature (backend + frontend + types)
> - **`/new-plugin <description>`** — generate a Superset visualization plugin
> - **`/check`** — verify your code before committing
>
> Example: `/new ranking of most active seismic regions`
````

- [ ] **Step 2: Verify frontmatter**

Run: `head -5 .claude/skills/onboard/SKILL.md`
Expected: Lines containing `name: onboard` and `disable-model-invocation: true`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/onboard/SKILL.md
git commit -m "feat: add /onboard skill — interactive codebase tour"
```

---

### Task 10: Update CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md` (append skills section after the "Extension pattern" section)
- Modify: `README.md` (add "Development with Claude Code" section after "Commands")

- [ ] **Step 1: Read current CLAUDE.md to find insertion point**

Run: `tail -5 CLAUDE.md`
Expected: The last lines of the "Extension pattern" section.

- [ ] **Step 2: Append skills section to CLAUDE.md**

Add this section at the end of `CLAUDE.md`, after the "Extension pattern: nested CLAUDE.md" section:

```markdown
## Skills system

This project has native Claude Code skills in `.claude/skills/`. Available skills:

- `/onboard` — Interactive codebase tour for new developers
- `/new <description>` — Generate a complete feature across all layers (backend, frontend, shared types)
- `/new-plugin <description>` — Generate a Superset visualization plugin
- `/check` — Verify code correctness with smart remediation

When asked to add a feature, use `/new`. When asked about the project, suggest `/onboard`.

### Recommended plugin: Superpowers

Install the [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers) for brainstorming, TDD, debugging, and plan execution workflows:

```bash
claude plugins add @anthropic/claude-code-superpowers
```

A session-start hook will remind you if it's not installed.
```

- [ ] **Step 3: Read current README.md to find insertion point**

Run: `cat README.md`

- [ ] **Step 4: Add "Development with Claude Code" section to README.md**

Insert after the "Commands" section, before the end of the file:

```markdown
## Development with Claude Code

This project includes [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) that encode architecture conventions and automate feature generation.

### Prerequisites

Install the Superpowers plugin (recommended — provides brainstorming, TDD, debugging workflows):

```bash
claude plugins add @anthropic/claude-code-superpowers
```

### Available skills

| Command | What it does |
|---------|-------------|
| `/onboard` | Interactive tour — architecture, conventions, dev setup |
| `/new <description>` | Generate a feature end-to-end (types → backend → frontend) |
| `/new-plugin <description>` | Generate a Superset visualization plugin |
| `/check` | Verify compilation, slice isolation, tests, conventions |

Example: `/new ranking of most active seismic regions` generates shared types, a backend query slice, a frontend panel, and verifies everything compiles.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add skills system and Superpowers recommendation to CLAUDE.md and README.md"
```

---

### Task 11: Verification

Run these checks to confirm everything is in place.

- [ ] **Step 1: Verify all files exist**

Run:
```bash
echo "=== Settings ===" && cat .claude/settings.json | python3 -m json.tool > /dev/null && echo "settings.json: VALID JSON"
echo "=== Skills ===" && ls -la .claude/skills/onboard/SKILL.md .claude/skills/new/SKILL.md .claude/skills/new-plugin/SKILL.md .claude/skills/check/SKILL.md
echo "=== References ===" && ls -la .claude/skills/new/reference/
echo "=== Frontmatter ===" && for f in .claude/skills/*/SKILL.md; do echo "$f: $(head -1 $f)"; done
```

Expected: All files exist, settings.json is valid JSON, all SKILL.md files start with `---`.

- [ ] **Step 2: Verify CLAUDE.md has skills section**

Run: `grep -c "Skills system" CLAUDE.md`
Expected: `1` (or more)

- [ ] **Step 3: Verify README.md has Claude Code section**

Run: `grep -c "Development with Claude Code" README.md`
Expected: `1`

- [ ] **Step 4: Verify slice isolation still passes**

Run: `pnpm check:slices`
Expected: No violations (skills files don't affect this, but verify nothing broke)

- [ ] **Step 5: Verify build still passes**

Run: `pnpm build`
Expected: Both apps compile successfully

- [ ] **Step 6: Final commit check**

Run: `git log --oneline -12`
Expected: See all the commits from tasks 1-10
