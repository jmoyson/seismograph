import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertEarthquakesService } from './alert-earthquakes.service';

@Injectable()
export class AlertEarthquakesListener {
  constructor(private readonly service: AlertEarthquakesService) {}

  @OnEvent('earthquakes.synced')
  handleSynced(
    payload: Parameters<AlertEarthquakesService['handleSyncedBatch']>[0],
  ): void {
    this.service.handleSyncedBatch(payload);
  }
}
