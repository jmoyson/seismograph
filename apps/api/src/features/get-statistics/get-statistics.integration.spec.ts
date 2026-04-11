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
