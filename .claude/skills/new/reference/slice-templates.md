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
