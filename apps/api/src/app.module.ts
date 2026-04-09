import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './shared/database/database.module';
import { QueueModule } from './shared/queue/queue.module';
import { EventsModule } from './shared/events/events.module';
import { SyncEarthquakesModule } from './features/sync-earthquakes/sync-earthquakes.module';
import { ListEarthquakesModule } from './features/list-earthquakes/list-earthquakes.module';
import { GetEarthquakeModule } from './features/get-earthquake/get-earthquake.module';
import { EarthquakeEventsModule } from './features/earthquake-events/earthquake-events.module';
import { GetStatisticsModule } from './features/get-statistics/get-statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    QueueModule,
    EventsModule,
    SyncEarthquakesModule,
    ListEarthquakesModule,
    GetEarthquakeModule,
    EarthquakeEventsModule,
    GetStatisticsModule,
  ],
})
export class AppModule {}
