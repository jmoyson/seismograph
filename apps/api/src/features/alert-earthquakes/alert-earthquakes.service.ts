import { Injectable, Logger } from '@nestjs/common';
import type { Earthquake } from '@seismograph/shared';

interface SyncedBatchPayload {
  type: 'sync';
  count: number;
  earthquakes: Earthquake[];
  timestamp: string;
}

const ALERT_THRESHOLD = 6.0;

@Injectable()
export class AlertEarthquakesService {
  private readonly logger = new Logger(AlertEarthquakesService.name);

  handleSyncedBatch(payload: SyncedBatchPayload): number {
    const alerts = payload.earthquakes.filter(
      (e) => e.magnitude >= ALERT_THRESHOLD,
    );

    for (const eq of alerts) {
      this.logger.warn(
        `ALERT: M${eq.magnitude.toFixed(1)} at ${eq.place} (${eq.time}) — ${eq.url ?? 'no url'}`,
      );
    }

    return alerts.length;
  }
}
