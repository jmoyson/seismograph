import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SyncEarthquakesService } from './sync-earthquakes.service';

@Processor('earthquake-sync')
export class SyncEarthquakesProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncEarthquakesProcessor.name);

  constructor(private readonly syncService: SyncEarthquakesService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing sync job ${job.id}`);
    try {
      const result = await this.syncService.syncRecent();
      this.logger.log(`Job ${job.id} done: ${result.synced} synced`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}
