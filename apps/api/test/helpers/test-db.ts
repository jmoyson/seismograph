import { DynamicModule } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
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

  sharedUrl = container.getConnectionUri();
  assertNotProduction();
  applyPrismaSchema(sharedUrl);
  return sharedUrl;
}

export function stopTestDatabase(): void {
  // With `.withReuse()`, Testcontainers' Ryuk keeps the container alive across test runs.
  // We intentionally don't call stop() here — letting the container survive gives instant restarts.
  // In CI, there's no local container to stop (we use the GH Actions sidecar).
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
