import { Module } from '@nestjs/common';
import { ListEarthquakesController } from './list-earthquakes.controller';
import { ListEarthquakesService } from './list-earthquakes.service';

@Module({
  controllers: [ListEarthquakesController],
  providers: [ListEarthquakesService],
})
export class ListEarthquakesModule {}
