import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncEarthquakesService } from './sync-earthquakes.service';

@Injectable()
export class SyncEarthquakesScheduler implements OnModuleInit {
  private readonly logger = new Logger(SyncEarthquakesScheduler.name);

  constructor(
    @InjectQueue('earthquake-sync') private readonly syncQueue: Queue,
    private readonly syncService: SyncEarthquakesService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initial seed on startup');
    await this.syncService.seedHistory();
    await this.triggerSync();
  }

  @Cron('*/2 * * * *')
  async triggerSync(): Promise<void> {
    this.logger.log('Triggering earthquake sync');
    await this.syncQueue.add(
      'sync-recent',
      {},
      {
        jobId: `sync-${Date.now()}`,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
