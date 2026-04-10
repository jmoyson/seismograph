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
