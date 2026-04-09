import { Module } from '@nestjs/common';
import { GetStatisticsController } from './get-statistics.controller';
import { GetStatisticsService } from './get-statistics.service';

@Module({
  controllers: [GetStatisticsController],
  providers: [GetStatisticsService],
})
export class GetStatisticsModule {}
