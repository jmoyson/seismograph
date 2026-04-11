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
