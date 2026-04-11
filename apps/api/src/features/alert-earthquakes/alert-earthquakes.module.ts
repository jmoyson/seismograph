import { Module } from '@nestjs/common';
import { AlertEarthquakesService } from './alert-earthquakes.service';
import { AlertEarthquakesListener } from './alert-earthquakes.listener';

@Module({
  providers: [AlertEarthquakesService, AlertEarthquakesListener],
})
export class AlertEarthquakesModule {}
