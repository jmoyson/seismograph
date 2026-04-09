import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncEarthquakesScheduler } from './sync-earthquakes.scheduler';
import { SyncEarthquakesProcessor } from './sync-earthquakes.processor';
import { SyncEarthquakesService } from './sync-earthquakes.service';
import { UsgsFeedClient } from './usgs-feed.client';

@Module({
  imports: [BullModule.registerQueue({ name: 'earthquake-sync' })],
  providers: [
    SyncEarthquakesScheduler,
    SyncEarthquakesProcessor,
    SyncEarthquakesService,
    UsgsFeedClient,
  ],
})
export class SyncEarthquakesModule {}
