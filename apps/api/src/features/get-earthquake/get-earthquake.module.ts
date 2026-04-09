import { Module } from '@nestjs/common';
import { GetEarthquakeController } from './get-earthquake.controller';

@Module({
  controllers: [GetEarthquakeController],
})
export class GetEarthquakeModule {}
