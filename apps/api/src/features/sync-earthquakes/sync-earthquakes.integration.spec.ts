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
