import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/database/prisma.service';
import { UsgsFeedClient, UsgsFeature } from './usgs-feed.client';

@Injectable()
export class SyncEarthquakesService {
  private readonly logger = new Logger(SyncEarthquakesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usgsFeed: UsgsFeedClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async syncRecent(): Promise<{ total: number; synced: number }> {
    const features = await this.usgsFeed.fetchHourly();

    if (features.length === 0) {
      this.logger.log('No earthquakes to sync');
      return { total: 0, synced: 0 };
    }

    const entities = features.map((f) => this.mapToEntity(f));
    const synced = await this.upsert(entities);

    this.eventEmitter.emit('earthquakes.synced', {
      type: 'sync' as const,
      count: features.length,
      earthquakes: entities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Synced ${synced} earthquakes`);
    return { total: features.length, synced };
  }

  async seedHistory(): Promise<void> {
    this.logger.log('Seeding earthquake history (30 days)...');
    const features = await this.usgsFeed.fetchWeekly();

    if (features.length === 0) return;

    const entities = features.map((f) => this.mapToEntity(f));
    const count = await this.upsert(entities);
    this.logger.log(`Seeded ${count} earthquakes`);
  }

  private async upsert(
    entities: ReturnType<typeof this.mapToEntity>[],
  ): Promise<number> {
    let count = 0;
    // Batch upserts in chunks to avoid overwhelming the DB
    const chunkSize = 50;
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map((entity) =>
          this.prisma.earthquake.upsert({
            where: { id: entity.id },
            create: entity,
            update: {
              magnitude: entity.magnitude,
              place: entity.place,
              status: entity.status,
              significance: entity.significance,
              syncedAt: new Date(),
            },
          }),
        ),
      );
      count += results.length;
    }
    return count;
  }

  private mapToEntity(feature: UsgsFeature) {
    const { properties, geometry, id } = feature;
    return {
      id,
      magnitude: properties.mag,
      place: properties.place,
      time: new Date(properties.time),
      longitude: geometry.coordinates[0], // GeoJSON = [lng, lat, depth]
      latitude: geometry.coordinates[1],
      depth: geometry.coordinates[2],
      tsunami: properties.tsunami === 1,
      url: properties.url,
      status: properties.status,
      significance: properties.sig,
    };
  }
}
