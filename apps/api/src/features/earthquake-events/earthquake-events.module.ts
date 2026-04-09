import { Module } from '@nestjs/common';
import { EarthquakeEventsController } from './earthquake-events.controller';

@Module({
  controllers: [EarthquakeEventsController],
})
export class EarthquakeEventsModule {}
